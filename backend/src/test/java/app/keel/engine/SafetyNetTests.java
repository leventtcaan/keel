package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static app.keel.engine.EngineFixtures.weighIn;
import static org.assertj.core.api.Assertions.assertThat;

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
import org.junit.jupiter.api.Test;

/**
 * U13: nothing lowers calories before the safety net has looked. Losing faster than
 * min(weekly_loss_cap_kg, bodyweight × weekly_loss_cap_pct_bodyweight) raises calories (Güray K-17, H3 Ç1);
 * a calorie target never goes under BMR — move more instead (Güray K-11, spec WC-12).
 */
class SafetyNetTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final Parameters MALE = parameters(Sex.MALE);
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
                new CopyKey("decision.change_movement.bmr_floor"))) {
            assertThat(EngineFixtures.copyGroup(key)).as(key.value())
                    .hasEntrySatisfying("title", title -> assertThat(title).isInstanceOf(String.class))
                    .hasEntrySatisfying("body", body -> assertThat(body).isInstanceOf(String.class));
        }
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

    @SuppressWarnings("unchecked")
    private static Parameters floorSwitchedOff() {
        java.util.Map<String, Object> documents = ParametersLoaderTests.repositoryDocuments();
        List<java.util.Map<String, Object>> safety =
                (List<java.util.Map<String, Object>>) ((java.util.Map<String, Object>) documents.get("safety.yaml")).get("parameters");
        safety.stream().filter(p -> "bmr_floor_enabled".equals(p.get("key"))).findFirst().orElseThrow().put("value", false);
        return ParameterSet.fromDocuments(documents).forSex(Sex.MALE);
    }
}
