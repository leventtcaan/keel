package app.keel.engine;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.IntStream;

/**
 * Program review (K-955, ADR-073 #2): reads a weekly program the user brought and returns at most review_max_suggestions
 * suggestions, each with the concrete change ("diff") that fixes it. In priority order: more training days than
 * training_days_max (G6 K-36), a muscle over weekly_sets_max (G1 K-11), a muscle under weekly_sets_min or, for the catalog's
 * arm muscles, arm_weekly_sets_min (G1 K-11, K-61), a muscle trained on a single day (G1 K-22), a rep range outside K-21.
 * Sets count for a move's primary muscle, as in the program templates (K-211). A finding the review can't turn into a
 * change isn't shown (ADR-073). Only muscles the program trains are reviewed: a muscle it never names is the user's choice.
 *
 * <p>Every session a diff leaves inside sets_per_session_per_muscle_min/max (G1 K-10) stays inside it or goes. A day with no
 * moves is a rest day: it doesn't count as a training day and no diff touches it. Days and positions in a change are the
 * input program's, counted from 0. Pure: the program and what the review needs from the catalog come in.
 */
public final class ProgramReview {

    static final RuleId DAYS_MAX = new RuleId("program_days_max");
    static final RuleId WEEKLY_SETS_MAX = new RuleId("program_weekly_sets_max");
    static final RuleId WEEKLY_SETS_MIN = new RuleId("program_weekly_sets_min");
    static final RuleId ARM_WEEKLY_SETS_MIN = new RuleId("program_arm_weekly_sets_min");
    static final RuleId FREQUENCY = new RuleId("program_frequency");
    static final RuleId REP_RANGE = new RuleId("program_rep_range");

    static final Source DAYS_SOURCE = new Source("arastirma/ham/guray/G6-eski-arsiv.md#K-36", SourceTag.EXPERIENCE);
    static final Source VOLUME_SOURCE = new Source("arastirma/ham/guray/G1-antrenman.md#K-11", SourceTag.EXPERIENCE);
    static final Source ARM_SOURCE = new Source("arastirma/ham/guray/G1-antrenman.md#K-61", SourceTag.EXPERIENCE);
    static final Source FREQUENCY_SOURCE = new Source("arastirma/ham/guray/G1-antrenman.md#K-22", SourceTag.EXPERIENCE);
    static final Source REP_RANGE_SOURCE = new Source("arastirma/ham/guray/G1-antrenman.md#K-21", SourceTag.EXPERIENCE);

    private ProgramReview() {
    }

    /**
     * One move of a day: its primary muscle (the catalog's first), sets and rep range. A move with no sets is refused: a
     * caller whose program has one (a planned slot not filled in) leaves it out.
     */
    public record Move(String exercise, String muscle, LiftKind kind, int sets, int repMin, int repMax) {
        public Move {
            Objects.requireNonNull(exercise, "exercise");
            Objects.requireNonNull(muscle, "muscle");
            Objects.requireNonNull(kind, "kind");
            if (exercise.isBlank() || muscle.isBlank() || sets < 1 || repMin < 1 || repMax < repMin) {
                throw new IllegalArgumentException("A move needs an exercise, a muscle, 1+ sets and 1 <= repMin <= repMax: " + exercise);
            }
        }

        Move withSets(int newSets) {
            return new Move(exercise, muscle, kind, newSets, repMin, repMax);
        }

        Move withReps(int min, int max) {
            return new Move(exercise, muscle, kind, sets, min, max);
        }

        boolean is(String otherExercise, String otherMuscle) {
            return exercise.equals(otherExercise) && muscle.equals(otherMuscle);
        }
    }

    /** A day: its moves in order; none makes it a rest day. */
    public record Day(List<Move> moves) {
        public Day {
            moves = List.copyOf(moves);
        }

        int sets(String muscle) {
            return moves.stream().filter(move -> move.muscle().equals(muscle)).mapToInt(Move::sets).sum();
        }

        int total() {
            return moves.stream().mapToInt(Move::sets).sum();
        }
    }

    /** The week: its days in order. */
    public record Program(List<Day> days) {
        public Program {
            days = List.copyOf(days);
        }

        int weekly(String muscle) {
            return days.stream().mapToInt(day -> day.sets(muscle)).sum();
        }

        /** The days with moves, lightest first (tie: the earlier). */
        List<Integer> trainingDaysByLoad() {
            return IntStream.range(0, days.size()).filter(d -> !days.get(d).moves().isEmpty()).boxed()
                    .sorted(Comparator.comparingInt((Integer d) -> days.get(d).total()).thenComparingInt(d -> d)).toList();
        }
    }

    /**
     * What the review needs from the exercise catalog: an isolation move per muscle to top a muscle up with, and the muscles
     * with their own weekly minimum (arm_weekly_sets_min, G1 K-61), both from data (data/exercises, data/muscles.yaml).
     */
    public record Catalog(Map<String, String> isolationByMuscle, Set<String> armMuscles) {
        public Catalog {
            isolationByMuscle = Map.copyOf(isolationByMuscle);
            armMuscles = Set.copyOf(armMuscles);
        }
    }

    /** What a suggestion fixes, in priority order. */
    public enum Finding {
        TOO_MANY_DAYS,
        TOO_MANY_SETS,
        TOO_FEW_SETS,
        ONCE_A_WEEK,
        REP_RANGE
    }

    /** One change of a suggestion's diff, on the input program's days and positions. */
    public sealed interface Change permits RemoveDay, MoveExercise, SetSets, RemoveExercise, AddExercise, SetRepRange {
    }

    /** The day goes; its moves were moved or merged by the same diff. */
    public record RemoveDay(int day) implements Change {
    }

    /** The move goes to the end of another day, with {@code setsAfter} sets (more than {@code sets} when moves merged into it). */
    public record MoveExercise(int fromDay, int position, int toDay, String exercise, int sets, int setsAfter) implements Change {
    }

    public record SetSets(int day, int position, String exercise, int from, int to) implements Change {
    }

    public record RemoveExercise(int day, int position, String exercise) implements Change {
    }

    /** A new move at the end of the day. */
    public record AddExercise(int day, Move move) implements Change {
    }

    public record SetRepRange(int day, int position, String exercise, int fromMin, int fromMax, int toMin, int toMax)
            implements Change {
    }

    /**
     * A finding with its fix: the muscle or exercise it is about (when it is about one), the numbers its copy needs (copy
     * placeholders, e.g. {@code from} and {@code to}), its rule and source (U14), the copy key (the words are in
     * data/copy/en.json) and the diff.
     */
    public record Suggestion(Finding finding, Optional<String> muscle, Optional<String> exercise, Map<String, Integer> numbers,
            RuleId rule, Source source, CopyKey copyKey, List<Change> changes) {
        public Suggestion {
            Objects.requireNonNull(finding, "finding");
            Objects.requireNonNull(muscle, "muscle");
            Objects.requireNonNull(exercise, "exercise");
            Objects.requireNonNull(rule, "rule");
            Objects.requireNonNull(source, "source");
            Objects.requireNonNull(copyKey, "copyKey");
            numbers = Collections.unmodifiableMap(new TreeMap<>(numbers));
            changes = List.copyOf(changes);
        }
    }

    /** The suggestions to show: the first review_max_suggestions findings. */
    public static List<Suggestion> review(Program program, Catalog catalog, Parameters parameters) {
        List<Suggestion> all = findings(program, catalog, parameters);
        return List.copyOf(all.subList(0, Math.min(all.size(), parameters.wholeNumber(ParameterKey.REVIEW_MAX_SUGGESTIONS))));
    }

    /** Every finding that has a fix, in priority order; within one, week order (a muscle's first day), then muscle id. */
    public static List<Suggestion> findings(Program program, Catalog catalog, Parameters parameters) {
        Objects.requireNonNull(program, "program");
        Objects.requireNonNull(catalog, "catalog");
        Objects.requireNonNull(parameters, "parameters");
        Limits limits = new Limits(parameters);
        List<String> muscles = musclesInWeekOrder(program);
        List<Suggestion> found = new ArrayList<>();
        tooManyDays(program, limits).ifPresent(found::add);
        muscles.forEach(muscle -> tooManySets(program, muscle, limits).ifPresent(found::add));
        muscles.forEach(muscle -> tooFewSets(program, muscle, catalog, limits).ifPresent(found::add));
        muscles.forEach(muscle -> onceAWeek(program, muscle, limits).ifPresent(found::add));
        found.addAll(repRanges(program, limits));
        return List.copyOf(found);
    }

    /** The parameters every check reads. */
    private record Limits(Parameters parameters, int sessionMin, int sessionMax) {
        Limits(Parameters parameters) {
            this(parameters, parameters.wholeNumber(ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MIN),
                    parameters.wholeNumber(ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MAX));
        }

        int get(ParameterKey key) {
            return parameters.wholeNumber(key);
        }
    }

    private static List<String> musclesInWeekOrder(Program program) {
        List<String> muscles = new ArrayList<>();
        for (Day day : program.days()) {
            new TreeSet<>(day.moves().stream().map(Move::muscle).toList()).stream().filter(m -> !muscles.contains(m)).forEach(muscles::add);
        }
        return muscles;
    }

    // ── 1 · days (G6 K-36) ───────────────────────────────────────────────────────────────────────────────────────

    /** A move of the input while days are merged: where it came from, the sets it has now, where it ends. */
    private static final class Slot {
        final int day;
        final int position;
        final Move move;
        int sets;
        int at;
        boolean merged;

        Slot(int day, int position, Move move) {
            this.day = day;
            this.position = position;
            this.move = move;
            this.sets = move.sets();
            this.at = day;
        }
    }

    private record WorkDay(int index, List<Slot> slots) {
        int sets(String muscle) {
            return slots.stream().filter(s -> s.move.muscle().equals(muscle)).mapToInt(s -> s.sets).sum();
        }

        int total() {
            return slots.stream().mapToInt(s -> s.sets).sum();
        }
    }

    // The lightest training day goes (tie: the later). Each of its muscles' work goes, as a whole, to the training day that
    // trains that muscle least (tie: the lighter day, then the earlier) where the session ends inside
    // sets_per_session_per_muscle_min/max (G1 K-10); a move the day already has takes the sets instead of a second copy.
    // Never below training_days_min.
    private static Optional<Suggestion> tooManyDays(Program program, Limits limits) {
        int max = limits.get(ParameterKey.TRAINING_DAYS_MAX);
        List<WorkDay> week = new ArrayList<>();
        List<Slot> all = new ArrayList<>();
        for (int d = 0; d < program.days().size(); d++) {
            List<Move> moves = program.days().get(d).moves();
            if (moves.isEmpty()) {
                continue;
            }
            List<Slot> slots = new ArrayList<>();
            for (int i = 0; i < moves.size(); i++) {
                slots.add(new Slot(d, i, moves.get(i)));
            }
            all.addAll(slots);
            week.add(new WorkDay(d, slots));
        }
        int days = week.size();
        if (days <= max) {
            return Optional.empty();
        }
        int target = Math.max(max, limits.get(ParameterKey.TRAINING_DAYS_MIN));
        List<Integer> removed = new ArrayList<>();
        while (week.size() > target) {
            WorkDay lightest = week.getFirst();
            for (WorkDay day : week) {
                if (day.total() <= lightest.total()) {
                    lightest = day;
                }
            }
            week.remove(lightest);
            removed.add(lightest.index());
            Map<String, List<Slot>> byMuscle = new LinkedHashMap<>();
            lightest.slots().forEach(slot -> byMuscle.computeIfAbsent(slot.move.muscle(), m -> new ArrayList<>()).add(slot));
            for (Map.Entry<String, List<Slot>> group : byMuscle.entrySet()) {
                String muscle = group.getKey();
                int sets = group.getValue().stream().mapToInt(s -> s.sets).sum();
                Optional<WorkDay> to = week.stream()
                        .filter(day -> day.sets(muscle) + sets <= limits.sessionMax() && day.sets(muscle) + sets >= limits.sessionMin())
                        .min(Comparator.comparingInt((WorkDay day) -> day.sets(muscle)).thenComparingInt(WorkDay::total)
                                .thenComparingInt(WorkDay::index));
                if (to.isEmpty()) {
                    return Optional.empty();
                }
                for (Slot slot : group.getValue()) {
                    Optional<Slot> same = to.get().slots().stream().filter(s -> s.move.is(slot.move.exercise(), muscle)).findFirst();
                    if (same.isPresent()) {
                        same.get().sets += slot.sets;
                        slot.merged = true;
                    } else {
                        to.get().slots().add(slot);
                    }
                }
            }
        }
        week.forEach(day -> day.slots().forEach(slot -> slot.at = day.index()));
        List<Change> changes = new ArrayList<>();
        removed.stream().sorted().forEach(day -> changes.add(new RemoveDay(day)));
        for (Slot slot : all) {
            if (slot.merged) {
                changes.add(new RemoveExercise(slot.day, slot.position, slot.move.exercise()));
            } else if (slot.at == slot.day && slot.sets != slot.move.sets()) {
                changes.add(new SetSets(slot.day, slot.position, slot.move.exercise(), slot.move.sets(), slot.sets));
            }
        }
        for (WorkDay day : week) {
            for (Slot slot : day.slots()) {
                if (slot.day != day.index()) {
                    changes.add(new MoveExercise(slot.day, slot.position, day.index(), slot.move.exercise(), slot.move.sets(), slot.sets));
                }
            }
        }
        return Optional.of(new Suggestion(Finding.TOO_MANY_DAYS, Optional.empty(), Optional.empty(), Map.of("from", days, "to", target),
                DAYS_MAX, DAYS_SOURCE, new CopyKey("review.too_many_days"), changes));
    }

    // ── 2 · too many sets (G1 K-11) ──────────────────────────────────────────────────────────────────────────────

    private record Placed(int day, int position, Move move) {
    }

    // One set at a time from the muscle's biggest move (tie: the latest in the week) while its session stays at
    // sets_per_session_per_muscle_min or more; if that is not enough, moves go from the end of the week, each leaving its
    // session at that minimum or empty, and last, whole sessions.
    private static Optional<Suggestion> tooManySets(Program program, String muscle, Limits limits) {
        int weekly = program.weekly(muscle);
        if (weekly <= limits.get(ParameterKey.WEEKLY_SETS_MAX)) {
            return Optional.empty();
        }
        List<Placed> moves = new ArrayList<>();
        int[] session = new int[program.days().size()];
        for (int d = 0; d < program.days().size(); d++) {
            List<Move> day = program.days().get(d).moves();
            for (int i = 0; i < day.size(); i++) {
                if (day.get(i).muscle().equals(muscle)) {
                    moves.add(new Placed(d, i, day.get(i)));
                    session[d] += day.get(i).sets();
                }
            }
        }
        int[] sets = moves.stream().mapToInt(p -> p.move().sets()).toArray();
        boolean[] dropped = new boolean[sets.length];
        int excess = weekly - limits.get(ParameterKey.WEEKLY_SETS_TRIM_TO);
        while (excess > 0) {
            int pick = -1;
            for (int i = 0; i < sets.length; i++) {
                if (sets[i] > 1 && session[moves.get(i).day()] - 1 >= limits.sessionMin() && (pick < 0 || sets[i] >= sets[pick])) {
                    pick = i;
                }
            }
            if (pick < 0) {
                break;
            }
            sets[pick]--;
            session[moves.get(pick).day()]--;
            excess--;
        }
        for (int i = sets.length - 1; i >= 0 && excess > 0; i--) {
            int left = session[moves.get(i).day()] - sets[i];
            if (left == 0 || left >= limits.sessionMin()) {
                dropped[i] = true;
                session[moves.get(i).day()] = left;
                excess -= sets[i];
            }
        }
        for (int i = sets.length - 1; i >= 0 && excess > 0; i--) {
            int day = moves.get(i).day();
            for (int j = 0; j < sets.length && session[day] > 0; j++) {
                if (moves.get(j).day() == day && !dropped[j]) {
                    dropped[j] = true;
                    session[day] -= sets[j];
                    excess -= sets[j];
                }
            }
        }
        List<Change> changes = new ArrayList<>();
        int after = 0;
        for (int i = 0; i < sets.length; i++) {
            Placed placed = moves.get(i);
            if (dropped[i]) {
                changes.add(new RemoveExercise(placed.day(), placed.position(), placed.move().exercise()));
            } else {
                after += sets[i];
                if (sets[i] != placed.move().sets()) {
                    changes.add(new SetSets(placed.day(), placed.position(), placed.move().exercise(), placed.move().sets(), sets[i]));
                }
            }
        }
        if (changes.isEmpty() || excess > 0) {
            return Optional.empty();
        }
        return Optional.of(new Suggestion(Finding.TOO_MANY_SETS, Optional.of(muscle), Optional.empty(),
                Map.of("from", weekly, "to", after), WEEKLY_SETS_MAX, VOLUME_SOURCE, new CopyKey("review.too_many_sets"), changes));
    }

    // ── 3 · too few sets (G1 K-11, K-61) ─────────────────────────────────────────────────────────────────────────

    // The caller's isolation move for the muscle, placed so that no session ends outside sets_per_session_per_muscle_min/max
    // (G1 K-10): all of it on the lightest day that already trains the muscle, else a new session of at least the session
    // minimum on the lightest training day without it (the week may then pass the weekly minimum), else spread over the
    // days that train it and then new sessions. A day that already does that move gets more sets of it instead of a copy.
    private static Optional<Suggestion> tooFewSets(Program program, String muscle, Catalog catalog, Limits limits) {
        boolean arm = catalog.armMuscles().contains(muscle);
        int weeklyMin = limits.get(ParameterKey.WEEKLY_SETS_MIN);
        int min = arm ? Math.max(weeklyMin, limits.get(ParameterKey.ARM_WEEKLY_SETS_MIN)) : weeklyMin;
        int weekly = program.weekly(muscle);
        String isolation = catalog.isolationByMuscle().get(muscle);
        if (weekly >= min || isolation == null) {
            return Optional.empty();
        }
        List<Day> days = program.days();
        List<Integer> trains = program.trainingDaysByLoad().stream().filter(d -> days.get(d).sets(muscle) > 0).toList();
        List<Integer> without = program.trainingDaysByLoad().stream().filter(d -> days.get(d).sets(muscle) == 0).toList();
        int need = min - weekly;
        int fresh = Math.max(need, limits.sessionMin());
        Map<Integer, Integer> placed = new LinkedHashMap<>();
        Optional<Integer> one = trains.stream().filter(d -> days.get(d).sets(muscle) + need <= limits.sessionMax()).findFirst();
        Optional<Integer> other = without.stream().filter(d -> fresh <= limits.sessionMax()).findFirst();
        if (one.isPresent()) {
            placed.put(one.get(), need);
        } else if (other.isPresent()) {
            placed.put(other.get(), fresh);
        } else {
            int left = need;
            for (int d : trains) {
                int add = Math.min(left, limits.sessionMax() - days.get(d).sets(muscle));
                if (add > 0 && left > 0) {
                    placed.put(d, add);
                    left -= add;
                }
            }
            for (int d : without) {
                int add = Math.min(Math.max(left, limits.sessionMin()), limits.sessionMax());
                if (left > 0 && add >= limits.sessionMin()) {
                    placed.put(d, add);
                    left -= add;
                }
            }
            if (left > 0) {
                return Optional.empty();
            }
        }
        List<Change> changes = new ArrayList<>();
        int after = weekly;
        for (Map.Entry<Integer, Integer> place : new TreeMap<>(placed).entrySet()) {
            int d = place.getKey();
            int add = place.getValue();
            List<Move> moves = days.get(d).moves();
            int existing = IntStream.range(0, moves.size()).filter(i -> moves.get(i).is(isolation, muscle)).findFirst().orElse(-1);
            if (existing >= 0) {
                changes.add(new SetSets(d, existing, isolation, moves.get(existing).sets(), moves.get(existing).sets() + add));
            } else {
                changes.add(new AddExercise(d, new Move(isolation, muscle, LiftKind.ISOLATION, add,
                        limits.get(ParameterKey.REP_RANGE_ISOLATION_MIN), limits.get(ParameterKey.REP_RANGE_ISOLATION_MAX))));
            }
            after += add;
        }
        return Optional.of(new Suggestion(Finding.TOO_FEW_SETS, Optional.of(muscle), Optional.empty(),
                Map.of("from", weekly, "to", after, "min", min), arm ? ARM_WEEKLY_SETS_MIN : WEEKLY_SETS_MIN, arm ? ARM_SOURCE : VOLUME_SOURCE,
                new CopyKey(arm ? "review.too_few_arm_sets" : "review.too_few_sets"), changes));
    }

    // ── 4 · once a week (G1 K-22) ────────────────────────────────────────────────────────────────────────────────

    // A muscle trained on one day while frequency_per_muscle_per_week asks for more. Half of its biggest move (tie: the later)
    // goes, as a copy, to the lightest other training day (tie: the earlier), both sessions keeping
    // sets_per_session_per_muscle_min (G1 K-10); if halving can't, a whole move of the muscle (the last that can) goes
    // there instead. This adds one day: the parameter's 2 (G1 K-22) is met; a larger value would be met only in part.
    private static Optional<Suggestion> onceAWeek(Program program, String muscle, Limits limits) {
        List<Day> days = program.days();
        List<Integer> training = IntStream.range(0, days.size()).filter(d -> days.get(d).sets(muscle) > 0).boxed().toList();
        int weekly = program.weekly(muscle);
        int frequency = limits.get(ParameterKey.FREQUENCY_PER_MUSCLE_PER_WEEK);
        if (training.size() != 1 || training.size() >= frequency || weekly < limits.get(ParameterKey.WEEKLY_SETS_MIN)) {
            return Optional.empty();
        }
        int from = training.getFirst();
        Optional<Integer> to = program.trainingDaysByLoad().stream().filter(d -> d != from).findFirst();
        if (to.isEmpty()) {
            return Optional.empty();
        }
        List<Move> moves = days.get(from).moves();
        int biggest = -1;
        for (int i = 0; i < moves.size(); i++) {
            if (moves.get(i).muscle().equals(muscle) && (biggest < 0 || moves.get(i).sets() >= moves.get(biggest).sets())) {
                biggest = i;
            }
        }
        Move move = moves.get(biggest);
        int half = move.sets() / 2;
        List<Change> changes = new ArrayList<>();
        if (half >= limits.sessionMin() && half <= limits.sessionMax() && weekly - half >= limits.sessionMin()) {
            changes.add(new SetSets(from, biggest, move.exercise(), move.sets(), move.sets() - half));
            changes.add(new AddExercise(to.get(), move.withSets(half)));
        } else {
            for (int i = moves.size() - 1; i >= 0 && changes.isEmpty(); i--) {
                Move whole = moves.get(i);
                if (whole.muscle().equals(muscle) && whole.sets() >= limits.sessionMin() && whole.sets() <= limits.sessionMax()
                        && weekly - whole.sets() >= limits.sessionMin()) {
                    changes.add(new MoveExercise(from, i, to.get(), whole.exercise(), whole.sets(), whole.sets()));
                }
            }
        }
        if (changes.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new Suggestion(Finding.ONCE_A_WEEK, Optional.of(muscle), Optional.empty(), Map.of("from", 1, "to", frequency),
                FREQUENCY, FREQUENCY_SOURCE, new CopyKey("review.once_a_week"), changes));
    }

    // ── 5 · rep range (G1 K-21) ──────────────────────────────────────────────────────────────────────────────────

    // One suggestion per exercise, with a change for each day it is outside its kind's range; the numbers are its first.
    private static List<Suggestion> repRanges(Program program, Limits limits) {
        Map<String, List<SetRepRange>> byExercise = new LinkedHashMap<>();
        Map<String, LiftKind> kinds = new LinkedHashMap<>();
        for (int d = 0; d < program.days().size(); d++) {
            List<Move> moves = program.days().get(d).moves();
            for (int i = 0; i < moves.size(); i++) {
                Move move = moves.get(i);
                boolean compound = move.kind() == LiftKind.COMPOUND;
                int min = limits.get(compound ? ParameterKey.REP_RANGE_COMPOUND_MIN : ParameterKey.REP_RANGE_ISOLATION_MIN);
                int max = limits.get(compound ? ParameterKey.REP_RANGE_COMPOUND_MAX : ParameterKey.REP_RANGE_ISOLATION_MAX);
                if (move.repMin() < min || move.repMax() > max) {
                    byExercise.computeIfAbsent(move.exercise(), e -> new ArrayList<>())
                            .add(new SetRepRange(d, i, move.exercise(), move.repMin(), move.repMax(), min, max));
                    kinds.putIfAbsent(move.exercise(), move.kind());
                }
            }
        }
        List<Suggestion> found = new ArrayList<>();
        byExercise.forEach((exercise, ranges) -> {
            SetRepRange first = ranges.getFirst();
            boolean compound = kinds.get(exercise) == LiftKind.COMPOUND;
            found.add(new Suggestion(Finding.REP_RANGE, Optional.empty(), Optional.of(exercise),
                    Map.of("fromMin", first.fromMin(), "fromMax", first.fromMax(), "toMin", first.toMin(), "toMax", first.toMax()),
                    REP_RANGE, REP_RANGE_SOURCE, new CopyKey(compound ? "review.rep_range_compound" : "review.rep_range_isolation"),
                    List.copyOf(ranges)));
        });
        return found;
    }

    // ── apply ────────────────────────────────────────────────────────────────────────────────────────────────────

    /**
     * The program with the suggestion's diff applied: changed and removed moves in place, moved and added moves at the end of
     * their day in the diff's order, removed days gone. A diff that doesn't match the program (another program, or one
     * already changed) is refused.
     */
    public static Program apply(Program program, Suggestion suggestion) {
        int n = program.days().size();
        List<List<Move>> slots = new ArrayList<>();
        List<List<Move>> added = new ArrayList<>();
        for (Day day : program.days()) {
            slots.add(new ArrayList<>(day.moves()));
            added.add(new ArrayList<>());
        }
        boolean[] removed = new boolean[n];
        for (Change change : suggestion.changes()) {
            switch (change) {
                case RemoveDay(int day) -> removed[day(n, day)] = true;
                case MoveExercise(int fromDay, int position, int toDay, String exercise, int sets, int setsAfter) -> {
                    Move move = take(slots, fromDay, position, exercise);
                    require(move.sets() == sets, change);
                    slots.get(fromDay).set(position, null);
                    added.get(day(n, toDay)).add(move.withSets(setsAfter));
                }
                case SetSets(int day, int position, String exercise, int from, int to) -> {
                    Move move = take(slots, day, position, exercise);
                    require(move.sets() == from, change);
                    slots.get(day).set(position, move.withSets(to));
                }
                case RemoveExercise(int day, int position, String exercise) -> {
                    take(slots, day, position, exercise);
                    slots.get(day).set(position, null);
                }
                case AddExercise(int day, Move move) -> added.get(day(n, day)).add(move);
                case SetRepRange(int day, int position, String exercise, int fromMin, int fromMax, int toMin, int toMax) -> {
                    Move move = take(slots, day, position, exercise);
                    require(move.repMin() == fromMin && move.repMax() == fromMax, change);
                    slots.get(day).set(position, move.withReps(toMin, toMax));
                }
            }
        }
        List<Day> days = new ArrayList<>();
        for (int d = 0; d < n; d++) {
            List<Move> moves = new ArrayList<>(slots.get(d).stream().filter(Objects::nonNull).toList());
            moves.addAll(added.get(d));
            if (removed[d]) {
                require(moves.isEmpty(), "day " + d + " is removed but keeps moves");
            } else {
                days.add(new Day(moves));
            }
        }
        return new Program(days);
    }

    private static int day(int days, int day) {
        require(day >= 0 && day < days, "no day " + day);
        return day;
    }

    private static Move take(List<List<Move>> slots, int day, int position, String exercise) {
        require(day >= 0 && day < slots.size() && position >= 0 && position < slots.get(day).size(), "no move at " + day + "/" + position);
        Move move = slots.get(day).get(position);
        require(move != null && move.exercise().equals(exercise), "day " + day + "/" + position + " is not " + exercise);
        return move;
    }

    private static void require(boolean ok, Object what) {
        if (!ok) {
            throw new IllegalArgumentException("The diff doesn't match the program: " + what);
        }
    }
}
