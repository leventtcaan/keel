package app.keel.engine;

import static app.keel.engine.EngineFixtures.daily;
import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;

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
 * K-1203 (ADR-091 Ek 4, G2 K-8): the maintenance observation lasts at most two weeks; a cut whose weight held over them
 * starts its deficit on day 15, not a week or more later. The expected calls are written out by hand.
 */
class FirstDeficitTests {

    private static final Parameters MALE = parameters(Sex.MALE);
    private static final Parameters FEMALE = parameters(Sex.FEMALE);
    private static final LocalDate PLAN_START = LocalDate.of(2026, 9, 7);
    private static final Profile PROFILE = new Profile(30, 180);
    private static final int OBSERVATION_DAYS = MALE.wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS);

    private static LocalDate dayOfPlan(int day) {
        return PLAN_START.plusDays(day - 1L);
    }

    /** A man (or woman) on a plan from PLAN_START, weighing in every morning at {@code kg}, checking in on {@code day}. */
    private static Snapshot cut(Sex sex, int day, boolean observing, String kg) {
        return new Snapshot(dayOfPlan(day), sex, Phase.CUT, PLAN_START, series(daily(PLAN_START, dayOfPlan(day), kg)),
                java.util.Optional.of(new BigDecimal("30")))
                .withEnergy(new EnergyBudget(2848, 300))
                .withProfile(PROFILE)
                .withObservingMaintenance(observing)
                .withCheckIn(CheckIn.NONE.withAdherence(new BigDecimal("0.9")).withTraining(CheckIn.Training.STABLE));
    }

    private static Decision decide(Snapshot snapshot) {
        return DecisionPipeline.decide(snapshot, parameters(snapshot.sex()));
    }

    private static String call(Decision decision) {
        return decision.action() instanceof Action.AdjustCalories(int kcal)
                ? "adjust_calories:" + kcal + "/" + decision.reasons().getFirst().rule().value()
                : decision.action().type().name().toLowerCase() + "/" + decision.reasons().getFirst().rule().value();
    }

    @Test
    void theObservationIsTwoWeeksForAManAndTheTestsBelowAssumeIt() {
        assertThat(OBSERVATION_DAYS).isEqualTo(14);
    }

    @Test
    void aFlatCutStartsItsDeficitOnTheDayAfterTheTwoWeeks() {
        assertThat(call(decide(cut(Sex.MALE, 14, true, "80.0")))).isEqualTo("adjust_calories:-500/not_toward_goal");
    }

    @Test
    void theDayBeforeTheObservationIsOverIsStillWatching() {
        assertThat(call(decide(cut(Sex.MALE, 13, true, "80.0")))).isEqualTo("no_decision_yet/observing");
    }

    @Test
    void aCutThatWasClearlyLosingOnTheEstimateIsNotGivenADeficit() {
        // 80.0 → 79.3: 0.7 kg between the two weeks' means, past the 0.58 kg margin: toward the goal; the long read is kept, as on main.
        Snapshot snapshot = new Snapshot(dayOfPlan(14), Sex.MALE, Phase.CUT, PLAN_START, week(80.0, 79.3), java.util.Optional.empty())
                .withEnergy(new EnergyBudget(2848, 300)).withProfile(PROFILE).withObservingMaintenance(true)
                .withCheckIn(CheckIn.NONE.withAdherence(new BigDecimal("0.9")).withTraining(CheckIn.Training.STABLE));
        assertThat(call(decide(snapshot))).isEqualTo("no_decision_yet/window_not_full");
    }

    @Test
    void theFractionIsAQuarterOfTheNoiseMargin() {
        assertThat(MALE.number(ParameterKey.OBSERVATION_FLAT_FRACTION)).isEqualTo(0.25);
        assertThat(MALE.number(ParameterKey.FLAT_MARGIN_KG)).isEqualTo(0.58);
    }

    private static Snapshot twoWeeks(double first, double second) {
        return new Snapshot(dayOfPlan(14), Sex.MALE, Phase.CUT, PLAN_START, week(first, second), java.util.Optional.empty())
                .withEnergy(new EnergyBudget(2848, 300)).withProfile(PROFILE).withObservingMaintenance(true)
                .withCheckIn(CheckIn.NONE.withAdherence(new BigDecimal("0.9")).withTraining(CheckIn.Training.STABLE));
    }

    @Test
    void anAmbiguousLoserOrAGainerKeepsTheLongReadAndGetsNoDayFifteenCut() {
        // Weekly means 80.0 → 79.5 (0.5 a week), 79.71, 79.8 (0.2) and a gain of 1.5 or 0.2 are all beyond 0.145 either way.
        for (double second : new double[] {79.5, 79.71, 79.8, 80.2, 81.5}) {
            assertThat(call(decide(twoWeeks(80.0, second)))).as("second week %s", second).isEqualTo("no_decision_yet/window_not_full");
        }
    }

    @Test
    void aWeightHeldWithinAQuarterOfTheMarginStartsTheDeficit() {
        for (double second : new double[] {79.9, 80.0, 80.1, 79.86, 80.14}) {
            assertThat(call(decide(twoWeeks(80.0, second)))).as("second week %s", second).isEqualTo("adjust_calories:-500/not_toward_goal");
        }
    }

    @Test
    void thereIsNoWaitForOneMoreFlatWeekAfterTheObservation() {
        // The observation's two flat weeks are the wait (K-8); a plan that is not the estimate still waits its 21 days.
        assertThat(call(decide(cut(Sex.MALE, 14, true, "80.0")))).doesNotContain("wait_one_more_week");
        assertThat(call(decide(cut(Sex.MALE, 14, false, "80.0")))).isEqualTo("no_decision_yet/window_not_full");
    }

    @Test
    void aBulkStillWaitsForItsFullWindow() {
        Snapshot bulk = new Snapshot(dayOfPlan(14), Sex.MALE, Phase.BULK, PLAN_START, series(daily(PLAN_START, dayOfPlan(14), "70.0")),
                java.util.Optional.empty()).withEnergy(new EnergyBudget(3000, 300)).withProfile(PROFILE).withObservingMaintenance(true)
                .withCheckIn(CheckIn.NONE.withAdherence(new BigDecimal("0.9")).withTraining(CheckIn.Training.STABLE));
        assertThat(call(decide(bulk))).isEqualTo("no_decision_yet/window_not_full");
    }

    @Test
    void aWomansObservationIsHerFullFourWeeksAsBefore() {
        assertThat(call(decide(cut(Sex.FEMALE, 14, true, "65.0")))).isEqualTo("no_decision_yet/observing");
        assertThat(call(decide(cut(Sex.FEMALE, 27, true, "65.0")))).isEqualTo("no_decision_yet/observing");
        assertThat(FEMALE.wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS)).isEqualTo(28);
    }

    @Test
    void afterTheWindowOfThreeWeeksHasFilledTheNormalWindowReadsAgain() {
        // Day 21 of a plan still on its estimate (a "continue" leaves it so): the 21 days are the window again.
        WeightSeries flat = series(daily(PLAN_START, dayOfPlan(21), "80.0"));
        assertThat(DecisionWindow.days(Phase.CUT, true, PLAN_START, dayOfPlan(14), flat, MALE)).isEqualTo(14);
        assertThat(DecisionWindow.days(Phase.CUT, true, PLAN_START, dayOfPlan(20), flat, MALE)).isEqualTo(14);
        assertThat(DecisionWindow.days(Phase.CUT, true, PLAN_START, dayOfPlan(21), flat, MALE)).isEqualTo(21);
        assertThat(DecisionWindow.days(Phase.CUT, false, PLAN_START, dayOfPlan(14), flat, MALE)).isEqualTo(21);
        assertThat(DecisionWindow.days(Phase.BULK, true, PLAN_START, dayOfPlan(14), flat, MALE)).isEqualTo(21);
        assertThat(DecisionWindow.days(Phase.CUT, true, PLAN_START, dayOfPlan(14), flat, FEMALE)).isEqualTo(28);
    }

    @Test
    void theFirstDeficitIsNotHeldBackByTheSpacingBetweenChanges() {
        // calorie_change_min_wait_weeks counts from the last change; the observation is no change.
        Decision decision = decide(cut(Sex.MALE, 14, true, "80.0"));
        assertThat(decision.reasons().getFirst().rule().value()).isNotEqualTo("calorie_change_too_soon");
    }

    /** Two weeks of daily weigh-ins, the mean of the first {@code first}, of the second {@code second}. */
    private static WeightSeries week(double first, double second) {
        List<WeighIn> weighIns = new ArrayList<>();
        weighIns.addAll(daily(PLAN_START, PLAN_START.plusDays(6), String.valueOf(first)));
        weighIns.addAll(daily(PLAN_START.plusDays(7), PLAN_START.plusDays(13), String.valueOf(second)));
        return series(weighIns);
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    /** A man on day 14 of a cut still on its estimate, weighing in daily: his two weekly weights, age, height, adherence. */
    record Observed(int weightTenths, int secondWeekChangeTenths, int age, int heightCm, int adherencePct) {

        Snapshot snapshot() {
            BigDecimal first = BigDecimal.valueOf(weightTenths, 1);
            BigDecimal second = first.add(BigDecimal.valueOf(secondWeekChangeTenths, 1));
            List<WeighIn> weighIns = new ArrayList<>(daily(PLAN_START, PLAN_START.plusDays(6), first.toPlainString()));
            weighIns.addAll(daily(PLAN_START.plusDays(7), PLAN_START.plusDays(13), second.toPlainString()));
            int maintenance = InitialTarget.estimate(Sex.MALE, first, new Profile(age, heightCm), java.util.Optional.empty(), MALE)
                    .maintenanceKcal();
            return new Snapshot(dayOfPlan(14), Sex.MALE, Phase.CUT, PLAN_START, series(weighIns), java.util.Optional.empty())
                    .withEnergy(new EnergyBudget(maintenance, 300)).withProfile(new Profile(age, heightCm))
                    .withObservingMaintenance(true)
                    .withCheckIn(CheckIn.NONE.withAdherence(BigDecimal.valueOf(adherencePct, 2)).withTraining(CheckIn.Training.STABLE));
        }
    }

    @Provide
    Arbitrary<Observed> observed() {
        return Arbitraries.integers().between(450, 1500).flatMap(weight -> Arbitraries.integers().between(-20, 20).flatMap(change ->
                Arbitraries.integers().between(18, 70).flatMap(age -> Arbitraries.integers().between(145, 205).flatMap(height ->
                        Arbitraries.integers().between(40, 100).map(adherence -> new Observed(weight, change, age, height, adherence))))));
    }

    @Property
    void theFirstDeficitNeverGoesUnderRestingEnergy(@ForAll("observed") Observed observed) {
        Snapshot snapshot = observed.snapshot();
        Decision decision = DecisionPipeline.decide(snapshot, MALE);

        if (decision.action() instanceof Action.AdjustCalories(int kcal) && kcal < 0) {
            BigDecimal weight = WeightTrend.at(snapshot.weights(), snapshot.today(), MALE.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS))
                    .orElseThrow();
            int resting = InitialTarget.restingKcal(Sex.MALE, weight, snapshot.profile().get(), MALE);
            assertThat(snapshot.energy().get().targetKcal() + kcal).isGreaterThanOrEqualTo(resting);
        }
    }

    @Property
    void aDeficitIsNeverMoreThanOneStepAndNeverOnDayThirteen(@ForAll("observed") Observed observed) {
        Snapshot day14 = observed.snapshot();
        if (DecisionPipeline.decide(day14, MALE).action() instanceof Action.AdjustCalories(int kcal) && kcal < 0) {
            assertThat(-kcal).isEqualTo(500);
        }
        Snapshot day13 = new Snapshot(day14.today().minusDays(1), Sex.MALE, Phase.CUT, PLAN_START,
                new WeightSeries(day14.weights().between(PLAN_START, day14.today().minusDays(1))), java.util.Optional.empty())
                .withEnergy(day14.energy().get()).withProfile(PROFILE).withObservingMaintenance(true).withCheckIn(day14.checkIn());
        assertThat(DecisionPipeline.decide(day13, MALE).action()).isEqualTo(new Action.NoDecisionYet());
    }

    @Property
    void noDayFifteenCutWhenTheWeightMovesEitherWayByTheFractionOfTheMargin(@ForAll("observed") Observed observed) {
        double limit = MALE.number(ParameterKey.FLAT_MARGIN_KG) * MALE.number(ParameterKey.OBSERVATION_FLAT_FRACTION);
        double change = Math.abs(observed.secondWeekChangeTenths() / 10.0);
        if (change >= limit) {
            Decision decision = DecisionPipeline.decide(observed.snapshot(), MALE);
            assertThat(decision.action() instanceof Action.AdjustCalories(int kcal) && kcal < 0).isFalse();
        }
    }

    @Property
    void aHeldWeightGetsADayFifteenCall(@ForAll("observed") Observed observed) {
        // Positive side: within the threshold (±0.1 kg at tenths) the 14-day read is taken, so day 14 is a call, not "not yet".
        if (Math.abs(observed.secondWeekChangeTenths()) <= 1 && observed.adherencePct() >= 70) {
            Decision decision = DecisionPipeline.decide(observed.snapshot(), MALE);
            assertThat(decision.reasons().getFirst().rule().value()).isNotIn("window_not_full", "observing", "data_insufficient");
        }
    }
}
