package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.math.BigDecimal;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.DoubleRange;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/**
 * The projection's energy balance model (K-605, ADR-051): Hall 2011 Lancet web appendix, equations 1-9
 * ({@code arastirma/ham/H12-enerji-dengesi-modeli.md} M2-M5), checked against the values the paper publishes (H12 M7).
 * The published values are rounded ("about 75 kg", "about 1 year"), so each comparison allows the rounding and no more.
 */
class EnergyBalanceModelTests {

    private static final double KJ_PER_KCAL = 4.184;
    private static final int YEAR = 365;
    // Hall's sedentary person: total expenditure 1.5 × resting (web appendix eq. 8).
    private static final double SEDENTARY_PAL = 1.5;

    // The paper's simulated man (figure 3): 100 kg, 180 cm, 23 years old, sedentary.
    private static final EnergyBalanceModel.Start MAN = sedentary(Sex.MALE, 100, 180, 23);

    // ── the published examples (H12 M7) ─────────────────────────────────────────────────────────────────────

    @Test
    void thePublishedManStartsOnThePublishedIntake() {
        // Figure 3: "a baseline of 12·7 MJ per day (3000 kcal per day)". Mifflin × 1.5 = 3022.5 kcal = 12.65 MJ.
        assertThat(MAN.maintenanceKcal() * KJ_PER_KCAL / 1000).isCloseTo(12.7, within(0.1));
    }

    @Test
    void fiveMegajoulesLessForSixMonthsLosesTwentyKilos() {
        // Figure 3: 5 MJ a day less "to lose 20 kg (44 lbs) in 6 months", then 10·9 MJ a day "to maintain the weight loss".
        double cut = MAN.maintenanceKcal() - kcal(5000);
        double keep = kcal(10_900);
        double[] weights = EnergyBalanceModel.weightsKg(MAN, day -> day < 180 ? cut : keep, 180 + 2 * YEAR, parameters(Sex.MALE));

        assertThat(weights[180]).isCloseTo(80, within(1.0));
        for (int day = 180; day < weights.length; day++) {
            assertThat(weights[day]).as("day %d", day).isCloseTo(80, within(1.5));
        }
    }

    @Test
    void twoMegajoulesLessPlateausNearSeventyFiveKilosHalfwayInAboutAYear() {
        // Figure 2A: a 100 kg sedentary man eats 2 MJ a day less → "a bodyweight plateau at about 75 kg over a 10-year
        // simulation taking roughly 1 year to reach half of the maximum weight loss and reaching 95% of this value after
        // about 3 years". The figure gives no height or age, so every plausible one is run; the plateau is held to the
        // figure's own ±4 kg spread (its dashed curves), the timing to "roughly 1 year" and "about 3 years". The figure 3
        // man (180 cm, 23) plateaus at 78.1 kg — ADR-051 records that gap.
        for (int cm = 170; cm <= 185; cm += 5) {
            for (int age = 23; age <= 55; age += 8) {
                EnergyBalanceModel.Start man = sedentary(Sex.MALE, 100, cm, age);
                double[] weights = constantCut(man, kcal(2000), 10 * YEAR);
                double total = man.weightKg() - weights[10 * YEAR];

                assertThat(weights[10 * YEAR]).as("%d cm, %d years", cm, age).isCloseTo(75, within(4.0));
                assertThat(firstDayLosing(weights, 0.5 * total)).as("%d cm, %d years", cm, age)
                        .isBetween((int) (0.7 * YEAR), (int) (1.4 * YEAR));
                assertThat(firstDayLosing(weights, 0.95 * total)).as("%d cm, %d years", cm, age)
                        .isBetween((int) (2.3 * YEAR), 4 * YEAR);
            }
        }
    }

    @Test
    void moreStartingFatLosesMoreAndTakesLonger() {
        // Figure 2B: the same 2 MJ a day less in a 100 kg and an 80 kg man — the heavier man loses more in the end, and takes
        // longer to reach half of it.
        EnergyBalanceModel.Start lighter = sedentary(Sex.MALE, 80, 180, 23);
        double[] heavy = constantCut(MAN, kcal(2000), 10 * YEAR);
        double[] light = constantCut(lighter, kcal(2000), 10 * YEAR);
        double heavyLoss = MAN.weightKg() - heavy[10 * YEAR];
        double lightLoss = lighter.weightKg() - light[10 * YEAR];

        assertThat(heavyLoss).isGreaterThan(lightLoss);
        assertThat(firstDayLosing(heavy, heavyLoss / 2)).isGreaterThan(firstDayLosing(light, lightLoss / 2));
    }

    @Test
    void aHundredKilojoulesADayIsAboutOneKiloInTheEnd() {
        // The rule of thumb "for an average overweight adult": every 100 kJ a day → about 1 kg eventually. An overweight
        // adult: 85 kg at 180 cm (BMI 26.2), 40 years old.
        EnergyBalanceModel.Start overweight = sedentary(Sex.MALE, 85, 180, 40);
        double[] weights = constantCut(overweight, kcal(100), 10 * YEAR);

        assertThat(overweight.weightKg() - weights[10 * YEAR]).isCloseTo(1.0, within(0.25));
    }

    // ── the model's own properties ──────────────────────────────────────────────────────────────────────────

    @Property(tries = 60)
    void eatingMaintenanceKeepsTheWeight(@ForAll @IntRange(min = 17, max = 45) int bmi, @ForAll @IntRange(min = 150, max = 200) int cm,
            @ForAll @IntRange(min = 18, max = 80) int age, @ForAll boolean male) {
        int kg = kgAt(bmi, cm);
        EnergyBalanceModel.Start start = sedentary(male ? Sex.MALE : Sex.FEMALE, kg, cm, age);
        double[] weights = EnergyBalanceModel.weightsKg(start, day -> start.maintenanceKcal(), YEAR, parameters(start.sex()));

        for (double weight : weights) {
            assertThat(weight).isCloseTo(kg, within(1e-6));
        }
    }

    @Property(tries = 60)
    void lessFoodIsNeverHeavier(@ForAll @IntRange(min = 55, max = 140) int kg, @ForAll @DoubleRange(min = 0, max = 1000) double lessKcal,
            @ForAll @DoubleRange(min = 1, max = 500) double evenLessKcal) {
        EnergyBalanceModel.Start start = sedentary(Sex.MALE, kg, 178, 35);
        double[] less = constantCut(start, lessKcal, YEAR);
        double[] evenLess = constantCut(start, lessKcal + evenLessKcal, YEAR);

        for (int day = 1; day <= YEAR; day++) {
            assertThat(evenLess[day]).as("day %d", day).isLessThan(less[day]);
        }
    }

    @Property(tries = 60)
    void aSteadyDeficitOnlyEverGoesDown(@ForAll @IntRange(min = 55, max = 140) int kg, @ForAll @DoubleRange(min = 50, max = 1000) double lessKcal,
            @ForAll boolean male) {
        EnergyBalanceModel.Start start = sedentary(male ? Sex.MALE : Sex.FEMALE, kg, 172, 30);
        double[] weights = constantCut(start, lessKcal, 3 * YEAR);

        for (int day = 1; day < weights.length; day++) {
            assertThat(weights[day]).as("day %d", day).isLessThan(weights[day - 1]);
        }
    }

    @Property(tries = 60)
    void aSteadySurplusOnlyEverGoesUp(@ForAll @IntRange(min = 60, max = 120) int kg, @ForAll @DoubleRange(min = 50, max = 800) double moreKcal) {
        EnergyBalanceModel.Start start = sedentary(Sex.MALE, kg, 180, 25);
        double[] weights = constantCut(start, -moreKcal, 3 * YEAR);

        for (int day = 1; day < weights.length; day++) {
            assertThat(weights[day]).as("day %d", day).isGreaterThan(weights[day - 1]);
        }
    }

    @Test
    void womenStartWithMoreFatSoTheSameDeficitLosesMore() {
        // Jackson 2002 (H12 M4): at the same weight, height and age a woman's starting fat is higher; more starting fat
        // means a larger eventual loss for the same deficit (H12 M6). Same expenditure for both, so only the fat differs.
        EnergyBalanceModel.Start man = sedentary(Sex.MALE, 80, 170, 30);
        EnergyBalanceModel.Start woman = new EnergyBalanceModel.Start(Sex.FEMALE, man.profile(), man.weightKg(), man.restingKcal(),
                man.maintenanceKcal());

        double manLoss = man.weightKg() - constantCut(man, kcal(1500), 10 * YEAR)[10 * YEAR];
        double womanLoss = woman.weightKg() - constantCut(woman, kcal(1500), 10 * YEAR)[10 * YEAR];

        assertThat(womanLoss).isGreaterThan(manLoss);
    }

    @Test
    void theTrajectoryStartsAtTheStartingWeightAndHasOneWeightPerDay() {
        double[] weights = constantCut(MAN, 500, 28);

        assertThat(weights).hasSize(29);
        assertThat(weights[0]).isEqualTo(100.0);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    private static EnergyBalanceModel.Start sedentary(Sex sex, int kg, int cm, int age) {
        Profile profile = new Profile(age, cm);
        int resting = InitialTarget.restingKcal(sex, BigDecimal.valueOf(kg), profile, parameters(sex));
        return new EnergyBalanceModel.Start(sex, profile, kg, resting, resting * SEDENTARY_PAL);
    }

    // Adults inside the starting-fat regression's range (Jackson 2002 turns negative near BMI 14).
    private static int kgAt(int bmi, int cm) {
        return (int) Math.round(bmi * (cm / 100.0) * (cm / 100.0));
    }

    private static double[] constantCut(EnergyBalanceModel.Start start, double lessKcal, int days) {
        double intake = start.maintenanceKcal() - lessKcal;
        return EnergyBalanceModel.weightsKg(start, day -> intake, days, parameters(start.sex()));
    }

    private static int firstDayLosing(double[] weights, double kg) {
        for (int day = 0; day < weights.length; day++) {
            if (weights[0] - weights[day] >= kg) {
                return day;
            }
        }
        return Integer.MAX_VALUE;
    }

    private static double kcal(double kj) {
        return kj / KJ_PER_KCAL;
    }
}
