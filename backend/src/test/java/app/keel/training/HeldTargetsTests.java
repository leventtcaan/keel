package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Predicate;
import org.junit.jupiter.api.Test;

/**
 * The move a hold of the load changes, for the call screen (K-1009, ADR-077 Ek 7): a target the program stores above the
 * last load (an added load, or a rep past the top of the range that stood in for one) is shown as the last load at the
 * top of the range while the load is held (NextTargets.shown). Of the moves the hold changes, the one the engine counts as
 * the most stalled is the call's, by the engine's own order (TrainingStatuses): so "Sessions stalled: N" in the reason and
 * the move are the same lift. Only the catalog's compound lifts are in that order; the user's own moves are not.
 */
class HeldTargetsTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 14);
    private static final Predicate<ProgramStore.PlannedExercise> NOT_STEPPED_BACK = planned -> false;

    @Test
    void aRepPastTheTopOfTheRangeIsHeldAtTheTopOfTheRangeAtTheLastLoad() {
        // The prototype's bench: 72.5 x 9 before the hold, 72.5 x 8 after.
        assertThat(found(List.of(planned("bench_press", "72.5", 9, "72.5", 6, 8)), lifts("bench_press", stalled(3)))).contains(
                new HeldMove("bench_press", new HeldMove.Target(new BigDecimal("72.5"), 9), new HeldMove.Target(new BigDecimal("72.5"), 8)));
    }

    @Test
    void anAddedLoadIsHeldAtTheLastLoad() {
        assertThat(found(List.of(planned("squat", "105", 6, "102.5", 6, 8)), lifts("squat", stalled(0)))).contains(
                new HeldMove("squat", new HeldMove.Target(new BigDecimal("105"), 6), new HeldMove.Target(new BigDecimal("102.5"), 8)));
    }

    @Test
    void aFixedRepTargetHeldIsItsRepsAtTheLastLoad() {
        // 5 x 5 (K-991): the top of the range is the five.
        assertThat(found(List.of(planned("squat", "102.5", 5, "100", 5, 5)), lifts("squat", stalled(2)))).contains(
                new HeldMove("squat", new HeldMove.Target(new BigDecimal("102.5"), 5), new HeldMove.Target(new BigDecimal("100"), 5)));
    }

    @Test
    void aTargetTheHoldLeavesAsItIsIsNoChange() {
        // At the last load and inside the range: the hold keeps the load, there is nothing to say of this move.
        assertThat(found(List.of(planned("bench_press", "72.5", 7, "72.5", 6, 8)), lifts("bench_press", stalled(4)))).isEmpty();
        assertThat(found(List.of(planned("bench_press", "72.5", 8, "72.5", 6, 8)), lifts("bench_press", stalled(4)))).isEmpty();
    }

    @Test
    void aMoveNeverLiftedHasNoLoadToHoldItTo() {
        // A starting weight (K-998) was given, not lifted: shown as given (NextTargets.shown), the hold changes nothing.
        assertThat(found(List.of(planned("bench_press", "60", 9, null, 6, 8)), lifts("bench_press", stalled(0)))).isEmpty();
        assertThat(found(List.of(new ProgramStore.PlannedExercise("bench_press", 3, 6, 8, 2)), lifts("bench_press", stalled(0)))).isEmpty();
    }

    @Test
    void aTargetSteppedBackAfterABreakIsNotTheHoldsToChange() {
        // The step back comes before the hold (ProgramController.next): what is shown is not the stored target.
        assertThat(HeldTargets.of(List.of(planned("bench_press", "72.5", 9, "72.5", 6, 8)), lifts("bench_press", stalled(3)), planned -> true, TODAY)).isEmpty();
    }

    @Test
    void noMovesNoChange() {
        assertThat(found(List.of(), Map.of())).isEmpty();
    }

    @Test
    void ofTheMovesTheHoldChangesTheMostStalledIsTheCalls() {
        Map<String, List<TrainingStatuses.Session>> lifts = new LinkedHashMap<>();
        lifts.put("squat", stalled(1));
        lifts.put("deadlift", stalled(3));
        lifts.put("overhead_press", stalled(9));

        assertThat(found(List.of(planned("squat", "105", 6, "102.5", 6, 8), planned("deadlift", "145", 5, "140", 4, 6),
                planned("overhead_press", "40", 8, "40", 6, 8)), lifts)).map(HeldMove::exerciseId)
                .as("overhead press is the most stalled, but the hold changes nothing there").contains("deadlift");
    }

    @Test
    void onATieInStalledSessionsTheLongerStallWins() {
        // The engine's second key: whole months since the lift last went up.
        Map<String, List<TrainingStatuses.Session>> lifts = new LinkedHashMap<>();
        lifts.put("squat", stalled(2));
        lifts.put("deadlift", stalledSince(2, TODAY.minusMonths(4)));

        assertThat(found(List.of(planned("squat", "105", 6, "102.5", 6, 8), planned("deadlift", "145", 5, "140", 4, 6)), lifts))
                .map(HeldMove::exerciseId).contains("deadlift");
    }

    @Test
    void thenTheLiftGoingBackwardsThisWeekWins() {
        // The engine's third key: this week's top load under last week's.
        Map<String, List<TrainingStatuses.Session>> lifts = new LinkedHashMap<>();
        lifts.put("squat", levelled());
        lifts.put("deadlift", slipping());

        assertThat(TrainingStatuses.stalledSessions(lifts.get("squat"))).isEqualTo(TrainingStatuses.stalledSessions(lifts.get("deadlift")));
        assertThat(found(List.of(planned("squat", "105", 6, "102.5", 6, 8), planned("deadlift", "145", 5, "140", 4, 6)), lifts))
                .map(HeldMove::exerciseId).contains("deadlift");
    }

    @Test
    void thenTheNameWhateverTheOrderOfTheProgram() {
        Map<String, List<TrainingStatuses.Session>> lifts = new LinkedHashMap<>();
        lifts.put("squat", stalled(2));
        lifts.put("deadlift", stalled(2));

        assertThat(found(List.of(planned("squat", "105", 6, "102.5", 6, 8), planned("deadlift", "145", 5, "140", 4, 6)), lifts))
                .map(HeldMove::exerciseId).contains("deadlift");
        assertThat(found(List.of(planned("deadlift", "145", 5, "140", 4, 6), planned("squat", "105", 6, "102.5", 6, 8)), lifts))
                .map(HeldMove::exerciseId).contains("deadlift");
    }

    @Test
    void theUsersOwnMoveIsNeverTheCallsEvenFirstInTheProgramOrWhenTied() {
        // Not a catalog compound lift: the engine does not count its sessions, so it has no place in the order (and the contract's
        // exerciseId is a catalog id).
        assertThat(found(List.of(planned("my_cable_press", "40", 9, "40", 6, 8), planned("squat", "105", 6, "102.5", 6, 8)),
                lifts("squat", stalled(0)))).map(HeldMove::exerciseId).contains("squat");
        assertThat(found(List.of(planned("my_cable_press", "40", 9, "40", 6, 8)), Map.of())).isEmpty();
    }

    private static Optional<HeldMove> found(List<ProgramStore.PlannedExercise> planned, Map<String, List<TrainingStatuses.Session>> lifts) {
        return HeldTargets.of(planned, lifts, NOT_STEPPED_BACK, TODAY);
    }

    private static Map<String, List<TrainingStatuses.Session>> lifts(String id, List<TrainingStatuses.Session> sessions) {
        return Map.of(id, sessions);
    }

    /** A planned exercise with this next target; {@code last} null: never lifted. */
    private static ProgramStore.PlannedExercise planned(String id, String load, int reps, String last, int min, int max) {
        return new ProgramStore.PlannedExercise(id, 3, min, max, 2, new BigDecimal(load), reps, last == null ? null : new BigDecimal(last), null, null, false);
    }

    /** {@code n} sessions in a row with no more load or reps than the one before, the last time it went up a week before the first of them. */
    private static List<TrainingStatuses.Session> stalled(int n) {
        return stalledSince(n, TODAY.minusDays(7L * (n + 1)));
    }

    private static List<TrainingStatuses.Session> stalledSince(int n, LocalDate wentUp) {
        List<TrainingStatuses.Session> sessions = new ArrayList<>();
        sessions.add(new TrainingStatuses.Session(wentUp, new BigDecimal("100"), 5));
        for (int i = n; i > 0; i--) {
            sessions.add(new TrainingStatuses.Session(TODAY.minusDays(7L * (i - 1)), new BigDecimal("100"), 5));
        }
        return sessions;
    }

    /** Two stalled sessions, all at the same load. */
    private static List<TrainingStatuses.Session> levelled() {
        return List.of(new TrainingStatuses.Session(TODAY.minusDays(40), new BigDecimal("100"), 5),
                new TrainingStatuses.Session(TODAY.minusDays(8), new BigDecimal("100"), 5), new TrainingStatuses.Session(TODAY, new BigDecimal("100"), 5));
    }

    /** Two stalled sessions, this week's load under last week's. */
    private static List<TrainingStatuses.Session> slipping() {
        return List.of(new TrainingStatuses.Session(TODAY.minusDays(40), new BigDecimal("100"), 5),
                new TrainingStatuses.Session(TODAY.minusDays(8), new BigDecimal("100"), 5), new TrainingStatuses.Session(TODAY, new BigDecimal("95"), 5));
    }
}
