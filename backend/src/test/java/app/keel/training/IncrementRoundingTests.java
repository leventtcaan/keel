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
import java.util.List;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

/**
 * The engine's added load as the gym can make it (K-414, L3 Y7, ADR-032): rounded to the nearest load the gym has,
 * turned into one more rep when the gym has nothing heavier, and the engine's step as it is when the gym says nothing.
 */
class IncrementRoundingTests {

    private static final RepRange EIGHT_TO_TWELVE = new RepRange(8, 12);
    /** Every planned set at the top of the range, one above it: the engine adds load. */
    private static final LiftSession ROW_AT_TOP = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, EIGHT_TO_TWELVE, new BigDecimal("20"),
            List.of(new SetResult(13, 1), new SetResult(12, 1), new SetResult(12, 0)), true);
    private static final Progression ADD_LOAD = new Progression(new ProgressionStep.AddLoad(new BigDecimal("22.5"), 8),
            List.of(new Reason(new RuleId("double_progression"), new Source("arastirma/ham/H3-bosluk-literatur.md#B4", SourceTag.LITERATURE))));

    @Test
    void anAddedLoadIsTheNearestTheGymCanMakeFromTheBottomOfTheRange() {
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, rounded(new LoadSteps.Rounding.To(new BigDecimal("22")))))
                .contains(new NextTargets.Target(new BigDecimal("22"), 8));
    }

    @Test
    void nothingHeavierInTheGymTurnsTheStepIntoOneMoreRepPastTheRange() {
        // The card's "mümkün değilse tekrar artışına çevrilir": the weakest set (12) plus one, above the range's 12.
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, rounded(new LoadSteps.Rounding.NoHeavier())))
                .contains(new NextTargets.Target(new BigDecimal("20"), 13));
    }

    @Test
    void aGymThatSaysNothingKeepsTheEnginesStep() {
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, rounded(new LoadSteps.Rounding.Unknown())))
                .contains(new NextTargets.Target(new BigDecimal("22.5"), 8));
    }

    @Test
    void aHeldLoadOrMissingSetsAreNotRounded() {
        // No load is added at all: the deload ladder holds it (K-110), or fewer than the planned sets were done (K-217).
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, true, 3, rounded(new LoadSteps.Rounding.To(new BigDecimal("22")))))
                .contains(new NextTargets.Target(new BigDecimal("20"), 12));
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 4, rounded(new LoadSteps.Rounding.NoHeavier())))
                .contains(new NextTargets.Target(new BigDecimal("20"), 12));
    }

    @Test
    void theRepPastTheRangeIsHeldLikeAnAddedLoadWhileTheDeloadLadderHoldsTheLoad() {
        // The extra rep stands in for the load the gym cannot add (K-414): a hold (K-110 first rung) holds it too — the
        // top of the range, as for any added load (K-217).
        NextTargets.Target noHeavier = NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, rounded(new LoadSteps.Rounding.NoHeavier())).orElseThrow();
        assertThat(NextTargets.shown(noHeavier, new BigDecimal("20"), EIGHT_TO_TWELVE, true)).isEqualTo(new NextTargets.Target(new BigDecimal("20"), 12));
        assertThat(NextTargets.shown(noHeavier, new BigDecimal("20"), EIGHT_TO_TWELVE, false)).isEqualTo(noHeavier);
    }

    @Test
    void theRoundingIsAskedAboutTheEnginesLoad() {
        List<BigDecimal> asked = new java.util.ArrayList<>();
        NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, target -> {
            asked.add(target);
            return new LoadSteps.Rounding.Unknown();
        });
        assertThat(asked).containsExactly(new BigDecimal("22.5"));
    }

    private static Function<BigDecimal, LoadSteps.Rounding> rounded(LoadSteps.Rounding rounding) {
        return target -> rounding;
    }
}
