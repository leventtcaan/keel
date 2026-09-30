package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static app.keel.engine.EngineFixtures.weighIn;
import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.CheckIn.Look;
import app.keel.engine.CheckIn.Recovery;
import app.keel.engine.CheckIn.Training;
import app.keel.engine.CheckIn.Waist;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.junit.jupiter.api.Test;

/**
 * Güray's weekly tree (03 §2.4, "the algorithm", 2024-08-19): is weight moving toward the goal? No → adherence,
 * training, then calories (the amount is K-107's). Yes → looks better → change nothing; looks worse → training →
 * recovery → genetic limit, pull calories back (both directions, ADR-020 L-5). One flat check-in is not a plateau
 * (G2 K-64). Adherence is the consistency ratio (ADR-020 L-6); between 50 and 70 % calories are not touched (L-9).
 */
class WeeklySpineTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final Parameters MALE = parameters(Sex.MALE);
    private static final Parameters FEMALE = parameters(Sex.FEMALE);
    private static final CheckIn ON_PLAN = CheckIn.NONE.withAdherence(new BigDecimal("0.9")).withTraining(Training.STABLE);

    private static final Source SPINE = new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE);

    // ── moving toward the goal ──────────────────────────────────────────────────────────────────────────────

    @Test
    void towardTheGoalAndLookingBetterChangesNothing() {
        // Spec WC-03: cut, 80.0 → 79.0 kg over the window, looks better.
        SpineResult result = spine(Sex.MALE, Phase.CUT, ON_PLAN.withLook(Look.BETTER), "80.0", "79.5", "79.0");

        assertThat(decided(result).action()).isEqualTo(new Action.Continue());
        assertThat(decided(result).reasons()).containsExactly(new Reason(new RuleId("toward_goal"), SPINE));
        assertThat(decided(result).copyKey()).isEqualTo(new CopyKey("decision.continue.toward_goal"));
    }

    @Test
    void lookingTheSameOrNotYetPhotographedAlsoChangesNothing() {
        // "Worse" is what opens the rest of the tree; the same look or no photo this week does not.
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN.withLook(Look.SAME), "80.0", "79.5", "79.0")).action())
                .isEqualTo(new Action.Continue());
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN, "80.0", "79.5", "79.0")).action())
                .isEqualTo(new Action.Continue());
    }

    @Test
    void towardTheGoalButLookingWorseWithTrainingDecliningFixesTrainingFirst() {
        // Spec WC-05: bulk gaining, looks worse, loads going backwards → training first, no calorie decision.
        SpineResult result = spine(Sex.MALE, Phase.BULK,
                ON_PLAN.withLook(Look.WORSE).withTraining(Training.DECLINING), "70.0", "70.5", "71.0");

        assertThat(decided(result).action()).isEqualTo(new Action.FixTraining());
        assertThat(decided(result).reasons().getFirst().rule()).isEqualTo(new RuleId("training_first"));
    }

    @Test
    void trainingFineButRecoveryPoorFixesRecovery() {
        // Spec WC-06.
        SpineResult result = spine(Sex.MALE, Phase.BULK,
                ON_PLAN.withLook(Look.WORSE).withRecovery(Recovery.POOR), "70.0", "70.5", "71.0");

        assertThat(decided(result).action()).isEqualTo(new Action.FixRecovery());
        assertThat(decided(result).reasons().getFirst().rule()).isEqualTo(new RuleId("recovery_poor"));
    }

    @Test
    void everythingFineButLookingWorseOnABulkPullsTheSurplusBack() {
        // Spec WC-07: genetic limit on a bulk → fewer calories.
        SpineResult result = spine(Sex.MALE, Phase.BULK,
                ON_PLAN.withLook(Look.WORSE).withRecovery(Recovery.GOOD), "70.0", "70.5", "71.0");

        assertThat(result).isEqualTo(new SpineResult.CaloriesNeeded(CalorieDirection.DOWN,
                List.of(new Reason(new RuleId("genetic_limit"), SPINE))));
    }

    @Test
    void everythingFineButLookingWorseOnACutNarrowsTheDeficit() {
        // ADR-020 L-5, spec WC-24: the tree's "pull calories back" runs both ways — on a cut, less deficit.
        SpineResult result = spine(Sex.MALE, Phase.CUT,
                ON_PLAN.withLook(Look.WORSE).withRecovery(Recovery.GOOD), "80.0", "79.5", "79.0");

        assertThat(result).isEqualTo(new SpineResult.CaloriesNeeded(CalorieDirection.UP,
                List.of(new Reason(new RuleId("genetic_limit"), SPINE))));
    }

    @Test
    void theGeneticLimitNeedsThePlanFollowedBeforeCaloriesMove() {
        // G2 K-60: the calorie side is looked at only from 70 % of the plan on — on every branch, not only the flat one.
        CheckIn worseButFine = ON_PLAN.withLook(Look.WORSE).withRecovery(Recovery.GOOD);

        assertThat(decided(spine(Sex.MALE, Phase.CUT, worseButFine.withAdherence(new BigDecimal("0.3")), "80.0", "79.5", "79.0"))
                .reasons().getFirst().rule()).isEqualTo(new RuleId("adherence_low"));
        assertThat(decided(spine(Sex.MALE, Phase.BULK, worseButFine.withAdherence(new BigDecimal("0.6")), "70.0", "70.5", "71.0"))
                .reasons().getFirst().rule()).isEqualTo(new RuleId("adherence_partial"));
        CheckIn noAdherence = new CheckIn(Look.WORSE, Training.STABLE, Recovery.GOOD, Waist.UNKNOWN, java.util.Optional.empty());
        assertThat(decided(spine(Sex.MALE, Phase.CUT, noAdherence, "80.0", "79.5", "79.0")))
                .satisfies(d -> isCheckInNeeded(d, "adherence"));
    }

    @Test
    void nothingAnsweredAndMovingTowardTheGoalStillContinues() {
        // Signals are asked only when the branch needs them: the scale alone says "keep going".
        assertThat(decided(spine(Sex.MALE, Phase.CUT, CheckIn.NONE, "80.0", "79.5", "79.0")).action())
                .isEqualTo(new Action.Continue());
    }

    @Test
    void improvingTrainingIsNeverTreatedAsDeclining() {
        CheckIn improving = ON_PLAN.withTraining(Training.IMPROVING);

        assertThat(spine(Sex.MALE, Phase.CUT, improving, "80.0", "80.0", "80.0"))
                .isEqualTo(spine(Sex.MALE, Phase.CUT, ON_PLAN, "80.0", "80.0", "80.0"));
        assertThat(spine(Sex.MALE, Phase.BULK, improving.withLook(Look.WORSE).withRecovery(Recovery.GOOD), "70.0", "70.5", "71.0"))
                .isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void aWeekIsTheMeanOfItsOwnWeighInsHoweverManyThereAre() {
        // min_weighins_per_week is 4: a week of four mornings must average over four, not seven.
        LocalDate first = TODAY.minusDays(20);
        List<WeighIn> weighIns = new ArrayList<>();
        for (int day : new int[] {0, 2, 4, 6}) {
            weighIns.add(weighIn(first.plusDays(day), "80.0"));
        }
        weighIns.addAll(daily(first.plusDays(7), first.plusDays(13), "79.7"));
        weighIns.addAll(daily(first.plusDays(14), TODAY, "79.3"));
        Snapshot fourMornings = new Snapshot(TODAY, Sex.MALE, Phase.CUT, first, series(weighIns)).withCheckIn(ON_PLAN);

        assertThat(decided(WeeklySpine.evaluate(fourMornings, MALE)).action()).isEqualTo(new Action.Continue());

        // Uneven mornings in the first week average 79.85: 0.5 kg over the window is inside the margin, in two steps of
        // 0.25 — a plateau (ADR-027 #0: both under the per-week 0.29). Averaged over seven days it would not be.
        List<WeighIn> uneven = new ArrayList<>(List.of(weighIn(first, "80.6"), weighIn(first.plusDays(2), "79.6"),
                weighIn(first.plusDays(4), "79.6"), weighIn(first.plusDays(6), "79.6")));
        uneven.addAll(daily(first.plusDays(7), first.plusDays(13), "79.6"));
        uneven.addAll(daily(first.plusDays(14), TODAY, "79.35"));
        Snapshot unevenWeek = new Snapshot(TODAY, Sex.MALE, Phase.CUT, first, series(uneven)).withCheckIn(ON_PLAN);

        assertThat(WeeklySpine.evaluate(unevenWeek, MALE)).isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void aRisingWaistDoesNotStopABulkFromWaiting() {
        assertThat(decided(spine(Sex.MALE, Phase.BULK, ON_PLAN.withWaist(Waist.UP), "70.4", "69.7", "70.4")).action())
                .isEqualTo(new Action.NoDecisionYet());
    }

    @Test
    void theWaitLengthsFollowTheirOwnParameters() {
        // Retuning one phase's wait must not move the other's (flat_wait_weeks for the cut, bulk_stall_weeks for the bulk).
        Parameters longerBulkWait = withValue("nutrition.yaml", "bulk_stall_weeks", 3);
        Parameters longerCutWait = withValue("windows.yaml", "flat_wait_weeks", 2);

        assertThat(WeeklySpine.evaluate(snapshot(Sex.MALE, Phase.BULK, ON_PLAN, "70.0", "70.0", "70.0"), longerBulkWait))
                .isInstanceOf(SpineResult.Decided.class);
        assertThat(WeeklySpine.evaluate(snapshot(Sex.MALE, Phase.CUT, ON_PLAN, "80.0", "80.0", "80.0"), longerBulkWait))
                .isInstanceOf(SpineResult.CaloriesNeeded.class);
        assertThat(WeeklySpine.evaluate(snapshot(Sex.MALE, Phase.CUT, ON_PLAN, "80.0", "80.0", "80.0"), longerCutWait))
                .isInstanceOf(SpineResult.Decided.class);
        assertThat(WeeklySpine.evaluate(snapshot(Sex.MALE, Phase.BULK, ON_PLAN, "70.0", "70.0", "70.0"), longerCutWait))
                .isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void aCheckInsAdherenceIsAShareBetweenNoneAndAll() {
        assertThat(CheckIn.NONE.withAdherence(BigDecimal.ZERO).adherence()).contains(BigDecimal.ZERO);
        assertThat(CheckIn.NONE.withAdherence(BigDecimal.ONE).adherence()).contains(BigDecimal.ONE);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> CheckIn.NONE.withAdherence(new BigDecimal("-0.01")))
                .isInstanceOf(IllegalArgumentException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> CheckIn.NONE.withAdherence(new BigDecimal("1.01")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aBranchThatNeedsAnUnansweredSignalAsksInsteadOfGuessing() {
        // U3: looking worse, and training or recovery unknown → no decision yet, ask.
        CheckIn worse = ON_PLAN.withLook(Look.WORSE);

        assertThat(decided(spine(Sex.MALE, Phase.CUT, worse.withTraining(Training.UNKNOWN), "80.0", "79.5", "79.0")))
                .satisfies(d -> isCheckInNeeded(d, "training"));
        assertThat(decided(spine(Sex.MALE, Phase.CUT, worse, "80.0", "79.5", "79.0")))
                .satisfies(d -> isCheckInNeeded(d, "recovery"));
    }

    // ── not moving toward the goal ──────────────────────────────────────────────────────────────────────────

    @Test
    void flatForTheWholeWindowOnPlanLowersCaloriesOnACut() {
        // Spec WC-04: the plan's first full window, weight flat, 90 % of the plan done, training stable.
        SpineResult result = spine(Sex.MALE, Phase.CUT, ON_PLAN, "80.0", "80.0", "80.0");

        assertThat(result).isEqualTo(new SpineResult.CaloriesNeeded(CalorieDirection.DOWN, List.of(
                new Reason(new RuleId("not_toward_goal"), SPINE),
                new Reason(new RuleId("stall_window"), new Source("arastirma/ham/H3-bosluk-literatur.md#B3", SourceTag.LITERATURE)))));
    }

    @Test
    void aBulkThatStoppedGainingRaisesCalories() {
        // Spec WC-14: bulk_stall_weeks of no gain → up (G3 K-10; the +250 kcal from carbs is K-107's).
        SpineResult result = spine(Sex.MALE, Phase.BULK, ON_PLAN, "70.0", "70.0", "70.0");

        assertThat(result).isEqualTo(new SpineResult.CaloriesNeeded(CalorieDirection.UP, List.of(
                new Reason(new RuleId("not_toward_goal"), SPINE),
                new Reason(new RuleId("bulk_stall"), new Source("arastirma/ham/guray/G3-kilo-alma-beslenme.md#K-10", SourceTag.EXPERIENCE)))));
    }

    @Test
    void movingTheWrongWayIsNotTowardTheGoalEither() {
        assertThat(spine(Sex.MALE, Phase.CUT, ON_PLAN, "80.0", "80.5", "81.0"))
                .isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void aChangeWithinTheNoiseMarginIsFlat() {
        // flat_margin_kg (0.58 kg, ADR-020 L-10): 0.58 kg down over the window is not movement over the window; 0.59 kg
        // is. Since ADR-027 #0 a flat window whose last step still lost 0.30 kg (≥ the per-week 0.29) is a slow loser
        // moving; two steps of 0.28 are the plateau that cuts.
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN, "80.58", "80.30", "80.00")).action()).isEqualTo(new Action.Continue());
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN, "80.59", "80.30", "80.00")).action())
                .isEqualTo(new Action.Continue());
        assertThat(spine(Sex.MALE, Phase.CUT, ON_PLAN, "80.56", "80.28", "80.00")).isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void aWomansWindowComparesWeeksFurtherApart() {
        // J1 D1: 28 days for women. The first and last of four weeks are compared.
        assertThat(decided(spine(Sex.FEMALE, Phase.CUT, ON_PLAN, "65.0", "65.0", "64.6", "64.3")).action())
                .isEqualTo(new Action.Continue());
        assertThat(spine(Sex.FEMALE, Phase.CUT, ON_PLAN, "65.0", "64.8", "64.9", "65.0"))
                .isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    // ── adherence (G2 K-60, ADR-020 L-6, L-9) ───────────────────────────────────────────────────────────────

    @Test
    void underHalfThePlanFixesAdherenceAndLeavesCaloriesAlone() {
        // Spec WC-09.
        SpineResult result = spine(Sex.MALE, Phase.CUT, ON_PLAN.withAdherence(new BigDecimal("0.45")), "80.0", "80.0", "80.0");

        assertThat(decided(result).action()).isEqualTo(new Action.FixAdherence());
        assertThat(decided(result).reasons()).containsExactly(new Reason(new RuleId("adherence_low"),
                new Source("arastirma/ham/guray/G2-kilo-verme.md#K-60", SourceTag.EXPERIENCE)));
    }

    @Test
    void betweenHalfAndSeventyPercentCaloriesStayAndTheToneIsSofter() {
        // ADR-020 L-9: 50 % is already "partial"; 70 % (on_track_min_ratio) is the first share that lets calories move.
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN.withAdherence(new BigDecimal("0.5")), "80.0", "80.0", "80.0"))
                .reasons().getFirst().rule()).isEqualTo(new RuleId("adherence_partial"));
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN.withAdherence(new BigDecimal("0.69")), "80.0", "80.0", "80.0"))
                .copyKey()).isEqualTo(new CopyKey("decision.fix_adherence.adherence_partial"));
        assertThat(spine(Sex.MALE, Phase.CUT, ON_PLAN.withAdherence(new BigDecimal("0.7")), "80.0", "80.0", "80.0"))
                .isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void withoutAnAdherenceFigureAFlatWeightAsks() {
        CheckIn noAdherence = new CheckIn(Look.UNKNOWN, Training.STABLE, Recovery.UNKNOWN, Waist.UNKNOWN, java.util.Optional.empty());

        assertThat(decided(spine(Sex.MALE, Phase.CUT, noAdherence, "80.0", "80.0", "80.0")))
                .satisfies(d -> isCheckInNeeded(d, "adherence"));
    }

    @Test
    void adherenceDoesNotMatterWhileWeightMovesTowardTheGoal() {
        // The tree asks about adherence only on the "not toward the goal" branch.
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN.withAdherence(new BigDecimal("0.3")), "80.0", "79.5", "79.0"))
                .action()).isEqualTo(new Action.Continue());
    }

    // ── training on the flat branch ─────────────────────────────────────────────────────────────────────────

    @Test
    void trainingFallingOnAFlatCutIsARedFlagNotACalorieCut() {
        // Spec WC-13, G7 K-98: the ladder's criterion is training, not the scale.
        SpineResult result = spine(Sex.MALE, Phase.CUT, ON_PLAN.withTraining(Training.DECLINING), "80.0", "80.0", "80.0");

        assertThat(decided(result).action()).isEqualTo(new Action.FixTraining());
        assertThat(decided(result).reasons()).containsExactly(new Reason(new RuleId("performance_red_flag"),
                new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-98", SourceTag.EXPERIENCE)));
    }

    @Test
    void aFlatBulkRaisesCaloriesWhateverTrainingSays() {
        // ADR-021: on the "not moving" branch the tree says only "adjust calories"; the training gate is the cut's red
        // flag (G7 K-98, G2 decision table). G3 K-10 sets no training condition for a stalled bulk.
        assertThat(spine(Sex.MALE, Phase.BULK, ON_PLAN.withTraining(Training.DECLINING), "70.0", "70.0", "70.0"))
                .isInstanceOf(SpineResult.CaloriesNeeded.class);
        assertThat(spine(Sex.MALE, Phase.BULK, ON_PLAN.withTraining(Training.UNKNOWN), "70.0", "70.0", "70.0"))
                .isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void withoutATrainingSignalAFlatWeightAsks() {
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN.withTraining(Training.UNKNOWN), "80.0", "80.0", "80.0")))
                .satisfies(d -> isCheckInNeeded(d, "training"));
    }

    // ── one flat week is not a plateau (G2 K-64); two are (G2 decision table, G3 K-10) ───────────────────────

    @Test
    void oneFlatWeekAfterADropStillReadsAsMoving() {
        // 80.7 → 80.0, then a week at 80.0: the 21-day window still sees the drop, so nothing changes (K-64 by design).
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN, "81.4", "80.7", "80.0", "80.0")).action())
                .isEqualTo(new Action.Continue());
    }

    @Test
    void twoFlatWeeksChangeCalories() {
        // G2 decision table: "weight 2+ weeks flat, adherence high" → act. 80.0 for three weeks = two flat steps.
        assertThat(spine(Sex.MALE, Phase.CUT, ON_PLAN.withWaist(Waist.FLAT), "81.4", "80.7", "80.0", "80.0", "80.0"))
                .isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void aFlatWindowWithOnlyOneFlatWeekWaitsOneMoreWeek() {
        // Spec WC-08 on a woman's 28-day window: 65.0, 65.7, 65.0, 65.0 — the window is flat, but the weight dropped
        // 0.7 kg two weeks ago and has held for one week since. One flat week is not a plateau: wait.
        SpineResult result = spine(Sex.FEMALE, Phase.CUT, ON_PLAN.withWaist(Waist.FLAT), "65.0", "65.7", "65.0", "65.0");

        assertThat(decided(result).action()).isEqualTo(new Action.NoDecisionYet());
        assertThat(decided(result).reasons()).containsExactly(new Reason(new RuleId("wait_one_more_week"),
                new Source("arastirma/ham/guray/G2-kilo-verme.md#K-64", SourceTag.EXPERIENCE)));
        assertThat(decided(result).nextReview()).isEqualTo(TODAY.plusDays(7));
    }

    @Test
    void aSlowLoserWhoseDropStoppedThisWeekWaitsOneMoreWeek() {
        // ADR-027 #0 (K-113 finding A): losing 0.5 kg a week, then a week at the same weight. The window reads flat —
        // 0.5 kg is inside flat_margin_kg — but the drop stopped only this week: one flat week is not a plateau (G2 K-64).
        // The per-week share of the margin (0.58 / 2 steps = 0.29 kg, the parameter's own "0.3 kg/week is movement")
        // tells a step that moved from one that did not.
        SpineResult oneFlatWeek = spine(Sex.MALE, Phase.CUT, ON_PLAN.withWaist(Waist.FLAT), "86.0", "85.5", "85.5");
        SpineResult twoFlatWeeks = spine(Sex.MALE, Phase.CUT, ON_PLAN.withWaist(Waist.FLAT), "86.0", "85.5", "85.5", "85.5");

        assertThat(decided(oneFlatWeek).reasons().getFirst().rule()).isEqualTo(new RuleId("wait_one_more_week"));
        assertThat(twoFlatWeeks).as("the second flat week acts").isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void aSteadySlowLoserKeepsGoingAndOnlyADropAfterARiseWaits() {
        // 0.29 kg a week, every week: moving (continue), not a plateau every week (ADR-027 #0).
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN, "80.58", "80.29", "80.00")).action()).isEqualTo(new Action.Continue());
        // Up 0.7 then down 0.7: this week's drop only undoes the rise — wait, not "moving" (aDropThisWeek… below).
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN, "80.0", "80.7", "80.0")).action()).isEqualTo(new Action.NoDecisionYet());
    }

    @Test
    void aDropThisWeekInAFlatWindowWaitsToo() {
        // 80.0, 80.7, 80.0: the window is flat, but the weight just dropped 0.7 kg: it is moving again, not stuck.
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN, "80.0", "80.7", "80.0")).reasons().getFirst().rule())
                .isEqualTo(new RuleId("wait_one_more_week"));
    }

    @Test
    void aWaistGoingTheWrongWayDoesNotWait() {
        // K-64 waits when weight and waist are both flat; a waist going up on a cut is not "flat".
        assertThat(spine(Sex.FEMALE, Phase.CUT, ON_PLAN.withWaist(Waist.UP), "65.0", "65.7", "65.0", "65.0"))
                .isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void weightGoingTheWrongWayThisWeekDoesNotWait() {
        // K-64 is about a pause, not a rise: up 1.5 kg on a cut this week acts now (review finding).
        assertThat(spine(Sex.FEMALE, Phase.CUT, ON_PLAN, "65.0", "65.7", "65.0", "66.5"))
                .isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void aRiseThisWeekInsideAFlatWindowDoesNotWait() {
        // 80.7 → 79.9 → 80.6: over the window the weight is flat, but it rose 0.7 kg this week. Not a pause.
        assertThat(spine(Sex.MALE, Phase.CUT, ON_PLAN, "80.7", "79.9", "80.6")).isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void aBulkWaitsBeforeTwoWeeksWithoutGain() {
        // G3 K-10: +250 kcal after 2 weeks without gain. Gained 0.7 kg this week in a flat window → wait; three
        // weeks at 70.0 (two flat steps) → up.
        assertThat(decided(spine(Sex.MALE, Phase.BULK, ON_PLAN, "70.4", "69.7", "70.4")).reasons().getFirst())
                .isEqualTo(new Reason(new RuleId("wait_one_more_week"),
                        new Source("arastirma/ham/guray/G3-kilo-alma-beslenme.md#K-10", SourceTag.EXPERIENCE)));
        assertThat(spine(Sex.MALE, Phase.BULK, ON_PLAN, "70.0", "70.0", "70.0")).isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    @Test
    void aShrinkingWaistDoesNotHurryABulk() {
        // The waist condition is K-64's, a cut rule; G3 K-10 has none (review finding).
        assertThat(decided(spine(Sex.MALE, Phase.BULK, ON_PLAN.withWaist(Waist.DOWN), "70.4", "69.7", "70.4")).action())
                .isEqualTo(new Action.NoDecisionYet());
    }

    @Test
    void movementBeforeThisPlanStartedDoesNotCountAsMoving() {
        // Weight fell under the previous plan, then the new plan started three weeks ago and nothing moved: only the
        // window, which lies inside this plan, is read — calories change now.
        List<WeighIn> weighIns = new ArrayList<>(daily(TODAY.minusDays(34), TODAY.minusDays(28), "81.7"));
        weighIns.addAll(daily(TODAY.minusDays(27), TODAY.minusDays(21), "81.0"));
        weighIns.addAll(daily(TODAY.minusDays(20), TODAY, "80.0"));
        Snapshot snapshot = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(20), series(weighIns))
                .withCheckIn(ON_PLAN.withWaist(Waist.FLAT));

        assertThat(WeeklySpine.evaluate(snapshot, MALE)).isInstanceOf(SpineResult.CaloriesNeeded.class);
    }

    // ── data first, shape of decisions ──────────────────────────────────────────────────────────────────────

    @Test
    void withoutEnoughDataTheDataRuleAnswers() {
        Snapshot tooEarly = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(5), series(daily(TODAY.minusDays(5), TODAY, "80.0")))
                .withCheckIn(ON_PLAN);

        assertThat(decided(WeeklySpine.evaluate(tooEarly, MALE)).reasons().getFirst().rule())
                .isEqualTo(new RuleId("data_insufficient"));
    }

    @Test
    void spineDecisionsLookAgainNextWeek() {
        assertThat(decided(spine(Sex.MALE, Phase.CUT, ON_PLAN.withLook(Look.BETTER), "80.0", "79.5", "79.0")).nextReview())
                .isEqualTo(TODAY.plusDays(7));
    }

    @Test
    void everyCopyKeyItCanReturnHasATitleAndBodyInEnJson() {
        for (String key : List.of("decision.continue.toward_goal", "decision.fix_training.training_first",
                "decision.fix_training.performance_red_flag", "decision.fix_recovery.recovery_poor",
                "decision.fix_adherence.adherence_low", "decision.fix_adherence.adherence_partial",
                "decision.no_decision_yet.wait_one_more_week", "decision.no_decision_yet.check_in_needed_training",
                "decision.no_decision_yet.check_in_needed_recovery", "decision.no_decision_yet.check_in_needed_adherence")) {
            assertThat(EngineFixtures.copyGroup(new CopyKey(key))).as(key)
                    .hasEntrySatisfying("title", title -> assertThat(title).isInstanceOf(String.class))
                    .hasEntrySatisfying("body", body -> assertThat(body).isInstanceOf(String.class));
        }
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    @Property
    boolean underOnTrackAdherenceCaloriesNeverMove(@ForAll("weekOfKgs") List<String> kgs, @ForAll("lowAdherence") BigDecimal adherence,
            @ForAll Phase phase, @ForAll Look look, @ForAll Recovery recovery) {
        // G2 K-60, ADR-020 L-9: calories move only when at least on_track_min_ratio of the plan was done — on any branch.
        CheckIn checkIn = ON_PLAN.withAdherence(adherence).withLook(look).withRecovery(recovery);
        return !(spine(Sex.MALE, phase, checkIn, kgs.toArray(String[]::new)) instanceof SpineResult.CaloriesNeeded);
    }

    @Property
    boolean aFlatOrWrongWayWindowMovesCaloriesTowardTheGoal(@ForAll("weekOfKgs") List<String> kgs, @ForAll Phase phase) {
        // When the spine asks for calories because weight is not moving, a cut eats less and a bulk eats more.
        SpineResult result = spine(Sex.MALE, phase, ON_PLAN, kgs.toArray(String[]::new));
        if (!(result instanceof SpineResult.CaloriesNeeded(CalorieDirection direction, List<Reason> reasons))
                || !reasons.getFirst().rule().equals(new RuleId("not_toward_goal"))) {
            return true;
        }
        return direction == (phase == Phase.CUT ? CalorieDirection.DOWN : CalorieDirection.UP);
    }

    @Provide
    Arbitrary<List<String>> weekOfKgs() {
        return Arbitraries.bigDecimals().between(new BigDecimal("78"), new BigDecimal("82")).ofScale(1)
                .map(BigDecimal::toPlainString).list().ofSize(3);
    }

    @Provide
    Arbitrary<BigDecimal> lowAdherence() {
        return Arbitraries.bigDecimals().between(BigDecimal.ZERO, new BigDecimal("0.69")).ofScale(2);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    /**
     * One weight per week, oldest first, weighed every morning; the plan started on the first day and today is the last
     * day of the last week.
     */
    private static SpineResult spine(Sex sex, Phase phase, CheckIn checkIn, String... weeklyKg) {
        return WeeklySpine.evaluate(snapshot(sex, phase, checkIn, weeklyKg), sex == Sex.MALE ? MALE : FEMALE);
    }

    private static Snapshot snapshot(Sex sex, Phase phase, CheckIn checkIn, String... weeklyKg) {
        LocalDate firstDay = TODAY.minusDays(7L * weeklyKg.length - 1);
        List<WeighIn> weighIns = new ArrayList<>();
        for (int week = 0; week < weeklyKg.length; week++) {
            weighIns.addAll(daily(firstDay.plusDays(7L * week), firstDay.plusDays(7L * week + 6), weeklyKg[week]));
        }
        return new Snapshot(TODAY, sex, phase, firstDay, series(weighIns)).withCheckIn(checkIn);
    }

    @SuppressWarnings("unchecked")
    private static Parameters withValue(String file, String key, Object value) {
        java.util.Map<String, Object> documents = ParametersLoaderTests.repositoryDocuments();
        List<java.util.Map<String, Object>> entries =
                (List<java.util.Map<String, Object>>) ((java.util.Map<String, Object>) documents.get(file)).get("parameters");
        entries.stream().filter(p -> key.equals(p.get("key"))).findFirst().orElseThrow().put("value", value);
        return ParameterSet.fromDocuments(documents).forSex(Sex.MALE);
    }

    private static List<WeighIn> daily(LocalDate first, LocalDate last, String kg) {
        List<WeighIn> weighIns = new ArrayList<>();
        for (LocalDate day = first; !day.isAfter(last); day = day.plusDays(1)) {
            weighIns.add(weighIn(day, kg));
        }
        return weighIns;
    }

    private static Decision decided(SpineResult result) {
        assertThat(result).isInstanceOf(SpineResult.Decided.class);
        return ((SpineResult.Decided) result).decision();
    }

    /** No decision yet, naming the one answer that would let the call be made (U2, U3). */
    private void isCheckInNeeded(Decision decision, String signal) {
        assertThat(decision.action()).isEqualTo(new Action.NoDecisionYet());
        assertThat(decision.reasons().getFirst().rule()).isEqualTo(new RuleId("check_in_needed_" + signal));
        assertThat(decision.copyKey()).isEqualTo(new CopyKey("decision.no_decision_yet.check_in_needed_" + signal));
    }
}
