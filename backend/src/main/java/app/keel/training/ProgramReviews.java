package app.keel.training;

import app.keel.engine.LiftKind;
import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.ProgramReview;
import app.keel.engine.SourceTag;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The program review on the stored program (K-956, ADR-073 #2-#4): the engine's ProgramReview reads it, the user picks
 * suggestions, each pick is applied as its own change and kept in the change log (ReviewChangeStore) with the program
 * before and after it, and any change can be undone. A change touches only what its diff says: every other move keeps its
 * row and next target, the program keeps its source (an edited GENERATED program does not become OWN) and its days.
 */
@Service
class ProgramReviews {

    /** Contract Source: the kind of source, never the engine's research path (K-523). */
    record SourceView(SourceTag tag) {
    }

    /** Contract Reason: the coaching rule a suggestion rests on. */
    record Reason(String rule, SourceView source) {
    }

    /** Contract ReviewSuggestion; {@code muscle} or {@code exerciseId} when the finding is about one. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Suggestion(String id, ProgramReview.Finding finding, String muscle, String exerciseId, Map<String, Integer> numbers, String copyKey,
            Reason reason) {
    }

    /** Contract AppliedReviewChange. */
    record Applied(UUID id, Instant appliedAt, Suggestion suggestion) {
    }

    /** Contract ProgramEditChange: the user's edit in force (K-995). */
    record Edited(UUID id, Instant editedAt) {
    }

    /** Contract ProgramReview: the review's changes in force ({@code applied}) and the user's edits (K-995). */
    record Review(String id, int notReviewedMoves, List<Suggestion> suggestions, List<Applied> applied, List<Edited> edits) {
    }

    /** An undo: the program after it, and the later changes undone with the one asked for (they no longer apply). */
    record Undone(ProgramStore.Program program, List<UUID> alsoUndone) {
    }

    /** A change of the log: a suggestion of the review applied, or the user's edit (K-995). */
    enum Kind { REVIEW, EDIT }

    /** One change applied: the suggestion as applied (none for an edit), the program before and after it. */
    record Step(Suggestion suggestion, ProgramStore.Program before, ProgramStore.Program after) {

        static Step edit(ProgramStore.Program before, ProgramStore.Program after) {
            return new Step(null, before, after);
        }

        Kind kind() {
            return suggestion == null ? Kind.EDIT : Kind.REVIEW;
        }
    }

    /** A program and the changes that made it, in order; {@code skipped}: the picks (their index) not applied. */
    record Outcome(ProgramStore.Program program, List<Step> steps, List<Integer> skipped) {
    }

    /** The engine's reading of a stored program: its days, where each engine position is stored, the isolation moves. */
    private record Engine(ProgramReview.Program program, List<List<Integer>> positions, ProgramReview.Catalog catalog) {
    }

    private final ProgramStore programs;
    private final ReviewChangeStore changes;
    private final SessionChangeStore sessions;
    private final WorkoutStore workouts;
    private final ExerciseCatalog catalog;
    private final Clock clock;

    ProgramReviews(ProgramStore programs, ReviewChangeStore changes, SessionChangeStore sessions, WorkoutStore workouts, ExerciseCatalog catalog,
            Clock clock) {
        this.workouts = workouts;
        this.sessions = sessions;
        this.programs = programs;
        this.changes = changes;
        this.catalog = catalog;
        this.clock = clock;
    }

    /** The program reviewed now, with the changes in force. */
    Review review(AccountId account, ProgramStore.Program program, Parameters parameters) {
        return new Review(reviewId(program), notReviewed(program, catalog), suggestions(program, catalog, parameters), changes.applied(account),
                changes.edits(account));
    }

    /**
     * The picks of the review {@code reviewId} names, in its order. CONFLICT when the program is no longer the one reviewed
     * or a pick is not among its suggestions now: nothing is changed.
     */
    @Transactional
    ProgramStore.Program apply(AccountId account, String reviewId, List<String> picks, Parameters parameters, LocalDate today, ZoneId zone) {
        ProgramStore.Program current = programs.locked(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        List<String> shown = suggestions(current, catalog, parameters).stream().map(Suggestion::id).toList();
        if (!reviewId(current).equals(reviewId) || !shown.containsAll(picks)) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        Outcome outcome = apply(current, shown.stream().filter(picks::contains).toList(), catalog, parameters);
        requireStartedDaysStay(account, current, outcome.program(), today, zone);
        return keep(account, current, outcome, TodayChanges.monday(today));
    }

    /**
     * Undoes a change in force (a suggestion or an edit) and applies the ones after it again, a later one that no longer
     * applies undone with it and named; without a change, undoes every suggestion in force (K-995: "N changes applied ·
     * Undo"), from the first: an edit before it stays, an edit after it applies again or is undone with them and named. A
     * change undone before, or none to undo, changes nothing. CONFLICT when the program changed another way since its last
     * change.
     */
    @Transactional
    Undone undo(AccountId account, Optional<UUID> change, Parameters parameters, LocalDate today, ZoneId zone) {
        ProgramStore.Program current = programs.locked(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        List<ReviewChangeStore.Row> log = changes.all(account);
        if (change.isPresent() && log.stream().noneMatch(row -> row.id().equals(change.get()))) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        List<ReviewChangeStore.Row> inForce = log.stream().filter(row -> row.undoneAt() == null).toList();
        List<Step> steps = inForce.stream().map(ReviewChangeStore.Row::step).toList();
        List<UUID> ids = inForce.stream().map(ReviewChangeStore.Row::id).toList();
        OptionalInt index = change.map(id -> OptionalInt.of(ids.indexOf(id))).orElse(OptionalInt.empty());
        int from = index.isPresent() ? index.getAsInt() : firstSuggestion(steps);
        if (from < 0) {
            return new Undone(current, List.of());
        }
        if (!reviewId(inForce.getLast().step().after()).equals(reviewId(current))) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        Outcome outcome = undo(steps, index, current, catalog, parameters);
        requireStartedDaysStay(account, current, outcome.program(), today, zone);
        changes.undo(account, ids.subList(from, ids.size()), clock.instant());
        List<UUID> later = new ArrayList<>();
        for (int i = from + 1; i < ids.size(); i++) {
            if (index.isPresent() || steps.get(i).kind() == Kind.EDIT) {
                later.add(ids.get(i));
            }
        }
        List<UUID> alsoUndone = outcome.skipped().stream().map(later::get).toList();
        return new Undone(keep(account, current, outcome, TodayChanges.monday(today)), alsoUndone);
    }

    /** The first suggestion of the changes in force; -1 when there is none. */
    private static int firstSuggestion(List<Step> steps) {
        for (int i = 0; i < steps.size(); i++) {
            if (steps.get(i).kind() == Kind.REVIEW) {
                return i;
            }
        }
        return -1;
    }

    /**
     * The program edited (K-995, ADR-073 Ek 7), under the program's lock: stored in place of the program (its source, id and
     * the rows the edit keeps stay) and logged as a change an undo puts back. CONFLICT for an id the program does not have;
     * an edit that changes nothing is neither stored nor logged.
     */
    @Transactional
    ProgramStore.Program edit(AccountId account, List<ProgramEdits.Day> edit, int targetRir, LocalDate today, ZoneId zone) {
        ProgramStore.Program current = programs.locked(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        List<ProgramStore.Day> days = ProgramEdits.edited(current, edit, targetRir).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        if (days.equals(current.days())) {
            return current;
        }
        requireStartedDaysStay(account, current, new ProgramStore.Program(current.id(), current.source(), days), today, zone);
        ProgramStore.Program stored = programs.rewrite(account, days);
        changes.add(account, List.of(Step.edit(current, stored)), clock.instant());
        relay(account, current, stored, TodayChanges.monday(today));
        return stored;
    }

    /**
     * CONFLICT when the change puts a day whose workout was started today (on the user's calendar) on another weekday, or
     * takes it out (Ek 7, the same for an edit, an apply and an undo; as a move or a skip: a session done is done).
     */
    private void requireStartedDaysStay(AccountId account, ProgramStore.Program before, ProgramStore.Program after, LocalDate today, ZoneId zone) {
        if (ProgramEdits.startedAndReLaid(ProgramEdits.relaid(before, after),
                workouts.between(account, today.atStartOfDay(zone).toInstant(), today.plusDays(1).atStartOfDay(zone).toInstant()))) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
    }

    private ProgramStore.Program keep(AccountId account, ProgramStore.Program current, Outcome outcome, LocalDate monday) {
        ProgramStore.Program stored = programs.rewrite(account, outcome.program().days());
        changes.add(account, outcome.steps(), clock.instant());
        relay(account, current, stored, monday);
        return stored;
    }

    /**
     * This week's sessions re-laid as the program now has them (TodayChanges#relay, K-995): a day on another weekday, or
     * gone, loses this week's change, and what its move pushed goes back; today's swaps keep to the plan.
     */
    private void relay(AccountId account, ProgramStore.Program before, ProgramStore.Program stored, LocalDate monday) {
        Map<UUID, List<String>> planned = new HashMap<>();
        stored.days().forEach(day -> planned.put(day.id(), day.exercises().stream().map(ProgramStore.PlannedExercise::exerciseId).toList()));
        TodayChanges.Relay relay = TodayChanges.relay(sessions.week(account, monday), sessions.undos(account, monday), ProgramEdits.relaid(before, stored),
                planned);
        sessions.clear(account, monday, relay.clear());
        relay.put().forEach((day, row) -> sessions.put(account, day, monday, row));
    }

    // ── the review, pure ─────────────────────────────────────────────────────────────────────────────────────────

    /**
     * The review's id: the program as the review reads it (each day's moves in order, with their sets and rep ranges),
     * not its names, weekdays, rows or targets. The same program always gives the same id.
     */
    static String reviewId(ProgramStore.Program program) {
        StringBuilder text = new StringBuilder();
        for (ProgramStore.Day day : program.days()) {
            text.append('[');
            day.exercises().forEach(move -> text.append(move.exerciseId()).append(' ').append(move.sets()).append(' ').append(move.repMin())
                    .append('-').append(move.repMax()).append(';'));
            text.append(']');
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException missing) {
            throw new IllegalStateException("Every Java platform has SHA-256", missing);
        }
    }

    /**
     * The suggestions to show (review_max_suggestions at most), over the moves of the catalog: the user's own moves are not
     * reviewed (ProgramReviews#notReviewed).
     */
    static List<Suggestion> suggestions(ProgramStore.Program program, ExerciseCatalog catalog, Parameters parameters) {
        Engine engine = engine(program, catalog);
        return ProgramReview.review(engine.program(), engine.catalog(), parameters).stream().map(ProgramReviews::view).toList();
    }

    /**
     * The user's own moves in the program (not in the catalog): no muscle is known for them, so they count for none, and no
     * change touches them. A muscle trained only by one may be found under its minimum: a known limit, the user leaves
     * that suggestion off.
     */
    static int notReviewed(ProgramStore.Program program, ExerciseCatalog catalog) {
        return (int) program.days().stream().flatMap(day -> day.exercises().stream()).filter(move -> catalog.find(move.exerciseId()).isEmpty()).count();
    }

    /**
     * The picks applied one at a time in the order given, each found again in the review of the program the ones before
     * left (by id); a pick not found there (the earlier ones fixed it, or what it fixed is gone) is skipped and named.
     */
    static Outcome apply(ProgramStore.Program program, List<String> picks, ExerciseCatalog catalog, Parameters parameters) {
        int targetRir = parameters.wholeNumber(ParameterKey.TARGET_RIR_MAX);
        List<Function<ProgramStore.Program, Optional<Step>>> changes = new ArrayList<>();
        picks.forEach(pick -> changes.add(work -> pick(work, pick, catalog, parameters, targetRir)));
        return replay(program, changes);
    }

    /**
     * The later changes applied again, in order, to the program an undo puts back (K-995): a suggestion found again by its
     * id; an edit as it was, only onto the program it was made to (ProgramReviews#sameProgram) — an edit is the program the
     * user made, not a difference to make on another one. One that no longer applies is skipped and named.
     */
    static Outcome replay(ProgramStore.Program program, List<Step> later, ExerciseCatalog catalog, Parameters parameters) {
        int targetRir = parameters.wholeNumber(ParameterKey.TARGET_RIR_MAX);
        List<Function<ProgramStore.Program, Optional<Step>>> changes = new ArrayList<>();
        for (Step step : later) {
            changes.add(step.kind() == Kind.EDIT
                    ? work -> sameProgram(work, step.before()) ? Optional.of(Step.edit(work, step.after())) : Optional.empty()
                    : work -> pick(work, step.suggestion().id(), catalog, parameters, targetRir));
        }
        return replay(program, changes);
    }

    private static Outcome replay(ProgramStore.Program program, List<Function<ProgramStore.Program, Optional<Step>>> changes) {
        List<Step> steps = new ArrayList<>();
        List<Integer> skipped = new ArrayList<>();
        ProgramStore.Program work = program;
        for (int i = 0; i < changes.size(); i++) {
            Optional<Step> step = changes.get(i).apply(work);
            if (step.isPresent()) {
                steps.add(step.get());
                work = step.get().after();
            } else {
                skipped.add(i);
            }
        }
        return new Outcome(work, List.copyOf(steps), List.copyOf(skipped));
    }

    /** The pick found in the review of {@code work} and applied; empty when the review does not hold it. */
    private static Optional<Step> pick(ProgramStore.Program work, String pick, ExerciseCatalog catalog, Parameters parameters, int targetRir) {
        Engine engine = engine(work, catalog);
        return ProgramReview.findings(engine.program(), engine.catalog(), parameters).stream().filter(suggestion -> id(suggestion).equals(pick))
                .findFirst().map(found -> new Step(view(found), work, applyOne(work, engine, found, catalog, targetRir)));
    }

    /** The same program as the user sees it: its days (id, name, weekday) and their moves, sets and rep ranges, in order. */
    static boolean sameProgram(ProgramStore.Program one, ProgramStore.Program other) {
        record Shape(String exerciseId, int sets, int repMin, int repMax) {
        }
        record DayShape(UUID id, String nameKey, String name, DayOfWeek weekday, List<Shape> moves) {
        }
        Function<ProgramStore.Program, List<DayShape>> shape = program -> program.days().stream()
                .map(day -> new DayShape(day.id(), day.nameKey(), day.name(), day.weekday(), day.exercises().stream()
                        .map(move -> new Shape(move.exerciseId(), move.sets(), move.repMin(), move.repMax())).toList()))
                .toList();
        return shape.apply(one).equals(shape.apply(other));
    }

    /**
     * Undoes the change at {@code index} of the changes in force: the program before it with the later changes applied
     * again, a later one that no longer applies skipped (its index among the later ones applied again); without an index,
     * every suggestion: the program before the first, with the edits after it applied again (K-995). Every move keeps the row and target {@code current} has for it (ProgramReviews#carry).
     */
    static Outcome undo(List<Step> inForce, OptionalInt index, ProgramStore.Program current, ExerciseCatalog catalog, Parameters parameters) {
        int from = index.isPresent() ? index.getAsInt() : firstSuggestion(inForce);
        if (from < 0) {
            return new Outcome(current, List.of(), List.of());
        }
        // Every suggestion undone (no index): the edits after the first apply again, the suggestions do not (K-995).
        List<Step> later = inForce.subList(from + 1, inForce.size()).stream().filter(step -> index.isPresent() || step.kind() == Kind.EDIT).toList();
        Outcome again = replay(inForce.get(from).before(), later, catalog, parameters);
        return new Outcome(carry(again.program(), current), again.steps(), again.skipped());
    }

    /**
     * The program with the rows and targets of {@code current}: a move keeps its row's latest target (a session may have
     * set one since) while its rep range is the row's; a move without a row in {@code current} takes the row of the same move
     * on the same day no other move took (a move a change added again). Otherwise the move stays as it is.
     */
    static ProgramStore.Program carry(ProgramStore.Program program, ProgramStore.Program current) {
        Map<UUID, ProgramStore.PlannedExercise> rows = new HashMap<>();
        current.days().forEach(day -> day.exercises().forEach(move -> rows.put(move.id(), move)));
        Set<UUID> taken = new HashSet<>();
        program.days().forEach(day -> day.exercises().stream().map(ProgramStore.PlannedExercise::id).filter(rows::containsKey).forEach(taken::add));
        List<ProgramStore.Day> days = program.days().stream().map(day -> {
            List<ProgramStore.PlannedExercise> sameDay = current.days().stream().filter(other -> other.id().equals(day.id())).findFirst()
                    .map(ProgramStore.Day::exercises).orElse(List.of());
            return new ProgramStore.Day(day.id(), day.nameKey(), day.name(), day.weekday(), day.exercises().stream().map(move -> {
                ProgramStore.PlannedExercise row = rows.get(move.id());
                if (row == null) {
                    row = sameDay.stream().filter(other -> other.exerciseId().equals(move.exerciseId()) && taken.add(other.id())).findFirst()
                            .orElse(null);
                }
                return row != null && row.repMin() == move.repMin() && row.repMax() == move.repMax() ? move.inRowOf(row) : move;
            }).toList());
        }).toList();
        return new ProgramStore.Program(program.id(), program.source(), days);
    }

    static String id(ProgramReview.Suggestion suggestion) {
        return suggestion.finding().name() + suggestion.muscle().or(suggestion::exercise).map(about -> ":" + about).orElse("");
    }

    private static Suggestion view(ProgramReview.Suggestion suggestion) {
        return new Suggestion(id(suggestion), suggestion.finding(), suggestion.muscle().orElse(null), suggestion.exercise().orElse(null),
                suggestion.numbers(), suggestion.copyKey().value(), new Reason(suggestion.rule().value(), new SourceView(suggestion.source().tag())));
    }

    /**
     * The program as the engine reads it: each catalog move with its primary muscle and kind (sets count for the primary
     * muscle, K-211), the user's own moves left out; {@code positions} maps each day's engine positions to the stored ones. A
     * muscle is topped up with the user's isolation move for it (the first in the week), else the catalog's first by id.
     */
    private static Engine engine(ProgramStore.Program program, ExerciseCatalog catalog) {
        Map<String, String> own = new LinkedHashMap<>();
        List<ProgramReview.Day> days = new ArrayList<>();
        List<List<Integer>> positions = new ArrayList<>();
        for (ProgramStore.Day day : program.days()) {
            List<ProgramReview.Move> moves = new ArrayList<>();
            List<Integer> at = new ArrayList<>();
            for (int i = 0; i < day.exercises().size(); i++) {
                ProgramStore.PlannedExercise planned = day.exercises().get(i);
                Optional<ExerciseCatalog.Exercise> exercise = catalog.find(planned.exerciseId());
                if (exercise.isPresent()) {
                    String muscle = exercise.get().muscles().getFirst();
                    LiftKind kind = LiftKind.valueOf(exercise.get().kind().name());
                    if (kind == LiftKind.ISOLATION) {
                        own.putIfAbsent(muscle, planned.exerciseId());
                    }
                    moves.add(new ProgramReview.Move(planned.exerciseId(), muscle, kind, planned.sets(), planned.repMin(), planned.repMax()));
                    at.add(i);
                }
            }
            days.add(new ProgramReview.Day(moves));
            positions.add(List.copyOf(at));
        }
        Map<String, String> isolation = new HashMap<>();
        catalog.all().stream().filter(exercise -> exercise.kind() == ExerciseCatalog.Kind.ISOLATION)
                .sorted(Comparator.comparing(ExerciseCatalog.Exercise::id))
                .forEach(exercise -> isolation.putIfAbsent(exercise.muscles().getFirst(), exercise.id()));
        isolation.putAll(own);
        return new Engine(new ProgramReview.Program(days), List.copyOf(positions), new ProgramReview.Catalog(isolation, catalog.armMuscles()));
    }

    /**
     * The suggestion's diff on the stored program, as ProgramReview.apply makes it — changed and removed moves in place,
     * moved and added ones at the end of their day in the diff's order — keeping each move's row: a move moved or with other
     * sets keeps its target, one with another rep range loses it, an added one is a new row. The user's own moves stay as
     * they are; a day left with no move at all goes (a removed day's moves were all moved, unless the user's own stay on it).
     */
    private static ProgramStore.Program applyOne(ProgramStore.Program program, Engine engine, ProgramReview.Suggestion suggestion,
            ExerciseCatalog catalog, int targetRir) {
        ProgramReview.Program expected = ProgramReview.apply(engine.program(), suggestion);
        List<List<ProgramStore.PlannedExercise>> kept = new ArrayList<>();
        List<List<ProgramStore.PlannedExercise>> added = new ArrayList<>();
        program.days().forEach(day -> {
            kept.add(new ArrayList<>(day.exercises()));
            added.add(new ArrayList<>());
        });
        for (ProgramReview.Change change : suggestion.changes()) {
            switch (change) {
                case ProgramReview.RemoveDay(int day) -> {
                }
                case ProgramReview.MoveExercise(int fromDay, int position, int toDay, String exercise, int sets, int setsAfter) -> {
                    int at = engine.positions().get(fromDay).get(position);
                    added.get(toDay).add(kept.get(fromDay).get(at).withSets(setsAfter));
                    kept.get(fromDay).set(at, null);
                }
                case ProgramReview.SetSets(int day, int position, String exercise, int from, int to) -> {
                    int at = engine.positions().get(day).get(position);
                    kept.get(day).set(at, kept.get(day).get(at).withSets(to));
                }
                case ProgramReview.RemoveExercise(int day, int position, String exercise) -> kept.get(day).set(engine.positions().get(day).get(position), null);
                case ProgramReview.AddExercise(int day, ProgramReview.Move move) -> added.get(day).add(new ProgramStore.PlannedExercise(move.exercise(),
                        move.sets(), move.repMin(), move.repMax(), targetRir, null, null, null, UUID.randomUUID(), null, false));
                case ProgramReview.SetRepRange(int day, int position, String exercise, int fromMin, int fromMax, int toMin, int toMax) -> {
                    int at = engine.positions().get(day).get(position);
                    kept.get(day).set(at, kept.get(day).get(at).withReps(toMin, toMax));
                }
            }
        }
        List<ProgramStore.Day> days = new ArrayList<>();
        for (int d = 0; d < program.days().size(); d++) {
            ProgramStore.Day day = program.days().get(d);
            List<ProgramStore.PlannedExercise> moves = new ArrayList<>(kept.get(d).stream().filter(Objects::nonNull).toList());
            moves.addAll(added.get(d));
            if (!moves.isEmpty()) {
                days.add(new ProgramStore.Day(day.id(), day.nameKey(), day.name(), day.weekday(), List.copyOf(moves)));
            }
        }
        ProgramStore.Program after = new ProgramStore.Program(program.id(), program.source(), List.copyOf(days));
        if (!trainingDays(engine(after, catalog).program()).equals(trainingDays(expected))) {
            throw new IllegalStateException("The stored program does not match the engine's diff for " + id(suggestion));
        }
        return after;
    }

    /** The days with a catalog move: a day of the user's own moves only, or none, is not a training day to the engine. */
    private static List<ProgramReview.Day> trainingDays(ProgramReview.Program program) {
        return program.days().stream().filter(day -> !day.moves().isEmpty()).toList();
    }
}
