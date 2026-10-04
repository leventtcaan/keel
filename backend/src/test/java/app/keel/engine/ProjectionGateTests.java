package app.keel.engine;

import static app.keel.engine.EngineFixtures.daily;
import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * When the shape projection is shown at all (K-613, U12, ADR-050, ADR-052): an adult, after 4 weeks of weigh-ins (first and
 * last at least 28 days apart), with a weight this week and a plan that moves toward a goal; under BMI 20 the losing
 * direction is closed and the gaining one stays open; a scenario that would lose faster than the engine's own weekly cap,
 * or reach under BMI 18.5, is not made.
 */
class ProjectionGateTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 4);
    private static final Profile ADULT = new Profile(30, 180);
    private static final Parameters MALE = parameters(Sex.MALE);
    // 90 kg, 180 cm, 30 years, active: resting 1880 kcal (Mifflin), maintenance 1880 × 1.75 = 3290.
    private static final int MAINTENANCE = 3290;

    // ── shown ───────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void anAdultFourWeeksIntoACutSeesThreeScenariosSixMonthsAhead() {
        ShapeProjection.Projection projection = ShapeProjection.of(cut(ADULT, "90", 35, MAINTENANCE - 500), MALE);

        assertThat(projection).isInstanceOf(ShapeProjection.Shown.class);
        ShapeProjection.Shown shown = (ShapeProjection.Shown) projection;
        assertThat(shown.direction()).isEqualTo(ShapeProjection.Direction.LOSS);
        assertThat(shown.todayKg()).isEqualByComparingTo("90.0");
        assertThat(shown.on()).isEqualTo(TODAY.plusWeeks(26));
        assertThat(shown.scenarios()).extracting(ShapeProjection.Scenario::adherence)
                .usingElementComparator(BigDecimal::compareTo).containsExactly(new BigDecimal("0.6"), new BigDecimal("0.8"), new BigDecimal("0.95"));
    }

    @Test
    void eachScenarioIsTheModelOnThatShareOfThePlan() {
        // 80 %: on four days in five the plan's 2790 kcal, on the fifth maintenance — 3290 − 0.8 × 500 = 2890 a day, starting
        // settled on the plan (ADR-051 §4). The number is the model's, rounded to 0.1 kg.
        ShapeProjection.Shown shown = (ShapeProjection.Shown) ShapeProjection.of(cut(ADULT, "90", 35, MAINTENANCE - 500), MALE);
        EnergyBalanceModel.Start start = new EnergyBalanceModel.Start(Sex.MALE, ADULT, 90, 1880, MAINTENANCE);
        double[] model = EnergyBalanceModel.weightsKg(start, MAINTENANCE - 500, day -> MAINTENANCE - 0.8 * 500, 26 * 7, MALE);

        assertThat(shown.scenarios().get(1).kg().doubleValue()).isCloseTo(model[26 * 7], within(0.05));
    }

    // ── closed ──────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void underEighteenIsClosed() {
        assertThat(ShapeProjection.of(cut(new Profile(17, 180), "90", 35, MAINTENANCE - 500), MALE))
                .isEqualTo(new ShapeProjection.NotShown(ShapeProjection.Closed.UNDER_AGE));
    }

    @Test
    void beforeFourWeeksOfWeighInsIsClosed() {
        // First and last weigh-in 27 days apart: not yet. 28: shown.
        assertThat(ShapeProjection.of(cut(ADULT, "90", 28, MAINTENANCE - 500), MALE))
                .isEqualTo(new ShapeProjection.NotShown(ShapeProjection.Closed.TOO_EARLY));
        assertThat(ShapeProjection.of(cut(ADULT, "90", 29, MAINTENANCE - 500), MALE)).isInstanceOf(ShapeProjection.Shown.class);
    }

    @Test
    void withoutAWeightThisWeekIsClosed() {
        // Weighed for six weeks, then nothing for the last ten days: today's weight is not known.
        WeightSeries old = series(daily(TODAY.minusDays(50), TODAY.minusDays(10), "90"));
        ShapeProjection.Facts facts = new ShapeProjection.Facts(TODAY, Sex.MALE, ADULT, Optional.of(ActivityLevel.ACTIVE), Phase.CUT, old,
                MAINTENANCE - 500, false);

        assertThat(ShapeProjection.of(facts, MALE)).isEqualTo(new ShapeProjection.NotShown(ShapeProjection.Closed.NO_RECENT_WEIGHT));
    }

    @Test
    void whileTheSafetyNetHoldsTheCutNothingIsProjected() {
        // The safety net runs first (U13): while a hard stop holds (SafetyHold), no number says where a loss would go.
        ShapeProjection.Facts open = cut(ADULT, "90", 35, MAINTENANCE - 500);
        ShapeProjection.Facts held = new ShapeProjection.Facts(open.today(), open.sex(), open.profile(), open.activity(), open.phase(),
                open.weights(), open.targetKcal(), true);

        assertThat(ShapeProjection.of(held, MALE)).isEqualTo(new ShapeProjection.NotShown(ShapeProjection.Closed.SAFETY_HOLD));
    }

    @Test
    void aPlanThatDoesNotMoveTowardTheGoalHasNothingToProject() {
        assertThat(ShapeProjection.of(cut(ADULT, "90", 35, MAINTENANCE), MALE))
                .isEqualTo(new ShapeProjection.NotShown(ShapeProjection.Closed.NO_DIRECTION));
        assertThat(ShapeProjection.of(facts(ADULT, "90", 35, Phase.BULK, MAINTENANCE - 100), MALE))
                .isEqualTo(new ShapeProjection.NotShown(ShapeProjection.Closed.NO_DIRECTION));
    }

    @Test
    void underBmiTwentyLosingIsClosedAndGainingIsOpen() {
        // 64 kg at 180 cm: BMI 19.75.
        assertThat(ShapeProjection.of(cut(ADULT, "64", 35, 2100), MALE))
                .isEqualTo(new ShapeProjection.NotShown(ShapeProjection.Closed.LOW_BMI_LOSS));
        ShapeProjection.Projection gaining = ShapeProjection.of(facts(ADULT, "64", 35, Phase.BULK, 3000), MALE);
        assertThat(gaining).isInstanceOf(ShapeProjection.Shown.class);
        assertThat(((ShapeProjection.Shown) gaining).direction()).isEqualTo(ShapeProjection.Direction.GAIN);
    }

    @Test
    void aCutThatWouldReachUnderBmiEighteenAndAHalfIsNotProjected() {
        // 66 kg at 180 cm (BMI 20.4) on a deep cut: every scenario's range reaches under 59.9 kg (BMI 18.5) in six months.
        assertThat(ShapeProjection.of(cut(ADULT, "66", 35, 1700), MALE))
                .isEqualTo(new ShapeProjection.NotShown(ShapeProjection.Closed.NO_SAFE_SCENARIO));
    }

    @Test
    void aScenarioFasterThanTheWeeklyCapIsNotMade() {
        // 1500 kcal under maintenance: kept at 95 % it would lose more than 1 % of the weight in a week at the start (safety.yaml
        // weekly_loss_cap_pct_bodyweight, H2 §4.3); at 60 % it does not.
        ShapeProjection.Shown shown = (ShapeProjection.Shown) ShapeProjection.of(cut(ADULT, "90", 35, MAINTENANCE - 1500), MALE);

        assertThat(shown.scenarios()).extracting(ShapeProjection.Scenario::adherence).usingElementComparator(BigDecimal::compareTo)
                .contains(new BigDecimal("0.6")).doesNotContain(new BigDecimal("0.95"));
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    private static ShapeProjection.Facts cut(Profile profile, String kg, int days, int targetKcal) {
        return facts(profile, kg, days, Phase.CUT, targetKcal);
    }

    /** Weighed every day for {@code days} days up to today, at {@code kg}; active. */
    private static ShapeProjection.Facts facts(Profile profile, String kg, int days, Phase phase, int targetKcal) {
        return new ShapeProjection.Facts(TODAY, Sex.MALE, profile, Optional.of(ActivityLevel.ACTIVE), phase,
                series(daily(TODAY.minusDays(days - 1L), TODAY, kg)), targetKcal, false);
    }
}
