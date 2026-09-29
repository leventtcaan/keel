package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static app.keel.engine.EngineFixtures.weighIn;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/**
 * U13: nothing lowers calories before the safety net has looked. Losing faster than
 * min(weekly_loss_cap_kg, bodyweight × weekly_loss_cap_pct_bodyweight) raises calories (Güray K-17, H3 Ç1);
 * a calorie target never goes under BMR — move more instead (Güray K-11, spec WC-12). Losing more than
 * rapid_loss_narrow_pct in rapid_loss_window_weeks, or a plan whose energy availability is under lea_threshold,
 * narrows the deficit (J1 C6, ADR-020 L-1/L-2). The one hard stop: a reported loss of the menstrual cycle.
 */
class SafetyNetTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final Parameters MALE = parameters(Sex.MALE);
    private static final Parameters FEMALE = parameters(Sex.FEMALE);
    private static final BigDecimal CAP_KG = BigDecimal.valueOf(MALE.number(ParameterKey.WEEKLY_LOSS_CAP_KG));
    private static final BigDecimal CAP_PCT = BigDecimal.valueOf(MALE.number(ParameterKey.WEEKLY_LOSS_CAP_PCT_BODYWEIGHT));

    // ── weekly loss cap ─────────────────────────────────────────────────────────────────────────────────────

    @Test
    void losingFasterThanOnePercentOfALightBodyRaisesCalories() {
        // Spec WC-10: 70 kg, losing 0.9 kg/week. The cap is min(1 kg, 0.7 kg) = 0.7 kg → raise calories.
        Optional<Decision> decision = SafetyNet.check(losing("70.9", "70.0"), MALE);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.IncreaseCalories());
            assertThat(d.reasons()).extracting(Reason::rule).first().isEqualTo(new RuleId("loss_rate_cap"));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.increase_calories.loss_rate_cap"));
        });
    }

    @Test
    void theCapIsTheSmallerOfOneKiloAndOnePercent() {
        // 110 kg: 1 % is 1.1 kg, so Güray's 1 kg is the tighter limit; 60 kg: 1 % (0.6 kg) is tighter.
        assertThat(SafetyNet.weeklyLossCapKg(new BigDecimal("110"), MALE)).isEqualByComparingTo(CAP_KG);
        assertThat(SafetyNet.weeklyLossCapKg(new BigDecimal("60"), MALE))
                .isEqualByComparingTo(new BigDecimal("60").multiply(CAP_PCT));
    }

    @Test
    void aLossExactlyAtTheCapIsAllowed() {
        // 70 kg → cap 0.7 kg. Losing exactly 0.7 kg is on the line, not over it.
        assertThat(SafetyNet.check(losing("70.7", "70.0"), MALE)).isNotPresent();
    }

    @Test
    void aLossJustOverTheCapIsCaught() {
        assertThat(SafetyNet.check(losing("70.8", "70.0"), MALE)).isPresent();
    }

    @Test
    void theHeavierUsersCapStopsAtOneKilo() {
        // 120 kg: 1 % would allow 1.2 kg; Güray's cap of 1 kg holds.
        assertThat(SafetyNet.check(losing("121.1", "120.0"), MALE)).isPresent();
        assertThat(SafetyNet.check(losing("121.0", "120.0"), MALE)).isNotPresent();
    }

    @Test
    void namesBothSourcesDecidingRuleFirst() {
        Optional<Decision> decision = SafetyNet.check(losing("70.9", "70.0"), MALE);

        assertThat(decision).hasValueSatisfying(d -> assertThat(d.reasons()).containsExactly(
                new Reason(new RuleId("loss_rate_cap"),
                        new Source("arastirma/ham/guray/G2-kilo-verme.md#K-17", SourceTag.EXPERIENCE)),
                new Reason(new RuleId("loss_rate_cap_bodyweight"),
                        new Source("arastirma/ham/H3-bosluk-literatur.md#Ç1", SourceTag.LITERATURE))));
    }

    @Test
    void gainingOrHoldingIsNeverASafetyProblem() {
        assertThat(SafetyNet.check(losing("70.0", "70.5"), MALE)).isNotPresent();
        assertThat(SafetyNet.check(losing("70.0", "70.0"), MALE)).isNotPresent();
    }

    @Test
    void withoutATrendAWeekAgoTheCapIsNotJudged() {
        // One week of data only: nothing to compare against yet (the data-sufficiency step speaks then).
        Snapshot snapshot = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(30),
                series(EngineFixtures.daily(TODAY.minusDays(3), TODAY, "70.0")));

        assertThat(SafetyNet.check(snapshot, MALE)).isNotPresent();
    }

    @Test
    void aSteadyDailyLossIsMeasuredWeekOverWeek() {
        // Losing 0.12 kg every day for two weeks: consecutive 7-day means differ by 0.84 kg > 0.7 kg cap at ~70 kg.
        // At 0.09 kg/day they differ by 0.63 kg: under the cap. (Pins the one-week lag: a longer lag would add days.)
        assertThat(SafetyNet.check(steadyLoss("71.60", "0.12"), MALE)).isPresent();
        assertThat(SafetyNet.check(steadyLoss("71.30", "0.09"), MALE)).isNotPresent();
    }

    @Test
    void aSwingBetweenTwoSingleMorningsIsNotALoss() {
        // Both weeks average exactly 70.0 kg, but the last morning of the old week (70.6) and today (69.6) differ by
        // 1.0 kg. Only the weekly means count; one morning is mostly water (H1 §3.4).
        List<WeighIn> weighIns = new ArrayList<>();
        String[] oldWeek = {"69.4", "70.3", "69.7", "70.0", "70.1", "69.9", "70.6"};
        String[] thisWeek = {"70.6", "69.4", "70.3", "70.1", "70.0", "70.0", "69.6"};
        for (int i = 0; i < 7; i++) {
            weighIns.add(weighIn(TODAY.minusDays(13 - i), oldWeek[i]));
            weighIns.add(weighIn(TODAY.minusDays(6 - i), thisWeek[i]));
        }

        assertThat(SafetyNet.check(cut(weighIns), MALE)).isNotPresent();
    }

    @Test
    void oneWeighInPerWeekIsTooLittleToCallALossRate() {
        // A single weigh-in each week carries ±1.2 kg of noise on the difference, more than the cap itself.
        List<WeighIn> sparse = new ArrayList<>(EngineFixtures.daily(TODAY.minusDays(60), TODAY.minusDays(14), "72.0"));
        sparse.add(weighIn(TODAY.minusDays(10), "71.5"));
        sparse.add(weighIn(TODAY, "70.0"));

        assertThat(SafetyNet.check(cut(sparse), MALE)).isNotPresent();
    }

    @Test
    void theFirstWeeksWaterDropIsNotALossRate() {
        // Güray K-19: the first week's drop is water and glycogen. Nothing is interpreted before
        // no_interpretation_days of data (H1), the safety net included.
        List<WeighIn> weighIns = new ArrayList<>(EngineFixtures.daily(TODAY.minusDays(12), TODAY.minusDays(7), "72.0"));
        weighIns.addAll(EngineFixtures.daily(TODAY.minusDays(6), TODAY, "70.5"));

        assertThat(SafetyNet.check(cut(weighIns), MALE)).isNotPresent();
    }

    @Test
    void theLossCapIsACutRule() {
        // On a bulk, losing weight is a wrong-direction question for the weekly spine (K-106), not this rule.
        Snapshot bulking = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(60), losing("70.9", "70.0").weights());

        assertThat(SafetyNet.check(bulking, MALE)).isNotPresent();
    }

    @Test
    void safetyCallsOnDenseDataAreHighConfidence() {
        assertThat(SafetyNet.check(losing("70.9", "70.0"), MALE)).hasValueSatisfying(
                d -> assertThat(d.confidence()).isEqualTo(Confidence.HIGH));
        assertThat(SafetyNet.bmrFloor(1450, 1500, snapshot(), MALE)).hasValueSatisfying(d -> {
            assertThat(d.confidence()).isEqualTo(Confidence.HIGH);
            assertThat(d.nextReview()).isEqualTo(TODAY.plusDays(7));
        });
    }

    // ── BMR floor ───────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void aTargetUnderBmrBecomesMoreMovementInstead() {
        // Spec WC-12: the next calorie step would go under BMR → change movement, keep calories.
        Optional<Decision> decision = SafetyNet.bmrFloor(1450, 1500, snapshot(), MALE);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.ChangeMovement());
            assertThat(d.reasons()).containsExactly(new Reason(new RuleId("bmr_floor"),
                    new Source("arastirma/ham/guray/G2-kilo-verme.md#K-11", SourceTag.EXPERIENCE)));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.change_movement.bmr_floor"));
        });
    }

    @Test
    void aTargetExactlyAtBmrIsAllowed() {
        assertThat(SafetyNet.bmrFloor(1500, 1500, snapshot(), MALE)).isNotPresent();
        assertThat(SafetyNet.bmrFloor(1501, 1500, snapshot(), MALE)).isNotPresent();
    }

    @Test
    void theFloorFollowsItsSwitch() {
        // bmr_floor_enabled is a parameter so the rule can be audited and switched in one place (K2).
        Parameters floorOff = floorSwitchedOff();

        assertThat(SafetyNet.bmrFloor(1000, 1500, snapshot(), floorOff)).isNotPresent();
    }

    @Test
    void safetyDecisionsLookAgainNextWeek() {
        assertThat(SafetyNet.check(losing("70.9", "70.0"), MALE)).hasValueSatisfying(
                d -> assertThat(d.nextReview()).isEqualTo(TODAY.plusDays(7)));
    }

    @Test
    void everyCopyKeyItCanReturnHasATitleAndBodyInEnJson() {
        for (CopyKey key : List.of(new CopyKey("decision.increase_calories.loss_rate_cap"),
                new CopyKey("decision.change_movement.bmr_floor"), new CopyKey("decision.increase_calories.rapid_loss"),
                new CopyKey("decision.increase_calories.low_energy_availability"),
                new CopyKey("decision.hard_stop.menstrual_loss_reported"))) {
            assertThat(EngineFixtures.copyGroup(key)).as(key.value())
                    .hasEntrySatisfying("title", title -> assertThat(title).isInstanceOf(String.class))
                    .hasEntrySatisfying("body", body -> assertThat(body).isInstanceOf(String.class));
        }
    }

    // ── rapid loss over 8 weeks (J1 C6, ADR-020 L-1: narrow and warn, not a hard stop) ─────────────────────

    @Test
    void losingMoreThanEightPercentInEightWeeksNarrowsTheDeficit() {
        // Spec WC-11: 90 → 82.7 kg is 8.1 % in 8 weeks. The last weeks were flat, so the weekly cap is quiet.
        Optional<Decision> decision = SafetyNet.check(rapidLoss("90.0", "82.7"), MALE);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.IncreaseCalories());
            assertThat(d.reasons()).containsExactly(new Reason(new RuleId("rapid_loss"),
                    new Source("arastirma/ham/J1-cinsiyet.md#C6", SourceTag.LITERATURE)));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.increase_calories.rapid_loss"));
        });
    }

    @Test
    void onceTheLossHasStoppedTheDeficitIsNotNarrowedAgain() {
        // After a fast drop the deficit was narrowed and weight held for two weeks. The 8-week loss is still over 8 %
        // until the window passes the old high, but narrowing again every week would stack calorie increases.
        assertThat(SafetyNet.check(cut(dropThenFlat("90.0", new BigDecimal("82.0"))), MALE)).isNotPresent();
    }

    @Test
    void exactlyEightPercentIsOnTheLineNotOverIt() {
        assertThat(SafetyNet.check(rapidLoss("90.0", "82.8"), MALE)).isNotPresent();
    }

    @Test
    void withoutWeighInsEightWeeksAgoTheLossIsNotJudged() {
        List<WeighIn> recentOnly = new ArrayList<>(EngineFixtures.daily(TODAY.minusDays(40), TODAY.minusDays(14), "90.0"));
        recentOnly.addAll(EngineFixtures.daily(TODAY.minusDays(13), TODAY, "90.0"));

        assertThat(SafetyNet.check(cut(recentOnly), MALE)).isNotPresent();
    }

    @Test
    void theRapidLossRuleIsACutRule() {
        Snapshot bulking = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(60), rapidLoss("90.0", "82.0").weights());

        assertThat(SafetyNet.check(bulking, MALE)).isNotPresent();
    }

    // ── energy availability (J1 C6 / L2.1, ADR-020 L-2: male 25, female 30) ────────────────────────────────

    @Test
    void aPlanUnderTheLowEnergyLineNarrowsTheDeficit() {
        // 80 kg at an internal 25 % → 60 kg fat-free. (1899 − 400) / 60 = 24.98 ≤ 25.
        Optional<Decision> decision = SafetyNet.check(fueled(Sex.MALE, "80.0", "25", 1899, 400), MALE);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.IncreaseCalories());
            assertThat(d.reasons()).containsExactly(new Reason(new RuleId("low_energy_availability"),
                    new Source("arastirma/ham/J1-cinsiyet.md#L2.1", SourceTag.LITERATURE)));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.increase_calories.low_energy_availability"));
            assertThat(d.confidence()).isEqualTo(Confidence.HIGH);
        });
    }

    @Test
    void aPlanExactlyOnTheLowEnergyLineIsAlreadyLow() {
        // ADR-020 L-1 and J1 C6 say "≤ threshold": (1900 − 400) / 60 = 25.0 narrows; one kcal more does not.
        assertThat(SafetyNet.check(fueled(Sex.MALE, "80.0", "25", 1900, 400), MALE)).isPresent();
        assertThat(SafetyNet.check(fueled(Sex.MALE, "80.0", "25", 1901, 400), MALE)).isNotPresent();
    }

    @Test
    void theSamePlanIsLowForAWomanButNotForAMan() {
        // Energy availability 27 for both: under the female line (30), over the male line (25).
        assertThat(SafetyNet.check(fueled(Sex.MALE, "80.0", "25", 1620, 0), MALE)).isNotPresent();
        assertThat(SafetyNet.check(fueled(Sex.FEMALE, "60.0", "30", 1134, 0), FEMALE)).hasValueSatisfying(
                d -> assertThat(d.reasons().getFirst().rule()).isEqualTo(new RuleId("low_energy_availability")));
    }

    @Test
    void lowEnergyIsCaughtOnABulkToo() {
        // A plan too low to fuel training is a safety problem whatever the direction (U13).
        Snapshot bulk = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(60),
                series(EngineFixtures.daily(TODAY.minusDays(40), TODAY, "80.0")), Optional.of(new BigDecimal("25")))
                .withEnergy(new EnergyBudget(1500, 300));

        assertThat(SafetyNet.check(bulk, MALE)).hasValueSatisfying(
                d -> assertThat(d.action()).isEqualTo(new Action.IncreaseCalories()));
    }

    @Test
    void theBandsRunFromLowToAdequate() {
        // 60 kg fat-free, no exercise: 23.3 / 28.3 / 33.3 / 45.0 kcal per kg fat-free mass.
        assertThat(band(1400)).contains(EnergyAvailability.LOW);
        assertThat(band(1700)).contains(EnergyAvailability.WARNING);
        assertThat(band(2000)).contains(EnergyAvailability.REDUCED);
        assertThat(band(2700)).contains(EnergyAvailability.ADEQUATE);
    }

    @Test
    void theWarningBandChangesNoDecision() {
        // J1 L2.1: under the warning line the app warns and watches; the plan stays.
        assertThat(SafetyNet.check(fueled(Sex.MALE, "80.0", "25", 1700, 0), MALE)).isNotPresent();
    }

    @Test
    void withoutAPlanBudgetAFatEstimateOrATrendThereIsNoBand() {
        Snapshot noFat = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(60),
                series(EngineFixtures.daily(TODAY.minusDays(40), TODAY, "80.0"))).withEnergy(new EnergyBudget(1400, 0));
        Snapshot noBudget = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(60),
                series(EngineFixtures.daily(TODAY.minusDays(40), TODAY, "80.0")), Optional.of(new BigDecimal("25")));
        Snapshot noWeights = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(60), series(List.of()),
                Optional.of(new BigDecimal("25"))).withEnergy(new EnergyBudget(1400, 0));

        assertThat(SafetyNet.energyAvailability(noFat, MALE)).isEmpty();
        assertThat(SafetyNet.energyAvailability(noBudget, MALE)).isEmpty();
        assertThat(SafetyNet.energyAvailability(noWeights, MALE)).isEmpty();
        assertThat(SafetyNet.check(noFat, MALE)).isNotPresent();
    }

    @Test
    void theLowEnergyFloorIsTheSmallestTargetAboveTheLine() {
        // 81 kg at 25 % → 60.75 kg fat-free; 25 × 60.75 = 1518.75 → the next whole kcal above it is 1519, plus 400
        // kcal of exercise = 1919.
        assertThat(SafetyNet.leaFloorKcal(fueled(Sex.MALE, "81.0", "25", 2500, 400), MALE)).contains(1919);
        // 60 kg at 30 % → 42 kg; 30 × 42 = 1260 exactly is on the line (low), so 1261 + 300 = 1561.
        assertThat(SafetyNet.leaFloorKcal(fueled(Sex.FEMALE, "60.0", "30", 2500, 300), FEMALE)).contains(1561);
    }

    @Test
    void rapidLossLeadsTheWeeklyCapWhenBothFire() {
        // 90 → 83 kg by two weeks ago, 83 last week, 82 this week: 8.9 % in 8 weeks and 1.0 kg in a week (cap 0.82).
        List<WeighIn> weighIns = new ArrayList<>(dropThenFlat("90.0", new BigDecimal("83.0")).subList(0, 48));
        weighIns.addAll(EngineFixtures.daily(TODAY.minusDays(13), TODAY.minusDays(7), "83.0"));
        weighIns.addAll(EngineFixtures.daily(TODAY.minusDays(6), TODAY, "82.0"));

        assertThat(SafetyNet.check(cut(weighIns), MALE)).hasValueSatisfying(d -> {
            assertThat(d.reasons()).extracting(Reason::rule).containsExactly(new RuleId("rapid_loss"),
                    new RuleId("loss_rate_cap"), new RuleId("loss_rate_cap_bodyweight"));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.increase_calories.rapid_loss"));
        });
    }

    @Test
    void aSnapshotAndParametersOfDifferentSexesAreRejected() {
        // The lines differ by sex; reading a woman's plan with the male line would miss a low-energy plan.
        Snapshot woman = fueled(Sex.FEMALE, "60.0", "30", 1134, 0);

        assertThatThrownBy(() -> SafetyNet.check(woman, MALE)).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sex");
        assertThatThrownBy(() -> SafetyNet.energyAvailability(woman, MALE)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SafetyNet.leaFloorKcal(woman, MALE)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void whenSeveralSafetyRulesFireTheLowEnergyRuleLeadsAndTheOthersSupport() {
        Snapshot both = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(60), rapidLoss("90.0", "82.0").weights(),
                Optional.of(new BigDecimal("25"))).withEnergy(new EnergyBudget(1200, 300));

        assertThat(SafetyNet.check(both, MALE)).hasValueSatisfying(d -> assertThat(d.reasons())
                .extracting(Reason::rule)
                .containsExactly(new RuleId("low_energy_availability"), new RuleId("rapid_loss")));
    }

    // ── the one hard stop (J1 C6, ADR-020 L-1) ─────────────────────────────────────────────────────────────

    @Test
    void aReportedLossOfTheCycleStopsTheCut() {
        Snapshot reported = fueled(Sex.FEMALE, "60.0", "30", 1500, 300).withMenstrualLossReported(true);

        assertThat(SafetyNet.check(reported, FEMALE)).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.HardStop());
            assertThat(d.reasons()).containsExactly(new Reason(new RuleId("menstrual_loss_reported"),
                    new Source("arastirma/ham/J1-cinsiyet.md#C6", SourceTag.LITERATURE)));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.hard_stop.menstrual_loss_reported"));
            assertThat(d.confidence()).isEqualTo(Confidence.HIGH);
        });
    }

    @Test
    void theHardStopComesBeforeEveryOtherSafetyRule() {
        Snapshot everything = new Snapshot(TODAY, Sex.FEMALE, Phase.CUT, TODAY.minusDays(60), rapidLoss("90.0", "82.0").weights(),
                Optional.of(new BigDecimal("30"))).withEnergy(new EnergyBudget(1000, 300)).withMenstrualLossReported(true);

        assertThat(SafetyNet.check(everything, FEMALE)).hasValueSatisfying(
                d -> assertThat(d.action()).isEqualTo(new Action.HardStop()));
    }

    @Test
    void aReportOnABulkStopsTooBecauseNoDeficitIsTheAnswerInEveryPhase() {
        // The question appears when energy is low, which a too-low bulk plan can reach. The answer is the same:
        // no deficit, at least maintenance, see a doctor; the copy says so without assuming a cut.
        Snapshot bulk = new Snapshot(TODAY, Sex.FEMALE, Phase.BULK, TODAY.minusDays(60),
                series(EngineFixtures.daily(TODAY.minusDays(40), TODAY, "60.0"))).withMenstrualLossReported(true);

        assertThat(SafetyNet.check(bulk, FEMALE)).hasValueSatisfying(
                d -> assertThat(d.action()).isEqualTo(new Action.HardStop()));
    }

    @Test
    void withoutAReportNothingStops() {
        assertThat(SafetyNet.check(fueled(Sex.FEMALE, "60.0", "30", 2200, 300), FEMALE)).isNotPresent();
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    @Property
    boolean theSafetyNetNeverLowersCalories(@ForAll("weekOfWeights") List<String> kgs) {
        // U13: whatever the data, the safety net only ever raises calories or moves more.
        return SafetyNet.check(snapshotWithRecentWeights(kgs), MALE)
                .map(d -> d.action() instanceof Action.IncreaseCalories)
                .orElse(true);
    }

    @Property
    boolean moreFoodNeverMeansALowerEnergyBand(@ForAll("targets") int lower, @ForAll("targets") int higher) {
        Snapshot less = fueled(Sex.FEMALE, "62.0", "28", Math.min(lower, higher), 250);
        Snapshot more = fueled(Sex.FEMALE, "62.0", "28", Math.max(lower, higher), 250);
        Optional<EnergyAvailability> moreBand = SafetyNet.energyAvailability(more, FEMALE);
        Optional<EnergyAvailability> lessBand = SafetyNet.energyAvailability(less, FEMALE);
        return moreBand.isPresent() && lessBand.isPresent() && moreBand.get().compareTo(lessBand.get()) >= 0;
    }

    @Property
    boolean theFloorIsTheSmallestTargetOutOfTheLowBand(@ForAll("bodyweights") BigDecimal kg,
            @ForAll("fatEstimates") BigDecimal fatPct, @ForAll @IntRange(min = 0, max = 1500) int exercise,
            @ForAll Sex sex) {
        Parameters p = parameters(sex);
        Optional<Integer> floor = SafetyNet.leaFloorKcal(fueled(sex, kg.toPlainString(), fatPct.toPlainString(), 2000, exercise), p);
        return floor.isPresent()
                && bandAt(sex, kg, fatPct, floor.get(), exercise).filter(band -> band != EnergyAvailability.LOW).isPresent()
                && bandAt(sex, kg, fatPct, floor.get() - 1, exercise).filter(band -> band == EnergyAvailability.LOW).isPresent();
    }

    @Provide
    Arbitrary<BigDecimal> fatEstimates() {
        return Arbitraries.bigDecimals().between(new BigDecimal("5"), new BigDecimal("50")).ofScale(1);
    }

    private static Optional<EnergyAvailability> bandAt(Sex sex, BigDecimal kg, BigDecimal fatPct, int target, int exercise) {
        return target <= 0 ? Optional.of(EnergyAvailability.LOW)
                : SafetyNet.energyAvailability(fueled(sex, kg.toPlainString(), fatPct.toPlainString(), target, exercise), parameters(sex));
    }

    @Provide
    Arbitrary<Integer> targets() {
        return Arbitraries.integers().between(800, 4000);
    }

    @Property
    boolean aHeavierBodyNeverHasASmallerCap(@ForAll("bodyweights") BigDecimal lighter, @ForAll("bodyweights") BigDecimal heavier) {
        BigDecimal low = lighter.min(heavier);
        BigDecimal high = lighter.max(heavier);
        return SafetyNet.weeklyLossCapKg(high, MALE).compareTo(SafetyNet.weeklyLossCapKg(low, MALE)) >= 0;
    }

    @Property
    boolean theCapNeverExceedsGuraysOneKilo(@ForAll("bodyweights") BigDecimal kg) {
        return SafetyNet.weeklyLossCapKg(kg, MALE).compareTo(CAP_KG) <= 0;
    }

    @Provide
    Arbitrary<BigDecimal> bodyweights() {
        return Arbitraries.bigDecimals().between(new BigDecimal("35"), new BigDecimal("250")).ofScale(1);
    }

    @Provide
    Arbitrary<List<String>> weekOfWeights() {
        return Arbitraries.bigDecimals().between(new BigDecimal("50"), new BigDecimal("150")).ofScale(1)
                .map(BigDecimal::toPlainString).list().ofSize(14);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    /** Seven days at {@code weekAgoKg} then seven days at {@code nowKg}: the trend drops by exactly the difference. */
    private static Snapshot losing(String weekAgoKg, String nowKg) {
        List<WeighIn> weighIns = new ArrayList<>(EngineFixtures.daily(TODAY.minusDays(40), TODAY.minusDays(7), weekAgoKg));
        weighIns.addAll(EngineFixtures.daily(TODAY.minusDays(6), TODAY, nowKg));
        return new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(60), series(weighIns));
    }

    /** Daily weigh-ins for the last 14 days, starting at {@code startKg} and dropping {@code perDayKg} each day. */
    private static Snapshot steadyLoss(String startKg, String perDayKg) {
        List<WeighIn> weighIns = new ArrayList<>(EngineFixtures.daily(TODAY.minusDays(40), TODAY.minusDays(14), startKg));
        BigDecimal kg = new BigDecimal(startKg);
        for (int ago = 13; ago >= 0; ago--) {
            kg = kg.subtract(new BigDecimal(perDayKg));
            weighIns.add(new WeighIn(TODAY.minusDays(ago), kg));
        }
        return cut(weighIns);
    }

    private static Snapshot cut(List<WeighIn> weighIns) {
        return new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(60), series(weighIns));
    }

    private static Snapshot snapshotWithRecentWeights(List<String> kgs) {
        List<WeighIn> weighIns = new ArrayList<>();
        for (int i = 0; i < kgs.size(); i++) {
            weighIns.add(weighIn(TODAY.minusDays(kgs.size() - 1L - i), kgs.get(i)));
        }
        return new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(60), series(weighIns));
    }

    private static Snapshot snapshot() {
        return losing("70.0", "70.0");
    }

    /** A steady weight on a cut, an internal fat estimate and a plan budget: energy availability can be computed. */
    private static Snapshot fueled(Sex sex, String kg, String fatPct, int targetKcal, int exerciseKcal) {
        return new Snapshot(TODAY, sex, Phase.CUT, TODAY.minusDays(60), series(EngineFixtures.daily(TODAY.minusDays(40), TODAY, kg)),
                Optional.of(new BigDecimal(fatPct))).withEnergy(new EnergyBudget(targetKcal, exerciseKcal));
    }

    private static Optional<EnergyAvailability> band(int targetKcal) {
        return SafetyNet.energyAvailability(fueled(Sex.MALE, "80.0", "25", targetKcal, 0), MALE);
    }

    /**
     * A week at {@code startKg} ending 8 weeks ago, a straight line down to {@code endKg} + 0.2 two weeks ago, a week
     * at {@code endKg} + 0.1, then this week at {@code endKg}: the 8-week loss is exactly the difference, and the loss
     * is still going on but at 0.1 kg a week, far under the weekly cap.
     */
    private static Snapshot rapidLoss(String startKg, String endKg) {
        BigDecimal end = new BigDecimal(endKg);
        List<WeighIn> weighIns = new ArrayList<>(dropThenFlat(startKg, end.add(new BigDecimal("0.2"))).subList(0, 48));
        weighIns.addAll(EngineFixtures.daily(TODAY.minusDays(13), TODAY.minusDays(7), end.add(new BigDecimal("0.1")).toPlainString()));
        weighIns.addAll(EngineFixtures.daily(TODAY.minusDays(6), TODAY, endKg));
        return cut(weighIns);
    }

    /** A week at {@code startKg} ending 8 weeks ago, a straight line down to {@code endKg} two weeks ago, then flat. */
    private static List<WeighIn> dropThenFlat(String startKg, BigDecimal endKg) {
        List<WeighIn> weighIns = new ArrayList<>(EngineFixtures.daily(TODAY.minusDays(62), TODAY.minusDays(56), startKg));
        BigDecimal start = new BigDecimal(startKg);
        BigDecimal perDay = start.subtract(endKg).divide(BigDecimal.valueOf(42), java.math.MathContext.DECIMAL64);
        for (int ago = 55; ago > 14; ago--) {
            weighIns.add(new WeighIn(TODAY.minusDays(ago), start.subtract(perDay.multiply(BigDecimal.valueOf(56L - ago)))));
        }
        weighIns.addAll(EngineFixtures.daily(TODAY.minusDays(14), TODAY, endKg.toPlainString()));
        return weighIns;
    }

    @SuppressWarnings("unchecked")
    private static Parameters floorSwitchedOff() {
        java.util.Map<String, Object> documents = ParametersLoaderTests.repositoryDocuments();
        List<java.util.Map<String, Object>> safety =
                (List<java.util.Map<String, Object>>) ((java.util.Map<String, Object>) documents.get("safety.yaml")).get("parameters");
        safety.stream().filter(p -> "bmr_floor_enabled".equals(p.get("key"))).findFirst().orElseThrow().put("value", false);
        return ParameterSet.fromDocuments(documents).forSex(Sex.MALE);
    }
}
