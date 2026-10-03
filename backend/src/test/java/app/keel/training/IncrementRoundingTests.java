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
 * A nearest load too far over the last (K-430) is taken once every set at the last is worth the bottom of the range
 * there at the planned RIR (Epley, ADR-041 #55); until then, one more rep.
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
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, 1, rounded(new LoadSteps.Rounding.To(new BigDecimal("22"))), P))
                .contains(new NextTargets.Target(new BigDecimal("22"), 8));
    }

    @Test
    void nothingHeavierInTheGymTurnsTheStepIntoOneMoreRepPastTheRange() {
        // The card's "mümkün değilse tekrar artışına çevrilir": the weakest set (12) plus one, above the range's 12.
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, 1, rounded(new LoadSteps.Rounding.NoHeavier()), P))
                .contains(new NextTargets.Target(new BigDecimal("20"), 13));
    }

    @Test
    void aGymThatSaysNothingKeepsTheEnginesStep() {
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, 1, rounded(new LoadSteps.Rounding.Unknown()), P))
                .contains(new NextTargets.Target(new BigDecimal("22.5"), 8));
    }

    @Test
    void aHeldLoadOrMissingSetsAreNotRounded() {
        // No load is added at all: the deload ladder holds it (K-110), or fewer than the planned sets were done (K-217).
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, true, 3, 1, rounded(new LoadSteps.Rounding.To(new BigDecimal("22"))), P))
                .contains(new NextTargets.Target(new BigDecimal("20"), 12));
        assertThat(NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 4, 1, rounded(new LoadSteps.Rounding.NoHeavier()), P))
                .contains(new NextTargets.Target(new BigDecimal("20"), 12));
    }

    @Test
    void theRepPastTheRangeIsHeldLikeAnAddedLoadWhileTheDeloadLadderHoldsTheLoad() {
        // The extra rep stands in for the load the gym cannot add (K-414): a hold (K-110 first rung) holds it too — the
        // top of the range, as for any added load (K-217).
        NextTargets.Target noHeavier = NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, 1, rounded(new LoadSteps.Rounding.NoHeavier()), P).orElseThrow();
        assertThat(NextTargets.shown(noHeavier, new BigDecimal("20"), EIGHT_TO_TWELVE, true)).isEqualTo(new NextTargets.Target(new BigDecimal("20"), 12));
        assertThat(NextTargets.shown(noHeavier, new BigDecimal("20"), EIGHT_TO_TWELVE, false)).isEqualTo(noHeavier);
    }

    @Test
    void theRoundingIsAskedAboutTheEnginesLoad() {
        List<BigDecimal> asked = new java.util.ArrayList<>();
        NextTargets.after(ROW_AT_TOP, ADD_LOAD, false, 3, 1, target -> {
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
        // ADR-041 #55: 35 × 16 at RIR 1 is worth 9 to failure at 42 (Epley) — 8 at the planned RIR 1, the bottom of 8-12:
        // the jump, from the bottom.
        assertThat(NextTargets.after(lat(16, 16, 16), ADD_TO_37_5, false, 3, 1, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("42"), 8));
    }

    @Test
    void aLoadTooFarIsNotTakenWhileOneSetIsWorthLessAndTheRepsGoOnUp() {
        // 35 × 15 is worth 8 to failure at 42, 7 at RIR 1: one more rep than the weakest set instead, as when the gym has
        // nothing heavier.
        assertThat(NextTargets.after(lat(15, 15, 15), ADD_TO_37_5, false, 3, 1, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("35"), 16));
        // The weakest set decides, as for any added load: two at 16, one at 15.
        assertThat(NextTargets.after(lat(16, 15, 16), ADD_TO_37_5, false, 3, 1, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("35"), 16));
        // The K-414 machine at the top of the range: 35 × 12 is worth 5 to failure at 42 → 35 × 13 (ADR-041 #55, K1 approved).
        assertThat(NextTargets.after(lat(12, 12, 12), ADD_TO_37_5, false, 3, 1, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("35"), 13));
    }

    @Test
    void moreInReserveIsWorthMoreAndTheJumpIsDoneAtThePlannedRir() {
        // The jump is the bottom of the range at the planned RIR (1): 9 to failure at 42 (K-430 review — not each set's
        // own RIR, which made a set left further from failure count for less). 15 at RIR 2 is 17 to failure → 9: the jump.
        LiftSession inReserve = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, EIGHT_TO_TWELVE, new BigDecimal("35"),
                List.of(new SetResult(15, 2), new SetResult(15, 2), new SetResult(15, 2)), true);
        assertThat(NextTargets.after(inReserve, ADD_TO_37_5, false, 3, 1, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("42"), 8));
        // 16 at RIR 0 is 16 to failure → 8 at 42, one short of 8 reps at RIR 1: the reps go on up.
        LiftSession toFailure = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, EIGHT_TO_TWELVE, new BigDecimal("35"),
                List.of(new SetResult(16, 0), new SetResult(16, 0), new SetResult(16, 0)), true);
        assertThat(NextTargets.after(toFailure, ADD_TO_37_5, false, 3, 1, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("35"), 17));
        // The same sets with a plan at RIR 0: 8 to failure is 8 reps — the jump.
        assertThat(NextTargets.after(toFailure, ADD_TO_37_5, false, 3, 0, rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P))
                .contains(new NextTargets.Target(new BigDecimal("42"), 8));
    }

    /** Dumbbells to 10 kg, then 20 (ADR-045 #73): Epley would ask ~47 reps at 10 before the jump. */
    private static LiftSession press(int... reps) {
        return new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, EIGHT_TO_TWELVE, new BigDecimal("10"),
                java.util.Arrays.stream(reps).mapToObj(r -> new SetResult(r, 1)).toList(), true);
    }

    private static final Progression ADD_TO_12_5 = new Progression(new ProgressionStep.AddLoad(new BigDecimal("12.5"), 8), ADD_LOAD.reasons());

    /** The ceiling on 8-12 (K-534): the range's top and rep_ceiling_above_range over it. */
    private static final int CEILING = 12 + P.wholeNumber(app.keel.engine.ParameterKey.REP_CEILING_ABOVE_RANGE);

    @Test
    void onASparseRackTheRepsStopAtTheCeiling() {
        // K-534: one more rep up to the ceiling, then the target stays there — the weakest set decides, as before.
        Function<BigDecimal, LoadSteps.Rounding> sparse = rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("20")));
        // At the ceiling the target says the rack ends (the phone's note); one under it, not yet.
        assertThat(NextTargets.after(press(CEILING - 2, CEILING - 2, CEILING - 2), ADD_TO_12_5, false, 3, 1, sparse, P))
                .contains(new NextTargets.Target(new BigDecimal("10"), CEILING - 1));
        assertThat(NextTargets.after(press(CEILING - 1, CEILING - 1, CEILING - 1), ADD_TO_12_5, false, 3, 1, sparse, P))
                .contains(new NextTargets.Target(new BigDecimal("10"), CEILING, true));
        assertThat(NextTargets.after(press(CEILING, CEILING, CEILING), ADD_TO_12_5, false, 3, 1, sparse, P))
                .contains(new NextTargets.Target(new BigDecimal("10"), CEILING, true));
        assertThat(NextTargets.after(press(CEILING + 4, CEILING + 3, CEILING + 6), ADD_TO_12_5, false, 3, 1, sparse, P))
                .contains(new NextTargets.Target(new BigDecimal("10"), CEILING, true));
    }

    @Test
    void withNothingHeavierTheRepsStopAtTheCeilingToo() {
        assertThat(NextTargets.after(press(CEILING, CEILING, CEILING), ADD_TO_12_5, false, 3, 1, rounded(new LoadSteps.Rounding.NoHeavier()), P))
                .contains(new NextTargets.Target(new BigDecimal("10"), CEILING, true));
    }

    @Test
    void aLoadTooFarThatSetsAtTheCeilingWouldReachIsNotTheRackEnding() {
        // K-534 review: 35 × 16 at RIR 0 is one rep short of 42 (moreInReserve… above); at the ceiling, 17 at RIR 1 would be
        // worth it — the jump is in reach, the rack has not ended. 10 kg with 20 next is out of reach at any ceiling rep.
        assertThat(NextTargets.after(new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, EIGHT_TO_TWELVE, new BigDecimal("35"),
                List.of(new SetResult(CEILING - 1, 0), new SetResult(CEILING - 1, 0), new SetResult(CEILING - 1, 0)), true), ADD_TO_37_5, false, 3, 1,
                rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P)).map(NextTargets.Target::rackEnds).contains(false);
        // The reach is read at the planned RIR, as the jump is: at RIR 3, 17 reps are 20 to failure — 11 at 42, the 8 + 3 asked.
        assertThat(NextTargets.after(new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, EIGHT_TO_TWELVE, new BigDecimal("35"),
                List.of(new SetResult(CEILING - 1, 3), new SetResult(CEILING - 1, 3), new SetResult(CEILING - 1, 3)), true), ADD_TO_37_5, false, 3, 3,
                rounded(new LoadSteps.Rounding.TooFar(new BigDecimal("42"))), P)).contains(new NextTargets.Target(new BigDecimal("35"), CEILING));
    }

    @Test
    void aSessionHeldForFormPastTheCeilingIsNotTheRackEnding() {
        // K-534 review: unclean form holds at any rep count (G6 K-31); that is not the rack running out.
        Progression held = new Progression(new ProgressionStep.Hold(), ADD_LOAD.reasons());
        assertThat(NextTargets.after(press(CEILING + 1, CEILING + 1, CEILING + 1), held, false, 3, 1, rounded(new LoadSteps.Rounding.NoHeavier()), P))
                .contains(new NextTargets.Target(new BigDecimal("10"), CEILING + 1));
    }

    @Test
    void aTargetAtTheCeilingShownUnderTheDeloadHoldIsTheTopOfTheRangeWithNoWordOfTheRack() {
        NextTargets.Target atCeiling = new NextTargets.Target(new BigDecimal("10"), CEILING, true);
        assertThat(NextTargets.shown(atCeiling, new BigDecimal("10"), EIGHT_TO_TWELVE, true)).isEqualTo(new NextTargets.Target(new BigDecimal("10"), 12));
        assertThat(NextTargets.shown(atCeiling, new BigDecimal("10"), EIGHT_TO_TWELVE, false)).isEqualTo(atCeiling);
    }

    @Test
    void aRackUpdatedWithALoadBetweenBringsTheJumpBack() {
        // K-534: the user adds the 12 kg pair; the next session at the ceiling jumps to it, from the bottom of the range.
        assertThat(NextTargets.after(press(CEILING, CEILING, CEILING), ADD_TO_12_5, false, 3, 1, rounded(new LoadSteps.Rounding.To(new BigDecimal("12"))), P))
                .contains(new NextTargets.Target(new BigDecimal("12"), 8));
    }
}
