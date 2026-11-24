package app.keel.engine;

import static app.keel.engine.EngineFixtures.daily;
import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
 * K-1205 (ADR-091 Ek 4): a cut that is moving but slower than 0.5 % of its body weight a week, plan followed and training
 * holding, takes the calorie step (500 kcal, G7 K-97); a step that would take the pace past the weekly loss cap, or under
 * the ladder's floors, is not made. The expected calls are worked out by hand: floor = 0.005 × latest weekly mean, cap =
 * min(1 kg, 1 % × latest weekly mean), the step = 500 × 7 / 7000 = 0.5 kg a week.
 */
class TargetPaceTests {

    private static final Parameters MALE = parameters(Sex.MALE);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final LocalDate PLAN_START = TODAY.minusDays(20);

    private static Snapshot cut(double first, double second, double third, double adherence, CheckIn.Training training, int target) {
        List<WeighIn> weighIns = new ArrayList<>(daily(PLAN_START, PLAN_START.plusDays(6), String.valueOf(first)));
        weighIns.addAll(daily(PLAN_START.plusDays(7), PLAN_START.plusDays(13), String.valueOf(second)));
        weighIns.addAll(daily(PLAN_START.plusDays(14), TODAY, String.valueOf(third)));
        return new Snapshot(TODAY, Sex.MALE, Phase.CUT, PLAN_START, series(weighIns), Optional.empty())
                .withEnergy(new EnergyBudget(target, 300)).withProfile(new Profile(30, 180)).withObservingMaintenance(false)
                .withCheckIn(CheckIn.NONE.withAdherence(BigDecimal.valueOf(adherence)).withTraining(training));
    }

    private static String call(Snapshot snapshot) {
        Decision decision = DecisionPipeline.decide(snapshot, MALE);
        return decision.action() instanceof Action.AdjustCalories(int kcal)
                ? "adjust_calories:" + kcal + "/" + decision.reasons().getFirst().rule().value()
                : decision.action().type().name().toLowerCase() + "/" + decision.reasons().getFirst().rule().value();
    }

    @Test
    void theParametersTheCasesBelowAssume() {
        assertThat(List.of(MALE.number(ParameterKey.CUT_PACE_FLOOR_PCT_BODYWEIGHT), MALE.number(ParameterKey.WEEKLY_LOSS_CAP_PCT_BODYWEIGHT),
                MALE.number(ParameterKey.WEEKLY_LOSS_CAP_KG), (double) MALE.wholeNumber(ParameterKey.CUT_STEP_MIN_KCAL),
                (double) MALE.wholeNumber(ParameterKey.KCAL_PER_KG_FAT))).containsExactly(0.005, 0.01, 1.0, 500.0, 7000.0);
    }

    @Test
    void aHeavyManLosingUnderHalfAPercentTakesTheStep() {
        // 90 kg: floor 0.4465 kg a week; loses 0.35 (90.0 → 89.3 over 2 steps), 0.35 + 0.5 = 0.85 ≤ cap 0.893.
        assertThat(call(cut(90.0, 89.65, 89.3, 0.9, CheckIn.Training.STABLE, 3200))).isEqualTo("adjust_calories:-500/below_target_pace");
    }

    @Test
    void atOrOverTheFloorItKeepsGoing() {
        // 90 kg: 0.45 a week is over 0.4465.
        assertThat(call(cut(90.0, 89.55, 89.1, 0.9, CheckIn.Training.STABLE, 3200))).isEqualTo("continue/toward_goal");
    }

    @Test
    void aStepThatWouldTakeThePacePastTheCapIsNotMade() {
        // 59.42 kg: floor 0.297, cap 0.594; loses 0.29 a week (60.0 → 59.42, moving), 0.29 + 0.5 = 0.79 > 0.594: no step.
        assertThat(call(cut(60.0, 59.71, 59.42, 0.9, CheckIn.Training.STABLE, 2400))).isEqualTo("continue/toward_goal");
    }

    @Test
    void aPlanNotFollowedOrTrainingNotHoldingIsNotStepped() {
        assertThat(call(cut(90.0, 89.65, 89.3, 0.69, CheckIn.Training.STABLE, 3200))).isEqualTo("continue/toward_goal");
        assertThat(call(cut(90.0, 89.65, 89.3, 0.9, CheckIn.Training.DECLINING, 3200))).isEqualTo("continue/toward_goal");
    }

    @Test
    void aStepTheLadderFloorsStopIsNoCallAndTheCutKeepsGoing() {
        // A target 100 under resting energy + 500: the step would go under BMR (change_movement elsewhere), here it is no call.
        int resting = InitialTarget.restingKcal(Sex.MALE, new BigDecimal("89.3"), new Profile(30, 180), MALE);
        assertThat(call(cut(90.0, 89.65, 89.3, 0.9, CheckIn.Training.STABLE, resting + 400))).isEqualTo("continue/toward_goal");
    }

    @Test
    void aBulkIsNotTouched() {
        Snapshot bulk = new Snapshot(TODAY, Sex.MALE, Phase.BULK, PLAN_START, series(daily(PLAN_START, TODAY, "70.0")), Optional.empty())
                .withEnergy(new EnergyBudget(3000, 300)).withProfile(new Profile(30, 180)).withObservingMaintenance(false)
                .withCheckIn(CheckIn.NONE.withAdherence(new BigDecimal("0.9")).withTraining(CheckIn.Training.STABLE));
        assertThat(call(bulk)).doesNotContain("below_target_pace");
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    record Journey(int weightTenths, int lossHundredths, int adherencePct, int targetOffset) {

        Snapshot snapshot() {
            BigDecimal first = BigDecimal.valueOf(weightTenths, 1);
            BigDecimal loss = BigDecimal.valueOf(lossHundredths, 2);
            int resting = InitialTarget.restingKcal(Sex.MALE, first, new Profile(30, 180), MALE);
            return cut(first.doubleValue(), first.subtract(loss).doubleValue(), first.subtract(loss).subtract(loss).doubleValue(),
                    adherencePct / 100.0, CheckIn.Training.STABLE, resting + targetOffset);
        }
    }

    @Provide
    Arbitrary<Journey> journeys() {
        return Arbitraries.integers().between(500, 1500).flatMap(weight -> Arbitraries.integers().between(0, 70).flatMap(loss ->
                Arbitraries.integers().between(40, 100).flatMap(adherence ->
                        Arbitraries.integers().between(-200, 900).map(offset -> new Journey(weight, loss, adherence, offset)))));
    }

    @Property
    void theStepNeverTakesThePacePastTheCapNorTheTargetUnderRestingEnergy(@ForAll("journeys") Journey journey) {
        Snapshot snapshot = journey.snapshot();
        Decision decision = DecisionPipeline.decide(snapshot, MALE);
        if (!decision.reasons().getFirst().rule().value().equals("below_target_pace")) {
            return;
        }
        BigDecimal latest = BigDecimal.valueOf(journey.weightTenths(), 1).subtract(BigDecimal.valueOf(journey.lossHundredths() * 2L, 2));
        BigDecimal pace = BigDecimal.valueOf(journey.lossHundredths(), 2);
        BigDecimal cap = SafetyNet.weeklyLossCapKg(latest, MALE);
        int kcal = ((Action.AdjustCalories) decision.action()).kcalPerDay();

        assertThat(kcal).isEqualTo(-500);
        assertThat(pace.add(new BigDecimal("0.5"))).isLessThanOrEqualTo(cap);
        assertThat(pace).isLessThan(latest.multiply(new BigDecimal("0.005")).setScale(4, RoundingMode.HALF_UP).add(new BigDecimal("0.0001")));
        assertThat(snapshot.energy().get().targetKcal() + kcal)
                .isGreaterThanOrEqualTo(InitialTarget.restingKcal(Sex.MALE, latest, new Profile(30, 180), MALE));
        assertThat(journey.adherencePct()).isGreaterThanOrEqualTo(70);
    }
}
