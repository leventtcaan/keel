package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.RepRange;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * The move a hold of the load changes, for the call screen (K-1009, ADR-077 Ek 4): a target the program stores above the
 * last load (an added load, or a rep past the top of the range that stood in for one) is shown as the last load at the
 * top of the range while the load is held (NextTargets.shown). Of the moves the hold changes, the one most stalled is
 * the call's (the progress screen's "stuck", K-965, agrees with it); on a tie the first in the program.
 */
class HeldTargetsTests {

    private static final RepRange SIX_TO_EIGHT = new RepRange(6, 8);

    @Test
    void aRepPastTheTopOfTheRangeIsHeldAtTheTopOfTheRangeAtTheLastLoad() {
        // The prototype's bench: 72.5 x 9 before the hold, 72.5 x 8 after.
        assertThat(HeldTargets.mostStuck(List.of(move("bench_press", "72.5", 9, "72.5", SIX_TO_EIGHT, 3)))).contains(
                new HeldMove("bench_press", new HeldMove.Target(new BigDecimal("72.5"), 9), new HeldMove.Target(new BigDecimal("72.5"), 8)));
    }

    @Test
    void anAddedLoadIsHeldAtTheLastLoad() {
        assertThat(HeldTargets.mostStuck(List.of(move("squat", "105", 6, "102.5", SIX_TO_EIGHT, 0)))).contains(
                new HeldMove("squat", new HeldMove.Target(new BigDecimal("105"), 6), new HeldMove.Target(new BigDecimal("102.5"), 8)));
    }

    @Test
    void aTargetTheHoldLeavesAsItIsIsNoChange() {
        // At the last load and inside the range: the hold keeps the load, there is nothing to say of this move.
        assertThat(HeldTargets.mostStuck(List.of(move("bench_press", "72.5", 7, "72.5", SIX_TO_EIGHT, 4)))).isEmpty();
        assertThat(HeldTargets.mostStuck(List.of(move("bench_press", "72.5", 8, "72.5", SIX_TO_EIGHT, 4)))).isEmpty();
    }

    @Test
    void aMoveNeverLiftedHasNoLoadToHoldItTo() {
        // A starting weight (K-998) was given, not lifted: shown as given (NextTargets.shown), the hold changes nothing.
        assertThat(HeldTargets.mostStuck(List.of(move("bench_press", "60", 9, null, SIX_TO_EIGHT, 0)))).isEmpty();
        assertThat(HeldTargets.mostStuck(List.of(new HeldTargets.Move("bench_press", null, null, SIX_TO_EIGHT, 0, false)))).isEmpty();
    }

    @Test
    void aTargetSteppedBackAfterABreakIsNotTheHoldsToChange() {
        // The step back comes before the hold (ProgramController.next): what is shown is not the stored target.
        assertThat(HeldTargets.mostStuck(List.of(new HeldTargets.Move("bench_press", target("72.5", 9), new BigDecimal("72.5"), SIX_TO_EIGHT, 3, true))))
                .isEmpty();
    }

    @Test
    void ofTheMovesTheHoldChangesTheMostStalledIsTheCalls() {
        Optional<HeldMove> found = HeldTargets.mostStuck(List.of(
                move("squat", "105", 6, "102.5", SIX_TO_EIGHT, 1),
                move("deadlift", "145", 5, "140", new RepRange(4, 6), 3),
                move("overhead_press", "40", 8, "40", SIX_TO_EIGHT, 9)));

        assertThat(found).map(HeldMove::exerciseId).as("overhead press is the most stalled, but the hold changes nothing there").contains("deadlift");
    }

    @Test
    void onATieTheFirstInTheProgramIsTheCalls() {
        assertThat(HeldTargets.mostStuck(List.of(
                move("bench_press", "72.5", 9, "72.5", SIX_TO_EIGHT, 2),
                move("squat", "105", 6, "102.5", SIX_TO_EIGHT, 2)))).map(HeldMove::exerciseId).contains("bench_press");
    }

    @Test
    void noMovesNoChange() {
        assertThat(HeldTargets.mostStuck(List.of())).isEmpty();
    }

    @Test
    void aFixedRepTargetHeldIsItsRepsAtTheLastLoad() {
        // 5 x 5 (K-991): the top of the range is the five.
        assertThat(HeldTargets.mostStuck(List.of(move("squat", "102.5", 5, "100", new RepRange(5, 5), 2)))).contains(
                new HeldMove("squat", new HeldMove.Target(new BigDecimal("102.5"), 5), new HeldMove.Target(new BigDecimal("100"), 5)));
    }

    private static HeldTargets.Move move(String id, String load, int reps, String last, RepRange range, int stalled) {
        return new HeldTargets.Move(id, target(load, reps), last == null ? null : new BigDecimal(last), range, stalled, false);
    }

    private static NextTargets.Target target(String load, int reps) {
        return new NextTargets.Target(new BigDecimal(load), reps);
    }
}
