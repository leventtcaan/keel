package app.keel.engine;

import static app.keel.engine.EngineFixtures.daily;
import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import net.jqwik.api.Assume;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;

/**
 * The projection only ever points toward the goal (U12, H2 §4.5): the end of a range that would go the other way stops at
 * today's weight — a worse body is never drawn — and every range keeps at least the error floor on the goal's side (U5).
 * More of the plan kept is never further from the goal. A losing range never reaches under BMI 18.5.
 */
class ForwardOnlyTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 4);

    @Property(tries = 150)
    void aCutsRangesNeverGoUpAndKeepTheFloorBelow(@ForAll @IntRange(min = 60, max = 140) int kg, @ForAll @IntRange(min = 155, max = 200) int cm,
            @ForAll @IntRange(min = 18, max = 75) int age, @ForAll boolean male, @ForAll @IntRange(min = 100, max = 1200) int deficit,
            @ForAll ActivityLevel activity) {
        Sex sex = male ? Sex.MALE : Sex.FEMALE;
        Profile profile = new Profile(age, cm);
        int maintenance = InitialTarget.estimate(sex, BigDecimal.valueOf(kg), profile, Optional.of(activity), parameters(sex)).maintenanceKcal();
        ShapeProjection.Projection projection = ShapeProjection.of(facts(sex, profile, kg, Phase.CUT, maintenance - deficit), parameters(sex));
        Assume.that(projection instanceof ShapeProjection.Shown);
        ShapeProjection.Shown shown = (ShapeProjection.Shown) projection;
        double floor = parameters(sex).number(ParameterKey.PROJECTION_ERROR_FLOOR_KG);
        double lowestKg = parameters(sex).number(ParameterKey.PROJECTION_MIN_BMI) * (cm / 100.0) * (cm / 100.0);

        assertThat(shown.direction()).isEqualTo(ShapeProjection.Direction.LOSS);
        for (ShapeProjection.Scenario scenario : shown.scenarios()) {
            assertThat(scenario.kg()).isLessThan(shown.todayKg());
            assertThat(scenario.highKg()).isLessThanOrEqualTo(shown.todayKg()).isGreaterThanOrEqualTo(scenario.kg());
            assertThat(scenario.kg().subtract(scenario.lowKg()).doubleValue()).isGreaterThanOrEqualTo(floor - 0.05);
            assertThat(scenario.lowKg().doubleValue()).isGreaterThanOrEqualTo(lowestKg - 0.05);
        }
        assertMoreKeptIsNeverFurtherBack(shown.scenarios(), true);
    }

    @Property(tries = 150)
    void aBulksRangesNeverGoDownAndKeepTheFloorAbove(@ForAll @IntRange(min = 50, max = 110) int kg, @ForAll @IntRange(min = 155, max = 200) int cm,
            @ForAll @IntRange(min = 18, max = 75) int age, @ForAll boolean male, @ForAll @IntRange(min = 100, max = 700) int surplus,
            @ForAll ActivityLevel activity) {
        Sex sex = male ? Sex.MALE : Sex.FEMALE;
        Profile profile = new Profile(age, cm);
        Assume.that(kg / ((cm / 100.0) * (cm / 100.0)) >= 16);
        int maintenance = InitialTarget.estimate(sex, BigDecimal.valueOf(kg), profile, Optional.of(activity), parameters(sex)).maintenanceKcal();
        ShapeProjection.Projection projection = ShapeProjection.of(facts(sex, profile, kg, Phase.BULK, maintenance + surplus), parameters(sex));
        Assume.that(projection instanceof ShapeProjection.Shown);
        ShapeProjection.Shown shown = (ShapeProjection.Shown) projection;
        double floor = parameters(sex).number(ParameterKey.PROJECTION_ERROR_FLOOR_KG);

        assertThat(shown.direction()).isEqualTo(ShapeProjection.Direction.GAIN);
        for (ShapeProjection.Scenario scenario : shown.scenarios()) {
            assertThat(scenario.kg()).isGreaterThan(shown.todayKg());
            assertThat(scenario.lowKg()).isGreaterThanOrEqualTo(shown.todayKg()).isLessThanOrEqualTo(scenario.kg());
            assertThat(scenario.highKg().subtract(scenario.kg()).doubleValue()).isGreaterThanOrEqualTo(floor - 0.05);
        }
        assertMoreKeptIsNeverFurtherBack(shown.scenarios(), false);
    }

    @Property(tries = 100)
    void aShownCutIsNeverUnderBmiTwenty(@ForAll @IntRange(min = 45, max = 140) int kg, @ForAll @IntRange(min = 155, max = 200) int cm,
            @ForAll boolean male, @ForAll @IntRange(min = 100, max = 900) int deficit) {
        Sex sex = male ? Sex.MALE : Sex.FEMALE;
        Profile profile = new Profile(35, cm);
        Assume.that(kg / ((cm / 100.0) * (cm / 100.0)) >= 16);
        int maintenance = InitialTarget.estimate(sex, BigDecimal.valueOf(kg), profile, Optional.empty(), parameters(sex)).maintenanceKcal();
        ShapeProjection.Projection projection = ShapeProjection.of(facts(sex, profile, kg, Phase.CUT, maintenance - deficit), parameters(sex));

        double bmi = kg / ((cm / 100.0) * (cm / 100.0));
        if (bmi < parameters(sex).number(ParameterKey.PROJECTION_LOSS_MIN_BMI)) {
            assertThat(projection).isEqualTo(new ShapeProjection.NotShown(ShapeProjection.Closed.LOW_BMI_LOSS));
        } else {
            assertThat(projection).isNotEqualTo(new ShapeProjection.NotShown(ShapeProjection.Closed.LOW_BMI_LOSS));
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    private static void assertMoreKeptIsNeverFurtherBack(List<ShapeProjection.Scenario> scenarios, boolean losing) {
        for (int i = 1; i < scenarios.size(); i++) {
            BigDecimal less = scenarios.get(i - 1).kg();
            BigDecimal more = scenarios.get(i).kg();
            assertThat(scenarios.get(i).adherence()).isGreaterThan(scenarios.get(i - 1).adherence());
            if (losing) {
                assertThat(more).isLessThanOrEqualTo(less);
            } else {
                assertThat(more).isGreaterThanOrEqualTo(less);
            }
        }
    }

    private static ShapeProjection.Facts facts(Sex sex, Profile profile, int kg, Phase phase, int targetKcal) {
        return new ShapeProjection.Facts(TODAY, sex, profile, Optional.empty(), phase,
                series(daily(TODAY.minusDays(34), TODAY, String.valueOf(kg))), targetKcal, false);
    }
}
