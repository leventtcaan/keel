package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.keel.engine.ProgramReview.AddExercise;
import app.keel.engine.ProgramReview.Catalog;
import app.keel.engine.ProgramReview.Day;
import app.keel.engine.ProgramReview.Finding;
import app.keel.engine.ProgramReview.Move;
import app.keel.engine.ProgramReview.MoveExercise;
import app.keel.engine.ProgramReview.Program;
import app.keel.engine.ProgramReview.RemoveDay;
import app.keel.engine.ProgramReview.RemoveExercise;
import app.keel.engine.ProgramReview.SetRepRange;
import app.keel.engine.ProgramReview.SetSets;
import app.keel.engine.ProgramReview.Suggestion;
import java.io.IOException;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Program review (K-955, ADR-073 #2): days over training_days_max come down to it (G6 K-36), a muscle over weekly_sets_max is
 * trimmed to weekly_sets_trim_to (G1 K-11), one under weekly_sets_min (arms: arm_weekly_sets_min, G1 K-61) is topped up with
 * the caller's isolation move, a muscle trained on one day is split (G1 K-22), and a rep range outside K-21 is set to it.
 * Every session a diff touches stays within sets_per_session_per_muscle_min/max (G1 K-10). Thresholds come from the
 * parameter files; the expected suggestions and their diffs on the fixture program are literal.
 */
class ProgramReviewTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final int DAYS_MAX = P.wholeNumber(ParameterKey.TRAINING_DAYS_MAX);
    private static final int WEEKLY_MAX = P.wholeNumber(ParameterKey.WEEKLY_SETS_MAX);
    private static final int WEEKLY_MIN = P.wholeNumber(ParameterKey.WEEKLY_SETS_MIN);
    private static final int ARM_MIN = P.wholeNumber(ParameterKey.ARM_WEEKLY_SETS_MIN);
    private static final int SESSION_MAX = P.wholeNumber(ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MAX);
    private static final int FREQUENCY = P.wholeNumber(ParameterKey.FREQUENCY_PER_MUSCLE_PER_WEEK);
    private static final int MAX_SUGGESTIONS = P.wholeNumber(ParameterKey.REVIEW_MAX_SUGGESTIONS);
    private static final int C_MIN = P.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MIN);
    private static final int C_MAX = P.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MAX);
    private static final int I_MIN = P.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MIN);
    private static final int I_MAX = P.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MAX);

    /** The caller's isolation move per muscle (from the catalog); none for upper_back or lats on purpose. */
    static final Map<String, String> CANDIDATES = Map.of("hamstrings", "seated_leg_curl", "biceps", "dumbbell_curl",
            "triceps", "triceps_pushdown", "chest", "cable_fly", "calves", "seated_calf_raise", "quads", "leg_extension",
            "side_delts", "lateral_raise", "rear_delts", "reverse_pec_deck");

    /** The arm muscles as data/muscles.yaml marks them (the catalog reads the same list). */
    @SuppressWarnings("unchecked")
    static final Set<String> ARMS = Set.copyOf((List<String>) muscles().get("arm_muscles"));

    static final Catalog CATALOG = new Catalog(CANDIDATES, ARMS);

    private static Map<String, Object> muscles() {
        try (Reader reader = Files.newBufferedReader(Path.of("../data/muscles.yaml"))) {
            return ParametersLoaderTests.strictYaml().load(reader);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // ── fixture ──────────────────────────────────────────────────────────────────────────────────────────────────

    static Move compound(String exercise, String muscle, int sets) {
        return new Move(exercise, muscle, LiftKind.COMPOUND, sets, C_MIN, C_MAX);
    }

    static Move isolation(String exercise, String muscle, int sets) {
        return new Move(exercise, muscle, LiftKind.ISOLATION, sets, I_MIN, I_MAX);
    }

    /**
     * Upper/lower over four days that breaks no rule: every muscle on two days; hamstrings and front delts at exactly
     * weekly_sets_min, biceps and triceps at exactly arm_weekly_sets_min. Day totals 14, 8, 14, 8.
     */
    static List<List<Move>> upperLower() {
        return new ArrayList<>(List.of(
                new ArrayList<>(List.of(compound("bench_press", "chest", 3), compound("barbell_row", "upper_back", 3),
                        compound("overhead_press", "front_delts", 2), isolation("barbell_curl", "biceps", 3),
                        isolation("triceps_pushdown", "triceps", 3))),
                new ArrayList<>(List.of(compound("squat", "quads", 3), compound("romanian_deadlift", "hamstrings", 2),
                        isolation("standing_calf_raise", "calves", 3))),
                new ArrayList<>(List.of(compound("dumbbell_bench_press", "chest", 3), compound("seated_row", "upper_back", 3),
                        compound("dumbbell_shoulder_press", "front_delts", 2), isolation("dumbbell_curl", "biceps", 3),
                        isolation("overhead_triceps_extension", "triceps", 3))),
                new ArrayList<>(List.of(compound("leg_press", "quads", 3), isolation("lying_leg_curl", "hamstrings", 2),
                        isolation("seated_calf_raise", "calves", 3)))));
    }

    /** The upper/lower week plus two light shoulder days (4 sets each): six days. */
    static List<List<Move>> sixDays() {
        List<List<Move>> days = upperLower();
        days.add(new ArrayList<>(List.of(isolation("lateral_raise", "side_delts", 2), isolation("face_pull", "rear_delts", 2))));
        days.add(new ArrayList<>(List.of(isolation("cable_lateral_raise", "side_delts", 2),
                isolation("reverse_pec_deck", "rear_delts", 2))));
        return days;
    }

    /** The same full-body day {@code days} times: chest, quads and upper back at 2 sets each. */
    static List<List<Move>> fullBody(int days) {
        return IntStream.range(0, days).mapToObj(day -> (List<Move>) new ArrayList<>(List.of(compound("bench_press", "chest", 2),
                compound("squat", "quads", 2), compound("seated_row", "upper_back", 2))))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    static Program program(List<List<Move>> days) {
        return new Program(days.stream().map(Day::new).toList());
    }

    static void set(List<List<Move>> days, int day, int position, UnaryOperator<Move> change) {
        days.get(day).set(position, change.apply(days.get(day).get(position)));
    }

    static Move sets(Move move, int sets) {
        return new Move(move.exercise(), move.muscle(), move.kind(), sets, move.repMin(), move.repMax());
    }

    static Move reps(Move move, int min, int max) {
        return new Move(move.exercise(), move.muscle(), move.kind(), move.sets(), min, max);
    }

    static List<Suggestion> review(List<List<Move>> days) {
        return ProgramReview.review(program(days), CATALOG, P);
    }

    static List<Suggestion> of(List<Suggestion> suggestions, Finding finding) {
        return suggestions.stream().filter(s -> s.finding() == finding).toList();
    }

    // ── a program that breaks nothing ────────────────────────────────────────────────────────────────────────────

    @Test
    void aProgramInsideEveryRuleHasNoSuggestionIncludingMusclesExactlyAtTheirMinimum() {
        assertThat(review(upperLower())).isEmpty();
    }

    @Test
    void anEmptyProgramAndAnEmptyDayHaveNoSuggestion() {
        assertThat(review(new ArrayList<>())).isEmpty();
        List<List<Move>> week = upperLower();
        week.add(2, new ArrayList<>());
        assertThat(review(week)).isEmpty();
    }

    // ── 1 · days ─────────────────────────────────────────────────────────────────────────────────────────────────

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 1})
    void daysAreFlaggedOnlyAboveTheMaximum(int offset) {
        int days = DAYS_MAX + offset;
        assertThat(of(review(fullBody(days)), Finding.TOO_MANY_DAYS)).as(days + " days").hasSize(offset > 0 ? 1 : 0);
    }

    @Test
    void emptyDaysAreNotTrainingDays() {
        // Six days, three of them with no moves: three training days.
        List<List<Move>> week = fullBody(DAYS_MAX + 1 - 3);
        for (int i = 0; i < 3; i++) {
            week.add(new ArrayList<>());
        }
        assertThat(of(review(week), Finding.TOO_MANY_DAYS)).isEmpty();

        // Six training days and an empty one: "6, not 7", and the empty day stays as it is.
        List<List<Move>> seven = fullBody(DAYS_MAX + 1);
        seven.add(new ArrayList<>());
        Suggestion days = of(review(seven), Finding.TOO_MANY_DAYS).getFirst();
        assertThat(days.numbers()).isEqualTo(Map.of("from", 6, "to", 5));
        assertThat(ProgramReview.apply(program(seven), days).days()).hasSize(6).last().satisfies(day -> assertThat(day.moves()).isEmpty());
    }

    @Test
    void sixDaysComeDownToFiveByMovingTheLightestLaterDayIntoTheDaysThatLeastTrainItsMuscles() {
        List<Suggestion> days = of(review(sixDays()), Finding.TOO_MANY_DAYS);

        assertThat(days).hasSize(1);
        Suggestion suggestion = days.getFirst();
        assertThat(suggestion.numbers()).isEqualTo(Map.of("from", 6, "to", 5));
        assertThat(suggestion.copyKey()).isEqualTo(new CopyKey("review.too_many_days"));
        assertThat(suggestion.rule()).isEqualTo(new RuleId("program_days_max"));
        assertThat(suggestion.source()).isEqualTo(new Source("arastirma/ham/guray/G6-eski-arsiv.md#K-36", SourceTag.EXPERIENCE));
        assertThat(suggestion.muscle()).isEmpty();
        // Days 4 and 5 both total 4 sets: the later goes. Neither day 0-3 trains side or rear delts, so each muscle's work goes
        // to the lightest of them (8 sets: day 1, then day 3 once day 1 has 10).
        assertThat(suggestion.changes()).containsExactly(new RemoveDay(5),
                new MoveExercise(5, 0, 1, "cable_lateral_raise", 2, 2), new MoveExercise(5, 1, 3, "reverse_pec_deck", 2, 2));

        Program after = ProgramReview.apply(program(sixDays()), suggestion);
        assertThat(after.days()).hasSize(5);
        assertThat(after.days().get(1).moves().getLast().exercise()).isEqualTo("cable_lateral_raise");
        assertThat(after.days().get(3).moves().getLast().exercise()).isEqualTo("reverse_pec_deck");
    }

    @Test
    void aMoveTheTargetDayAlreadyHasIsMergedIntoItNotRepeated() {
        // Six identical days: day 5 goes, and each of its moves joins the same move on the lightest day.
        Suggestion days = of(review(fullBody(DAYS_MAX + 1)), Finding.TOO_MANY_DAYS).getFirst();

        assertThat(days.changes()).containsExactly(new RemoveDay(5), new SetSets(0, 0, "bench_press", 2, 4),
                new SetSets(1, 1, "squat", 2, 4), new SetSets(2, 2, "seated_row", 2, 4), new RemoveExercise(5, 0, "bench_press"),
                new RemoveExercise(5, 1, "squat"), new RemoveExercise(5, 2, "seated_row"));
        Program after = ProgramReview.apply(program(fullBody(DAYS_MAX + 1)), days);
        assertThat(after.days()).allSatisfy(day -> assertThat(day.moves().stream().map(Move::exercise).distinct()).hasSize(day.moves().size()));
    }

    @Test
    void whenAMoveFitsInNoOtherDayThereIsNoDiffAndSoNoFinding() {
        // Every day already has the most chest sets a session takes: the lightest day's chest fits nowhere.
        List<List<Move>> week = IntStream.range(0, DAYS_MAX + 1)
                .mapToObj(day -> (List<Move>) new ArrayList<>(List.of(compound("bench_press", "chest", SESSION_MAX))))
                .collect(Collectors.toCollection(ArrayList::new));

        assertThat(of(review(week), Finding.TOO_MANY_DAYS)).isEmpty();
    }

    // ── 2 · too many sets ────────────────────────────────────────────────────────────────────────────────────────

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 1})
    void weeklySetsAreFlaggedOnlyAboveTheMaximum(int offset) {
        List<List<Move>> week = upperLower();
        set(week, 0, 0, move -> sets(move, WEEKLY_MAX + offset - 3));

        assertThat(of(review(week), Finding.TOO_MANY_SETS)).hasSize(offset > 0 ? 1 : 0);
    }

    @Test
    void chestAtEighteenIsTrimmedToTwelveOneSetAtATimeFromTheBiggestLatestMove() {
        List<List<Move>> week = upperLower();
        set(week, 0, 0, move -> sets(move, 5));
        week.get(1).add(compound("push_up", "chest", 4));
        set(week, 2, 0, move -> sets(move, 5));
        week.get(3).add(compound("dip", "chest", 4));

        List<Suggestion> trims = of(review(week), Finding.TOO_MANY_SETS);

        assertThat(trims).hasSize(1);
        Suggestion trim = trims.getFirst();
        assertThat(trim.muscle()).contains("chest");
        assertThat(trim.numbers()).isEqualTo(Map.of("from", 18, "to", 12));
        assertThat(trim.copyKey()).isEqualTo(new CopyKey("review.too_many_sets"));
        assertThat(trim.rule()).isEqualTo(new RuleId("program_weekly_sets_max"));
        assertThat(trim.source()).isEqualTo(new Source("arastirma/ham/guray/G1-antrenman.md#K-11", SourceTag.EXPERIENCE));
        assertThat(trim.changes()).containsExactly(new SetSets(0, 0, "bench_press", 5, 3), new SetSets(1, 3, "push_up", 4, 3),
                new SetSets(2, 0, "dumbbell_bench_press", 5, 3), new SetSets(3, 3, "dip", 4, 3));
    }

    @Test
    void whenOneSetPerMoveIsStillTooMuchTheLastMovesOfTheWeekGoAndNoSessionDropsUnderItsMinimum() {
        List<List<Move>> week = upperLower();
        // Sixteen one-set chest moves at the end of day 3 (positions 3 to 18) plus the week's two chest moves at 3: 22 sets.
        for (int i = 0; i < 16; i++) {
            week.get(3).add(isolation("pec_deck", "chest", 1));
        }

        Suggestion trim = of(review(week), Finding.TOO_MANY_SETS).getFirst();
        Program after = ProgramReview.apply(program(week), trim);

        // The presses keep a session's minimum (2), then the last eight moves of the week go.
        assertThat(trim.changes()).contains(new SetSets(0, 0, "bench_press", 3, 2), new SetSets(2, 0, "dumbbell_bench_press", 3, 2),
                new RemoveExercise(3, 18, "pec_deck"), new RemoveExercise(3, 11, "pec_deck"))
                .doesNotContain(new RemoveExercise(3, 10, "pec_deck")).hasSize(10);
        assertThat(after.weekly("chest")).isEqualTo(12);
    }

    // ── 3 · too few sets ─────────────────────────────────────────────────────────────────────────────────────────

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 1})
    void weeklySetsAreFlaggedOnlyBelowTheMinimumNotAtIt(int offset) {
        List<List<Move>> week = upperLower();
        // Hamstrings: 2 on day 1 plus the leg curl on day 3.
        set(week, 3, 1, move -> sets(move, WEEKLY_MIN + offset - 2));

        assertThat(of(review(week), Finding.TOO_FEW_SETS)).hasSize(offset < 0 ? 1 : 0);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 1})
    void armsAreFlaggedOnlyBelowTheirOwnMinimum(int offset) {
        List<List<Move>> week = upperLower();
        // Biceps: 3 on day 0 plus the curl on day 2.
        set(week, 2, 3, move -> sets(move, ARM_MIN + offset - 3));

        assertThat(of(review(week), Finding.TOO_FEW_SETS)).hasSize(offset < 0 ? 1 : 0);
    }

    @Test
    void theArmMinimumAppliesOnlyToTheMusclesTheCatalogMarks() {
        List<List<Move>> week = upperLower();
        set(week, 2, 3, move -> sets(move, ARM_MIN - 1 - 3));

        assertThat(of(ProgramReview.review(program(week), new Catalog(CANDIDATES, Set.of()), P), Finding.TOO_FEW_SETS)).isEmpty();
    }

    @Test
    void hamstringsAtThreeAreToppedUpToFourWithTheIsolationMoveOnTheLightestDayThatTrainsThem() {
        List<List<Move>> week = upperLower();
        set(week, 3, 1, move -> sets(move, 1));

        List<Suggestion> topUps = of(review(week), Finding.TOO_FEW_SETS);

        assertThat(topUps).hasSize(1);
        Suggestion topUp = topUps.getFirst();
        assertThat(topUp.muscle()).contains("hamstrings");
        assertThat(topUp.numbers()).isEqualTo(Map.of("from", 3, "to", 4, "min", 4));
        assertThat(topUp.copyKey()).isEqualTo(new CopyKey("review.too_few_sets"));
        assertThat(topUp.rule()).isEqualTo(new RuleId("program_weekly_sets_min"));
        assertThat(topUp.source()).isEqualTo(new Source("arastirma/ham/guray/G1-antrenman.md#K-11", SourceTag.EXPERIENCE));
        // Days 1 (8 sets) and 3 (7 sets) train hamstrings; day 3 is lighter.
        assertThat(topUp.changes()).containsExactly(new AddExercise(3, isolation("seated_leg_curl", "hamstrings", 1)));
    }

    @Test
    void bicepsAtFiveAreToppedUpToSixRaisingTheCandidateWhereTheDayAlreadyHasIt() {
        List<List<Move>> week = upperLower();
        set(week, 2, 3, move -> sets(move, 2));

        Suggestion topUp = of(review(week), Finding.TOO_FEW_SETS).getFirst();

        assertThat(topUp.muscle()).contains("biceps");
        assertThat(topUp.numbers()).isEqualTo(Map.of("from", 5, "to", 6, "min", 6));
        assertThat(topUp.copyKey()).isEqualTo(new CopyKey("review.too_few_arm_sets"));
        assertThat(topUp.rule()).isEqualTo(new RuleId("program_arm_weekly_sets_min"));
        assertThat(topUp.source()).isEqualTo(new Source("arastirma/ham/guray/G1-antrenman.md#K-61", SourceTag.EXPERIENCE));
        // Days 0 (14 sets) and 2 (13 sets) train biceps; day 2 already does the dumbbell curl, so it gets one more set.
        assertThat(topUp.changes()).containsExactly(new SetSets(2, 3, "dumbbell_curl", 2, 3));
    }

    @Test
    void bicepsAtFiveOnAFullDayGetANewSessionOfAtLeastTheSessionMinimum() {
        // Biceps only on day 0, at the session maximum: the missing set can't go there, and a one-set session elsewhere would
        // be under sets_per_session_per_muscle_min, so the lightest other day gets two (7 a week).
        List<List<Move>> week = upperLower();
        set(week, 0, 3, move -> sets(move, 5));
        week.get(2).remove(3);

        Suggestion topUp = of(ProgramReview.findings(program(week), CATALOG, P), Finding.TOO_FEW_SETS).getFirst();

        assertThat(topUp.numbers()).isEqualTo(Map.of("from", 5, "to", 7, "min", 6));
        assertThat(topUp.changes()).containsExactly(new AddExercise(1, isolation("dumbbell_curl", "biceps", 2)));
    }

    @Test
    void bicepsAtFourOnOneDayGoUpOnASecondDayRatherThanBySingleSets() {
        List<List<Move>> week = upperLower();
        set(week, 0, 3, move -> sets(move, 4));
        week.get(2).remove(3);

        Suggestion topUp = of(ProgramReview.findings(program(week), CATALOG, P), Finding.TOO_FEW_SETS).getFirst();

        assertThat(topUp.numbers()).isEqualTo(Map.of("from", 4, "to", 6, "min", 6));
        assertThat(topUp.changes()).containsExactly(new AddExercise(1, isolation("dumbbell_curl", "biceps", 2)));
    }

    @Test
    void withoutACandidateMoveForTheMuscleThereIsNoFinding() {
        List<List<Move>> week = upperLower();
        set(week, 0, 1, move -> sets(move, 1));
        set(week, 2, 1, move -> sets(move, 2));

        assertThat(of(review(week), Finding.TOO_FEW_SETS)).isEmpty();
    }

    @Test
    void aMuscleTheProgramNeverTrainsIsOutOfScope() {
        // Hamstrings under the minimum is a finding; lats, with a candidate move but no move in the program, is not.
        List<List<Move>> week = upperLower();
        set(week, 3, 1, move -> sets(move, 1));
        Map<String, String> withLats = new HashMap<>(CANDIDATES);
        withLats.put("lats", "lat_pulldown");

        List<Suggestion> findings = ProgramReview.findings(program(week), new Catalog(withLats, ARMS), P);

        assertThat(findings).extracting(s -> s.muscle().orElse("")).contains("hamstrings").doesNotContain("lats");
    }

    // ── 4 · once a week ──────────────────────────────────────────────────────────────────────────────────────────

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 1})
    void aOnceAWeekMuscleIsFlaggedFromTheWeeklyMinimum(int offset) {
        List<List<Move>> week = upperLower();
        week.get(3).remove(2);
        set(week, 1, 2, move -> sets(move, WEEKLY_MIN + offset));

        assertThat(of(review(week), Finding.ONCE_A_WEEK)).hasSize(offset >= 0 ? 1 : 0);
    }

    @Test
    void calvesOnOneDayAreSplitHalfToTheLightestDayWithoutThem() {
        List<List<Move>> week = upperLower();
        week.get(3).remove(2);
        set(week, 1, 2, move -> sets(move, 4));

        List<Suggestion> splits = of(review(week), Finding.ONCE_A_WEEK);

        assertThat(splits).hasSize(1);
        Suggestion split = splits.getFirst();
        assertThat(split.muscle()).contains("calves");
        assertThat(split.numbers()).isEqualTo(Map.of("from", 1, "to", FREQUENCY));
        assertThat(split.copyKey()).isEqualTo(new CopyKey("review.once_a_week"));
        assertThat(split.rule()).isEqualTo(new RuleId("program_frequency"));
        assertThat(split.source()).isEqualTo(new Source("arastirma/ham/guray/G1-antrenman.md#K-22", SourceTag.EXPERIENCE));
        // Days 0, 2 and 3 have no calves; day 3 (5 sets) is the lightest.
        assertThat(split.changes()).containsExactly(new SetSets(1, 2, "standing_calf_raise", 4, 2),
                new AddExercise(3, isolation("standing_calf_raise", "calves", 2)));
    }

    @Test
    void whenTheBiggestMoveCannotBeHalvedAWholeMoveGoesToTheOtherDay() {
        List<List<Move>> week = upperLower();
        week.get(1).add(week.get(3).remove(2));

        Suggestion split = of(review(week), Finding.ONCE_A_WEEK).getFirst();

        assertThat(split.changes()).containsExactly(new MoveExercise(1, 3, 3, "seated_calf_raise", 3, 3));
    }

    @Test
    void whenNeitherHalvingNorAWholeMoveKeepsBothSessionsAtTheirMinimumThereIsNoFinding() {
        // Calves 3 + 1 on day 1: half of 3 is one set, and moving either move leaves one set behind.
        List<List<Move>> week = upperLower();
        week.get(3).remove(2);
        week.get(1).add(isolation("seated_calf_raise", "calves", 1));

        assertThat(of(ProgramReview.findings(program(week), CATALOG, P), Finding.ONCE_A_WEEK)).isEmpty();
    }

    @Test
    void aOneDayProgramHasNoOtherDaySoNoSplit() {
        List<List<Move>> week = new ArrayList<>(List.of(new ArrayList<>(List.of(compound("bench_press", "chest", 4)))));

        assertThat(of(review(week), Finding.ONCE_A_WEEK)).isEmpty();
    }

    // ── 5 · rep range ────────────────────────────────────────────────────────────────────────────────────────────

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 1})
    void aRepRangeIsFlaggedOnlyOutsideTheKindsRange(int offset) {
        List<List<Move>> low = upperLower();
        set(low, 0, 0, move -> reps(move, C_MIN + offset, C_MAX));
        List<List<Move>> high = upperLower();
        set(high, 0, 3, move -> reps(move, I_MIN, I_MAX + offset));

        assertThat(of(review(low), Finding.REP_RANGE)).as("compound min").hasSize(offset < 0 ? 1 : 0);
        assertThat(of(review(high), Finding.REP_RANGE)).as("isolation max").hasSize(offset > 0 ? 1 : 0);
    }

    @Test
    void aRepRangeOutsideIsSetToTheKindsRange() {
        List<List<Move>> week = upperLower();
        set(week, 0, 0, move -> reps(move, 3, 5));
        set(week, 0, 3, move -> reps(move, 12, 15));

        List<Suggestion> ranges = of(review(week), Finding.REP_RANGE);

        assertThat(ranges).extracting(Suggestion::copyKey)
                .containsExactly(new CopyKey("review.rep_range_compound"), new CopyKey("review.rep_range_isolation"));
        assertThat(ranges.getFirst().exercise()).contains("bench_press");
        assertThat(ranges.getFirst().numbers()).isEqualTo(Map.of("fromMin", 3, "fromMax", 5, "toMin", 6, "toMax", 10));
        assertThat(ranges.getFirst().changes()).containsExactly(new SetRepRange(0, 0, "bench_press", 3, 5, 6, 10));
        assertThat(ranges.getLast().changes()).containsExactly(new SetRepRange(0, 3, "barbell_curl", 12, 15, 8, 12));
        assertThat(ranges).allSatisfy(s -> {
            assertThat(s.rule()).isEqualTo(new RuleId("program_rep_range"));
            assertThat(s.source()).isEqualTo(new Source("arastirma/ham/guray/G1-antrenman.md#K-21", SourceTag.EXPERIENCE));
        });
    }

    @Test
    void aFixedRepTargetIsReviewedAsAnyRangeIs() {
        // K-991 (ADR-073 Ek 4): 5 x 5 on a compound is under 6-10 (K-21), a suggestion the user can switch off; a fixed
        // target inside the kind's range (8 x 8 on a compound, 10 x 10 on an isolation move) is not flagged.
        List<List<Move>> fiveByFive = upperLower();
        set(fiveByFive, 0, 0, move -> reps(move, C_MIN - 1, C_MIN - 1));
        List<List<Move>> inside = upperLower();
        set(inside, 0, 0, move -> reps(move, C_MIN + 2, C_MIN + 2));
        set(inside, 0, 3, move -> reps(move, I_MIN + 2, I_MIN + 2));

        assertThat(of(review(fiveByFive), Finding.REP_RANGE)).singleElement()
                .satisfies(s -> assertThat(s.changes()).containsExactly(new SetRepRange(0, 0, "bench_press", C_MIN - 1, C_MIN - 1, C_MIN, C_MAX)));
        assertThat(of(review(inside), Finding.REP_RANGE)).isEmpty();
    }

    @Test
    void anExerciseOnTwoDaysIsOneSuggestionWithOneChangePerDay() {
        List<List<Move>> week = upperLower();
        set(week, 0, 0, move -> reps(move, 3, 5));
        week.get(2).set(0, reps(compound("bench_press", "chest", 3), 3, 5));

        List<Suggestion> ranges = of(review(week), Finding.REP_RANGE);

        assertThat(ranges).hasSize(1);
        assertThat(ranges.getFirst().changes()).containsExactly(new SetRepRange(0, 0, "bench_press", 3, 5, 6, 10),
                new SetRepRange(2, 0, "bench_press", 3, 5, 6, 10));
    }

    // ── priority and the cap ─────────────────────────────────────────────────────────────────────────────────────

    @Test
    void moreFindingsThanTheCapGiveExactlyTheCapInPriorityOrder() {
        List<List<Move>> week = sixDays();
        set(week, 0, 0, move -> sets(move, 5));
        week.get(1).add(compound("push_up", "chest", 4));
        set(week, 2, 0, move -> sets(move, 5));
        week.get(3).add(compound("dip", "chest", 4));
        set(week, 3, 1, move -> sets(move, 1));
        set(week, 0, 1, move -> reps(move, 3, 5));

        List<Suggestion> suggestions = review(week);

        assertThat(suggestions).hasSize(MAX_SUGGESTIONS);
        assertThat(suggestions).extracting(Suggestion::finding)
                .containsExactly(Finding.TOO_MANY_DAYS, Finding.TOO_MANY_SETS, Finding.TOO_FEW_SETS);
    }

    @Test
    void withinOnePriorityTheWeekOrderComesFirstThenTheMuscle() {
        List<List<Move>> week = upperLower();
        set(week, 3, 1, move -> sets(move, 1));
        set(week, 2, 4, move -> sets(move, 2));

        assertThat(of(review(week), Finding.TOO_FEW_SETS)).extracting(s -> s.muscle().orElseThrow())
                .containsExactly("triceps", "hamstrings");
    }

    // ── copy and apply ───────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void everySuggestionsCopyKeyHasATitleAndABody() {
        List<String> keys = List.of("review.too_many_days", "review.too_many_sets", "review.too_few_sets", "review.too_few_arm_sets",
                "review.once_a_week", "review.rep_range_compound", "review.rep_range_isolation");
        for (String key : keys) {
            assertThat(EngineFixtures.copyGroup(new CopyKey(key))).as(key).containsKeys("title", "body");
        }

        List<List<Move>> week = sixDays();
        set(week, 0, 0, move -> reps(sets(move, WEEKLY_MAX + 1), 3, 5));
        set(week, 2, 3, move -> sets(move, 2));
        List<List<Move>> once = upperLower();
        once.get(3).remove(2);
        set(once, 1, 2, move -> sets(move, 4));
        set(once, 3, 1, move -> sets(move, 1));
        set(once, 0, 3, move -> reps(move, 12, 15));
        List<Suggestion> all = new ArrayList<>(review(week));
        all.addAll(review(once));

        assertThat(all).hasSize(2 * MAX_SUGGESTIONS)
                .allSatisfy(suggestion -> assertThat(keys).contains(suggestion.copyKey().value()));
    }

    @Test
    void anAppliedSuggestionChangesOnlyWhatItsDiffSays() {
        List<List<Move>> week = upperLower();
        set(week, 0, 0, move -> reps(move, 3, 5));
        Suggestion range = of(review(week), Finding.REP_RANGE).getFirst();

        assertThat(ProgramReview.apply(program(week), range)).isEqualTo(program(upperLower()));
    }

    @Test
    void aDiffThatDoesNotMatchTheProgramIsRefused() {
        Program week = program(upperLower());
        List<ProgramReview.Change> wrong = List.of(new SetRepRange(0, 0, "barbell_row", 6, 10, 6, 10),
                new SetSets(0, 0, "bench_press", 4, 2), new MoveExercise(1, 0, 0, "squat", 4, 4), new RemoveDay(1),
                new RemoveExercise(9, 0, "squat"), new AddExercise(4, isolation("cable_fly", "chest", 2)), new SetSets(0, 9, "bench_press", 3, 2));

        for (ProgramReview.Change change : wrong) {
            Suggestion suggestion = new Suggestion(Finding.REP_RANGE, java.util.Optional.empty(), java.util.Optional.empty(), Map.of(),
                    ProgramReview.REP_RANGE, ProgramReview.REP_RANGE_SOURCE, new CopyKey("review.rep_range_compound"), List.of(change));
            assertThatIllegalArgumentException().as(change.toString()).isThrownBy(() -> ProgramReview.apply(week, suggestion));
        }
    }

    @Test
    void aMoveWithoutSetsIsRefusedSoCallersLeaveItOut() {
        assertThatIllegalArgumentException().isThrownBy(() -> compound("bench_press", "chest", 0));
    }
}
