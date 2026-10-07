package app.keel.engine;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
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
 * training_days_max (G6 K-36), a muscle over weekly_sets_max (G1 K-11), a muscle under weekly_sets_min or, for the arms,
 * arm_weekly_sets_min (G1 K-11, K-61), a muscle trained on a single day (G1 K-22), a rep range outside K-21. Sets count for a
 * move's primary muscle, as in the program templates (K-211). A finding the review can't turn into a change isn't shown
 * (ADR-073). Only muscles the program trains are reviewed: a muscle it never names is the user's choice, not a finding.
 *
 * <p>Days and positions in a change are the input program's, counted from 0. Pure: the program and the caller's isolation
 * move per muscle (from the catalog) come in.
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

    // G1 K-61 gives biceps and triceps their own weekly minimum (arm_weekly_sets_min). These are muscle ids of the catalog
    // (data/muscles.yaml; ProgramReviewTests checks they exist), not thresholds; the parameter files hold numbers and flags
    // only, so the two ids stay here.
    static final Set<String> ARM_MUSCLES = Set.of("biceps", "triceps");

    private ProgramReview() {
    }

    /** One move of a day: its primary muscle (the catalog's first), sets and rep range. */
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
    }

    /** A training day: its moves in order. */
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

    /** The week: training days in order. */
    public record Program(List<Day> days) {
        public Program {
            days = List.copyOf(days);
        }

        int weekly(String muscle) {
            return days.stream().mapToInt(day -> day.sets(muscle)).sum();
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

    /** The day goes; its moves were moved by the same diff. */
    public record RemoveDay(int day) implements Change {
    }

    /** The move goes to the end of another day. */
    public record MoveExercise(int fromDay, int position, int toDay, String exercise, int sets) implements Change {
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
    public static List<Suggestion> review(Program program, Map<String, String> isolationByMuscle, Parameters parameters) {
        List<Suggestion> all = findings(program, isolationByMuscle, parameters);
        return List.copyOf(all.subList(0, Math.min(all.size(), parameters.wholeNumber(ParameterKey.REVIEW_MAX_SUGGESTIONS))));
    }

    /** Every finding that has a fix, in priority order; within one, week order (a muscle's first day), then muscle id. */
    public static List<Suggestion> findings(Program program, Map<String, String> isolationByMuscle, Parameters parameters) {
        Objects.requireNonNull(program, "program");
        Objects.requireNonNull(isolationByMuscle, "isolationByMuscle");
        Objects.requireNonNull(parameters, "parameters");
        List<String> muscles = musclesInWeekOrder(program);
        List<Suggestion> found = new ArrayList<>();
        tooManyDays(program, parameters).ifPresent(found::add);
        muscles.forEach(muscle -> tooManySets(program, muscle, parameters).ifPresent(found::add));
        muscles.forEach(muscle -> tooFewSets(program, muscle, isolationByMuscle.get(muscle), parameters).ifPresent(found::add));
        muscles.forEach(muscle -> onceAWeek(program, muscle, parameters).ifPresent(found::add));
        found.addAll(repRanges(program, parameters));
        return List.copyOf(found);
    }

    private static List<String> musclesInWeekOrder(Program program) {
        List<String> muscles = new ArrayList<>();
        for (Day day : program.days()) {
            new TreeSet<>(day.moves().stream().map(Move::muscle).toList()).stream().filter(m -> !muscles.contains(m)).forEach(muscles::add);
        }
        return muscles;
    }

    // ── 1 · days (G6 K-36) ───────────────────────────────────────────────────────────────────────────────────────

    private record Placed(int fromDay, int position, Move move) {
    }

    private record WorkDay(int index, List<Placed> moves) {
        int sets(String muscle) {
            return moves.stream().filter(p -> p.move().muscle().equals(muscle)).mapToInt(p -> p.move().sets()).sum();
        }

        int total() {
            return moves.stream().mapToInt(p -> p.move().sets()).sum();
        }
    }

    // The lightest day goes (tie: the later); each of its moves goes to the day that trains its muscle least (tie: the lighter
    // day, then the earlier) while that session stays within sets_per_session_per_muscle_max (G1 K-10). Never below
    // training_days_min.
    private static Optional<Suggestion> tooManyDays(Program program, Parameters parameters) {
        int days = program.days().size();
        int max = parameters.wholeNumber(ParameterKey.TRAINING_DAYS_MAX);
        if (days <= max) {
            return Optional.empty();
        }
        int target = Math.max(max, parameters.wholeNumber(ParameterKey.TRAINING_DAYS_MIN));
        int sessionMax = parameters.wholeNumber(ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MAX);
        List<WorkDay> week = new ArrayList<>();
        for (int d = 0; d < days; d++) {
            int day = d;
            List<Move> moves = program.days().get(d).moves();
            week.add(new WorkDay(d, new ArrayList<>(IntStream.range(0, moves.size()).mapToObj(i -> new Placed(day, i, moves.get(i))).toList())));
        }
        List<Change> changes = new ArrayList<>();
        while (week.size() > target) {
            WorkDay lightest = week.getFirst();
            for (WorkDay day : week) {
                if (day.total() <= lightest.total()) {
                    lightest = day;
                }
            }
            week.remove(lightest);
            changes.add(new RemoveDay(lightest.index()));
            for (Placed placed : lightest.moves()) {
                String muscle = placed.move().muscle();
                Optional<WorkDay> to = week.stream().filter(day -> day.sets(muscle) + placed.move().sets() <= sessionMax)
                        .min(Comparator.comparingInt((WorkDay day) -> day.sets(muscle)).thenComparingInt(WorkDay::total)
                                .thenComparingInt(WorkDay::index));
                if (to.isEmpty()) {
                    return Optional.empty();
                }
                to.get().moves().add(placed);
            }
        }
        changes.sort(Comparator.comparingInt(change -> ((RemoveDay) change).day()));
        for (WorkDay day : week) {
            for (Placed placed : day.moves()) {
                if (placed.fromDay() != day.index()) {
                    changes.add(new MoveExercise(placed.fromDay(), placed.position(), day.index(), placed.move().exercise(), placed.move().sets()));
                }
            }
        }
        return Optional.of(new Suggestion(Finding.TOO_MANY_DAYS, Optional.empty(), Optional.empty(), Map.of("from", days, "to", target),
                DAYS_MAX, DAYS_SOURCE, new CopyKey("review.too_many_days"), changes));
    }

    // ── 2 · too many sets (G1 K-11) ──────────────────────────────────────────────────────────────────────────────

    // One set at a time from the muscle's biggest move (tie: the latest in the week), each move keeping one; if that is not
    // enough, whole moves go from the end of the week.
    private static Optional<Suggestion> tooManySets(Program program, String muscle, Parameters parameters) {
        int weekly = program.weekly(muscle);
        if (weekly <= parameters.wholeNumber(ParameterKey.WEEKLY_SETS_MAX)) {
            return Optional.empty();
        }
        int target = parameters.wholeNumber(ParameterKey.WEEKLY_SETS_TRIM_TO);
        List<Placed> moves = placements(program, muscle);
        int[] sets = moves.stream().mapToInt(p -> p.move().sets()).toArray();
        int excess = weekly - target;
        while (excess > 0) {
            int pick = -1;
            for (int i = 0; i < sets.length; i++) {
                if (sets[i] > 1 && (pick < 0 || sets[i] >= sets[pick])) {
                    pick = i;
                }
            }
            if (pick < 0) {
                break;
            }
            sets[pick]--;
            excess--;
        }
        boolean[] dropped = new boolean[sets.length];
        for (int i = sets.length - 1; i >= 0 && excess > 0; i--) {
            dropped[i] = true;
            excess -= sets[i];
        }
        List<Change> changes = new ArrayList<>();
        for (int i = 0; i < sets.length; i++) {
            Placed placed = moves.get(i);
            if (dropped[i]) {
                changes.add(new RemoveExercise(placed.fromDay(), placed.position(), placed.move().exercise()));
            } else if (sets[i] != placed.move().sets()) {
                changes.add(new SetSets(placed.fromDay(), placed.position(), placed.move().exercise(), placed.move().sets(), sets[i]));
            }
        }
        if (changes.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new Suggestion(Finding.TOO_MANY_SETS, Optional.of(muscle), Optional.empty(),
                Map.of("from", weekly, "to", target), WEEKLY_SETS_MAX, VOLUME_SOURCE, new CopyKey("review.too_many_sets"), changes));
    }

    private static List<Placed> placements(Program program, String muscle) {
        List<Placed> placed = new ArrayList<>();
        for (int d = 0; d < program.days().size(); d++) {
            List<Move> moves = program.days().get(d).moves();
            for (int i = 0; i < moves.size(); i++) {
                if (moves.get(i).muscle().equals(muscle)) {
                    placed.add(new Placed(d, i, moves.get(i)));
                }
            }
        }
        return placed;
    }

    // ── 3 · too few sets (G1 K-11, K-61) ─────────────────────────────────────────────────────────────────────────

    // The caller's isolation move for the muscle goes first to the days that already train it (so the new sets don't make a
    // session under sets_per_session_per_muscle_min, G1 K-10), lightest first (tie: the earlier), within
    // sets_per_session_per_muscle_max; a day that already does that move gets more sets of it instead of a second copy.
    private static Optional<Suggestion> tooFewSets(Program program, String muscle, String isolation, Parameters parameters) {
        boolean arm = ARM_MUSCLES.contains(muscle);
        int weeklyMin = parameters.wholeNumber(ParameterKey.WEEKLY_SETS_MIN);
        int min = arm ? Math.max(weeklyMin, parameters.wholeNumber(ParameterKey.ARM_WEEKLY_SETS_MIN)) : weeklyMin;
        int weekly = program.weekly(muscle);
        if (weekly >= min || isolation == null) {
            return Optional.empty();
        }
        int sessionMax = parameters.wholeNumber(ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MAX);
        List<Day> days = program.days();
        List<Integer> order = IntStream.range(0, days.size()).boxed()
                .sorted(Comparator.comparingInt((Integer d) -> days.get(d).sets(muscle) > 0 ? 0 : 1)
                        .thenComparingInt(d -> days.get(d).total()).thenComparingInt(d -> d))
                .toList();
        int need = min - weekly;
        List<Change> changes = new ArrayList<>();
        for (int d : order) {
            int add = Math.min(need, sessionMax - days.get(d).sets(muscle));
            if (add <= 0) {
                continue;
            }
            List<Move> moves = days.get(d).moves();
            int existing = IntStream.range(0, moves.size())
                    .filter(i -> moves.get(i).exercise().equals(isolation) && moves.get(i).muscle().equals(muscle)).findFirst().orElse(-1);
            if (existing >= 0) {
                int sets = moves.get(existing).sets();
                changes.add(new SetSets(d, existing, isolation, sets, sets + add));
            } else {
                changes.add(new AddExercise(d, new Move(isolation, muscle, LiftKind.ISOLATION, add,
                        parameters.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MIN), parameters.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MAX))));
            }
            need -= add;
            if (need == 0) {
                break;
            }
        }
        if (need > 0) {
            return Optional.empty();
        }
        return Optional.of(new Suggestion(Finding.TOO_FEW_SETS, Optional.of(muscle), Optional.empty(), Map.of("from", weekly, "to", min),
                arm ? ARM_WEEKLY_SETS_MIN : WEEKLY_SETS_MIN, arm ? ARM_SOURCE : VOLUME_SOURCE,
                new CopyKey(arm ? "review.too_few_arm_sets" : "review.too_few_sets"), changes));
    }

    // ── 4 · once a week (G1 K-22) ────────────────────────────────────────────────────────────────────────────────

    // Half of the muscle's biggest move (tie: the later) goes, as a copy, to the lightest day that doesn't train it (tie: the
    // earlier), both sessions keeping sets_per_session_per_muscle_min (G1 K-10). If halving can't do that, a whole move of
    // the muscle (the last that can) goes there instead.
    private static Optional<Suggestion> onceAWeek(Program program, String muscle, Parameters parameters) {
        List<Day> days = program.days();
        List<Integer> training = IntStream.range(0, days.size()).filter(d -> days.get(d).sets(muscle) > 0).boxed().toList();
        int weekly = program.weekly(muscle);
        if (parameters.wholeNumber(ParameterKey.FREQUENCY_PER_MUSCLE_PER_WEEK) <= 1 || training.size() != 1
                || weekly < parameters.wholeNumber(ParameterKey.WEEKLY_SETS_MIN)) {
            return Optional.empty();
        }
        int sessionMin = parameters.wholeNumber(ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MIN);
        int sessionMax = parameters.wholeNumber(ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MAX);
        int from = training.getFirst();
        Optional<Integer> to = IntStream.range(0, days.size()).filter(d -> d != from).boxed()
                .min(Comparator.comparingInt((Integer d) -> days.get(d).total()).thenComparingInt(d -> d));
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
        if (half >= sessionMin && half <= sessionMax && weekly - half >= sessionMin) {
            changes.add(new SetSets(from, biggest, move.exercise(), move.sets(), move.sets() - half));
            changes.add(new AddExercise(to.get(), move.withSets(half)));
        } else {
            for (int i = moves.size() - 1; i >= 0 && changes.isEmpty(); i--) {
                Move whole = moves.get(i);
                if (whole.muscle().equals(muscle) && whole.sets() >= sessionMin && whole.sets() <= sessionMax
                        && weekly - whole.sets() >= sessionMin) {
                    changes.add(new MoveExercise(from, i, to.get(), whole.exercise(), whole.sets()));
                }
            }
        }
        if (changes.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new Suggestion(Finding.ONCE_A_WEEK, Optional.of(muscle), Optional.empty(), Map.of("from", 1, "to", 2),
                FREQUENCY, FREQUENCY_SOURCE, new CopyKey("review.once_a_week"), changes));
    }

    // ── 5 · rep range (G1 K-21) ──────────────────────────────────────────────────────────────────────────────────

    private static List<Suggestion> repRanges(Program program, Parameters parameters) {
        List<Suggestion> found = new ArrayList<>();
        for (int d = 0; d < program.days().size(); d++) {
            List<Move> moves = program.days().get(d).moves();
            for (int i = 0; i < moves.size(); i++) {
                Move move = moves.get(i);
                boolean compound = move.kind() == LiftKind.COMPOUND;
                int min = parameters.wholeNumber(compound ? ParameterKey.REP_RANGE_COMPOUND_MIN : ParameterKey.REP_RANGE_ISOLATION_MIN);
                int max = parameters.wholeNumber(compound ? ParameterKey.REP_RANGE_COMPOUND_MAX : ParameterKey.REP_RANGE_ISOLATION_MAX);
                if (move.repMin() < min || move.repMax() > max) {
                    found.add(new Suggestion(Finding.REP_RANGE, Optional.empty(), Optional.of(move.exercise()),
                            Map.of("fromMin", move.repMin(), "fromMax", move.repMax(), "toMin", min, "toMax", max), REP_RANGE,
                            REP_RANGE_SOURCE, new CopyKey(compound ? "review.rep_range_compound" : "review.rep_range_isolation"),
                            List.of(new SetRepRange(d, i, move.exercise(), move.repMin(), move.repMax(), min, max))));
                }
            }
        }
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
                case MoveExercise(int fromDay, int position, int toDay, String exercise, int sets) -> {
                    Move move = take(slots, fromDay, position, exercise);
                    require(move.sets() == sets, change);
                    slots.get(fromDay).set(position, null);
                    added.get(day(n, toDay)).add(move);
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
