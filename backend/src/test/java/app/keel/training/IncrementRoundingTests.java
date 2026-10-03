package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.BodyRegion;
import app.keel.engine.LiftKind;
import app.keel.engine.LiftSession;
import app.keel.engine.Progression;
import app.keel.engine.ProgressionStep;
import app.keel.engine.Parameters;
import app.keel.engine.Reason;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.RepRange;
import app.keel.engine.RuleId;
import app.keel.engine.SetResult;
import app.keel.engine.Sex;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import java.math.BigDecimal;
import java.util.List;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

/**
 * The engine's added load as the gym can make it (K-414, L3 Y7, ADR-032): rounded to the nearest load the gym has,
 * turned into one more rep when the gym has nothing heavier, and the engine's step as it is when the gym says nothing.
 * A nearest load too far over the last (K-430) is taken once the sets at the last are worth the bottom of the range
 * there (Epley, ADR-041 #55); until then, one more rep.
 */
class IncrementRoundingTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final RepRange EIGHT_TO_TWELVE = new RepRange(8, 12);
    /** Every planned set at the top of the range, one above it: the engine adds load. */
    private static final LiftSession ROW_AT_TOP = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, EIGHT_TO_TWELVE, new BigDecimal("20"),
            List.of(new SetResult(13, 1), new SetResult(12, 1), new SetResult(12, 0)), true);
    private static final Progression ADD_LOAD = new Progression(new ProgressionStep.AddLoad(new BigDecimal("22.5"), 8),
            List.of(new Reason(new RuleId("double_progression"), new Source("arastirma/ham/H3-bosluk-literatur.md#B4", SourceTag.LITERATURE))));

    @Test
    void anAddedLoadIsTheNearestTheGymCanMakeFromTheBottomOfTheRange() {
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, rounded(new LoadSteps.Rounding.To(new BigDecimal("22"))), P))
                .contains(new NextTargets.Target(new BigDecimal("22"), 8));
    }

    @Test
    void nothingHeavierInTheGymTurnsTheStepIntoOneMoreRepPastTheRange() {
        // The card's "mümkün değilse tekrar artışına çevrilir": the weakest set (12) plus one, above the range's 12.
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, rounded(new LoadSteps.Rounding.NoHeavier()), P))
                .contains(new NextTargets.Target(new BigDecimal("20"), 13));
    }

    @Test
    void aGymThatSaysNothingKeepsTheEnginesStep() {
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, rounded(new LoadSteps.Rounding.Unknown()), P))
                .contains(new NextTargets.Target(new BigDecimal("22.5"), 8));
    }

    @Test
    void aHeldLoadOrMissingSetsAreNotRounded() {
        // No load is added at all: the deload ladder holds it (K-110), or fewer than the planned sets were done (K-217).
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, true, 3, rounded(new LoadSteps.Rounding.To(new BigDecimal("22"))), P))
                .contains(new NextTargets.Target(new BigDecimal("20"), 12));
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 4, rounded(new LoadSteps.Rounding.NoHeavier()), P))
                .contains(new NextTargets.Target(new BigDecimal("20"), 12));
    }

    @Test
    void theRepPastTheRangeIsHeldLikeAnAddedLoadWhileTheDeloadLadderHoldsTheLoad() {
        // The extra rep stands in for the load the gym cannot add (K-414): a hold (K-110 first rung) holds it too — the
        // top of the range, as for any added load (K-217).
        NextTargets.Target noHeavier = NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, rounded(new LoadSteps.Rounding.NoHeavier()), P).orElseThrow();
        assertThat(NextTargets.shown(noHeavier, new BigDecimal("20"), EIGHT_TO_TWELVE, true)).isEqualTo(new NextTargets.Target(new BigDecimal("20"), 12));
        assertThat(NextTargets.shown(noHeavier, new BigDecimal("20"), EIGHT_TO_TWELVE, false)).isEqualTo(noHeavier);
    }

    @Test
    void theRoundingIsAskedAboutTheEnginesLoad() {
        List<BigDecimal> asked = new java.util.ArrayList<>();
        NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, target -> {
            asked.add(target);
            return new LoadSteps.Rounding.Unknown();
        }, P);
        assertThat(asked).containsExactly(new BigDecimal("22.5"));
    }

    private static Function<BigDecimal, LoadSteps.Rounding> rounded(LoadSteps.Rounding rounding) {
        return target -> rounding;
    }

    /** A machine of 7 kg steps, the engine's +2.5 over 35: the next load it makes is 42, past two steps (K-430). */
    private static LiftSession lat(int... reps) {
        return new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, EIGHT_TO_TWELVE, new BigDecimal("35"),
                java.util.Arrays.stream(reps).mapToObj(r -> new SetResult(r, 1)).toList(), true);
    }

    private static final Progression ADD_TO_37_5 = new Progression(new ProgressionStep.AddLoad(new BigDecimal("37.5"), 8), ADD_LOAD.reasons());

    @Test
    void aLoadTooFarIsTakenOnceEverySetIsWorthTheBottomOfTheRangeThere() {
        // ADR-041 #55: 35 × 16 at RIR 1 is worth 8 at 42 (Epley) — the bottom of 8-12: the jump, from the bottom.
        assertThat(NextTargets.after(lat(16, 16, 16), ADD_TO_37_5, false, 3, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("42"), 8));
    }

    @Test
    void aLoadTooFarIsNotTakenWhileOneSetIsWorthLessAndTheRepsGoOnUp() {
        // 35 × 15 is worth 7 at 42: one more rep than the weakest set instead, as when the gym has nothing heavier.
        assertThat(NextTargets.after(lat(15, 15, 15), ADD_TO_37_5, false, 3, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("35"), 16));
        // The weakest set decides, as for any added load: two at 16, one at 15.
        assertThat(NextTargets.after(lat(16, 15, 16), ADD_TO_37_5, false, 3, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("35"), 16));
        // The K-414 machine at the top of the range: 35 × 12 is worth 4 at 42 → 35 × 13 (ADR-041 #55, K1 approved).
        assertThat(NextTargets.after(lat(12, 12, 12), ADD_TO_37_5, false, 3, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("35"), 13));
    }

    @Test
    void theDistanceFromFailureIsEachSetsOwn() {
        // Each set is carried to the heavier load at its own RIR: 16 at RIR 0 is 16 to failure, 35 × 46 / 42 → 8 there,
        // so 8 at RIR 0 — worth the bottom of the range like the two at RIR 1.
        LiftSession atZero = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, EIGHT_TO_TWELVE, new BigDecimal("35"),
                List.of(new SetResult(16, 1), new SetResult(16, 0), new SetResult(16, 1)), true);
        assertThat(NextTargets.after(atZero, ADD_TO_37_5, false, 3, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("42"), 8));
        // 15 at RIR 0 is 15 to failure: 35 × 45 / 42 → 7, so 7 at RIR 0 — under the 8: the reps go on up.
        LiftSession shortAtZero = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, EIGHT_TO_TWELVE, new BigDecimal("35"),
                List.of(new SetResult(16, 1), new SetResult(15, 0), new SetResult(16, 1)), true);
        assertThat(NextTargets.after(shortAtZero, ADD_TO_37_5, false, 3, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("35"), 16));
    }
}
