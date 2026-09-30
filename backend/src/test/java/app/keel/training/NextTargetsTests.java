package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.BodyRegion;
import app.keel.engine.LiftKind;
import app.keel.engine.LiftSession;
import app.keel.engine.Progression;
import app.keel.engine.ProgressionStep;
import app.keel.engine.Reason;
import app.keel.engine.RepRange;
import app.keel.engine.RuleId;
import app.keel.engine.SetResult;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * The next session's load and reps after a workout (K-217, K-109 double progression): what the engine's step means on
 * the program, and the session it is read from — the work sets at the day's top load.
 */
class NextTargetsTests {

    private static final RepRange SIX_TO_TEN = new RepRange(6, 10);
    private static final LiftSession BENCH = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, new BigDecimal("80"),
            List.of(new SetResult(8, 2), new SetResult(7, 1), new SetResult(7, 1)), true);

    @Test
    void anAddedLoadStartsAgainFromTheBottomOfTheRange() {
        assertThat(NextTargets.after(BENCH, step(new ProgressionStep.AddLoad(new BigDecimal("82.5"), 6)), false, 1))
                .contains(new NextTargets.Target(new BigDecimal("82.5"), 6));
    }

    @Test
    void whileTheLoadIsHeldTheTopOfTheRangeIsTheTarget() {
        // First rung of the deload ladder (K-110): no load added; the reps stay at the top.
        assertThat(NextTargets.after(BENCH, step(new ProgressionStep.AddLoad(new BigDecimal("82.5"), 6)), true, 1))
                .contains(new NextTargets.Target(new BigDecimal("80"), 10));
    }

    @Test
    void addingRepsAimsOneAboveTheWeakestSetWithinTheRange() {
        assertThat(NextTargets.after(BENCH, step(new ProgressionStep.AddReps()), false, 1)).contains(new NextTargets.Target(new BigDecimal("80"), 8));
        LiftSession nearTop = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, new BigDecimal("80"),
                List.of(new SetResult(10, 1), new SetResult(10, 0), new SetResult(9, 0)), true);
        assertThat(NextTargets.after(nearTop, step(new ProgressionStep.AddReps()), false, 1)).contains(new NextTargets.Target(new BigDecimal("80"), 10));
        // The engine adds load, not reps, once every set is at the top; the target still never leaves the range.
        LiftSession atTop = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, new BigDecimal("80"),
                List.of(new SetResult(10, 1), new SetResult(10, 0)), true);
        assertThat(NextTargets.after(atTop, step(new ProgressionStep.AddReps()), false, 1)).contains(new NextTargets.Target(new BigDecimal("80"), 10));
    }

    @Test
    void aHeldSessionIsRepeatedAndAnUntrackedLiftHasNoTarget() {
        // Unclean form (G6 K-31): the same again, never under the range. Isolation lifts are not load-tracked (G6 K-33).
        LiftSession short_ = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, new BigDecimal("80"),
                List.of(new SetResult(5, 0)), false);
        assertThat(NextTargets.after(BENCH, step(new ProgressionStep.Hold()), false, 1)).contains(new NextTargets.Target(new BigDecimal("80"), 7));
        assertThat(NextTargets.after(short_, step(new ProgressionStep.Hold()), false, 1)).contains(new NextTargets.Target(new BigDecimal("80"), 6));
        assertThat(NextTargets.after(BENCH, step(new ProgressionStep.NotTracked()), false, 1)).isEmpty();
    }

    @Test
    void fewerSetsAtTheTopLoadThanPlannedAddNoLoad() {
        // Planned 3 sets; the third dropped to a lighter load: two at the top are not "every set" (K-217 review).
        LiftSession twoOfThree = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, new BigDecimal("60"),
                List.of(new SetResult(10, 1), new SetResult(10, 1)), true);

        assertThat(NextTargets.after(twoOfThree, step(new ProgressionStep.AddLoad(new BigDecimal("62.5"), 6)), false, 3))
                .contains(new NextTargets.Target(new BigDecimal("60"), 10));
        assertThat(NextTargets.after(twoOfThree, step(new ProgressionStep.AddLoad(new BigDecimal("62.5"), 6)), false, 2)).as("a lighter week of two")
                .contains(new NextTargets.Target(new BigDecimal("62.5"), 6));
    }

    @Test
    void aHoldBegunAfterTheTargetWasSetStillHoldsIt() {
        // The target is kept as the engine gave it; the hold is read when the program is shown (K-217 review: a hold
        // begun at Monday's check-in must cover the session Sunday's workout set up).
        NextTargets.Target added = new NextTargets.Target(new BigDecimal("62.5"), 6);

        assertThat(NextTargets.shown(added, new BigDecimal("60"), SIX_TO_TEN, true)).isEqualTo(new NextTargets.Target(new BigDecimal("60"), 10));
        assertThat(NextTargets.shown(added, new BigDecimal("60"), SIX_TO_TEN, false)).isEqualTo(added);
        NextTargets.Target reps = new NextTargets.Target(new BigDecimal("60"), 8);
        assertThat(NextTargets.shown(reps, new BigDecimal("60"), SIX_TO_TEN, true)).as("no load added: nothing to hold").isEqualTo(reps);
    }

    @Test
    void aOneSidedMoveFollowsItsWeakerSide() {
        // Each side is its own set (SetRules); the side that did less decides, so the other never jumps past it.
        assertThat(NextTargets.weaker(List.of(new NextTargets.Target(new BigDecimal("22.5"), 8), new NextTargets.Target(new BigDecimal("17.5"), 11))))
                .contains(new NextTargets.Target(new BigDecimal("17.5"), 11));
        assertThat(NextTargets.weaker(List.of(new NextTargets.Target(new BigDecimal("20"), 10), new NextTargets.Target(new BigDecimal("20"), 9))))
                .contains(new NextTargets.Target(new BigDecimal("20"), 9));
        assertThat(NextTargets.weaker(List.of())).isEmpty();
    }

    @Test
    void theSessionIsTheWorkSetsAtTheDaysTopLoad() {
        // Two sets at 80, a back-off at 70: the top load and its sets; a set without RIR reads as the planned RIR.
        List<TrainingLog.WorkSet> sets = List.of(set("80", 8, 2), set("80", 7, null), set("70", 10, 3));

        assertThat(NextTargets.session(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, sets, 1, true)).contains(new LiftSession(LiftKind.COMPOUND,
                BodyRegion.UPPER, SIX_TO_TEN, new BigDecimal("80"), List.of(new SetResult(8, 2), new SetResult(7, 1)), true));
        assertThat(NextTargets.session(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, List.of(set("0", 12, 1)), 1, true))
                .as("no load to progress: a bodyweight move without added load").isEmpty();
        assertThat(NextTargets.session(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, List.of(), 1, true)).isEmpty();
    }

    private static Progression step(ProgressionStep step) {
        return new Progression(step, List.of(new Reason(new RuleId("double_progression"), new Source("arastirma/ham/H3-bosluk-literatur.md#B4",
                SourceTag.LITERATURE))));
    }

    private static TrainingLog.WorkSet set(String kg, int reps, Integer rir) {
        return new TrainingLog.WorkSet("bench_press", Instant.parse("2026-10-05T18:00:00Z"), ExerciseCatalog.Load.EXTERNAL, new BigDecimal(kg), reps,
                rir, null);
    }
}
