package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.assertj.core.api.Assertions.withinPercentage;

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
    // theFirstWeeksAsTheyAreToday: the model's own values on 4 Oct 2026 (characterisation).
    private static final double DAY_1 = 99.29367629101705;
    private static final double DAY_7 = 98.16664265860435;
    private static final double DAY_28 = 95.56803110914063;

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
            assertThat(weights[day]).as("day %d", day).isCloseTo(80, within(1.0));
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

        double total = overweight.weightKg() - weights[10 * YEAR];

        assertThat(total).isCloseTo(1.0, within(0.25));
        // "with half of the weight change being achieved in about 1 year and 95% of the weight change in about 3 years".
        assertThat(firstDayLosing(weights, 0.5 * total)).isBetween((int) (0.7 * YEAR), (int) (1.4 * YEAR));
        assertThat(firstDayLosing(weights, 0.95 * total)).isBetween((int) (2.3 * YEAR), 4 * YEAR);
    }

    @Test
    void aSmallDeficitFollowsThePapersOwnLinearisation() {
        // Web appendix pp. 4-5 (H12 M6): once glycogen, fluid and adaptation settle, weight follows
        // dBW/dt = ΔEI/ρ − (BW − BW0)/τ, so it settles at ΔEI/ε and approaches it with τ (eq. 11-15). A deficit small enough
        // that α = 10.4 kg / F0 stays put makes this exact for the tissue part; the fast part settles at its own
        // equilibria (eq. 1: G = G0·√(EI/EIb); eq. 2: ECF − ECF0 = −ξCI·(1 − EI/EIb) / ξNa). The constants are the
        // paper's, written out here, so a wrong value in projection.yaml is caught too.
        EnergyBalanceModel.Start overweight = sedentary(Sex.MALE, 85, 180, 40);
        double deficitKj = 10;
        double weight = overweight.weightKg();
        double fat = weight / 100 * (0.14 * 40 + 37.31 * Math.log(weight / (1.8 * 1.8)) - 103.94);
        double alpha = 10.4 / fat;
        double restingKj = overweight.restingKcal() * KJ_PER_KCAL;
        double delta = ((1 - 0.1) * SEDENTARY_PAL - 1) * restingKj / weight;
        double tau = (750 + 39_500 + alpha * (960 + 7_600)) / (13 + delta + alpha * (92 + delta));
        double tissue = deficitKj * (1 - 0.1 - 0.14) * (1 + alpha) / (13 + alpha * 92 + delta * (1 + alpha));
        double ratio = 1 - deficitKj / (overweight.maintenanceKcal() * KJ_PER_KCAL);
        double fast = (1 + 2.7) * 0.5 * (1 - Math.sqrt(ratio)) + 4_000 * (1 - ratio) / 3_000;

        double[] weights = constantCut(overweight, kcal(deficitKj), 20 * YEAR);
        double settled = weights[20 * YEAR];
        double measuredTau = YEAR / Math.log((weights[YEAR] - settled) / (weights[2 * YEAR] - settled));

        assertThat(weight - settled).isCloseTo(tissue + fast, withinPercentage(2));
        assertThat(measuredTau).isCloseTo(tau, withinPercentage(1));
    }

    @Test
    void theFirstWeeksAsTheyAreToday() {
        // Characterisation, not a published value: the first weeks are the water and glycogen phase (eq. 1-2) and the
        // adaptation's 14 days (eq. 7), which no published number pins (H12 BULUNAMADI). Pinned so a change to them is a
        // decision, not an accident; ADR-051's "start settled on the plan" depends on this phase.
        double[] weights = constantCut(MAN, kcal(5000), 28);

        assertThat(weights[1]).isCloseTo(DAY_1, within(1e-6));
        assertThat(weights[7]).isCloseTo(DAY_7, within(1e-6));
        assertThat(weights[28]).isCloseTo(DAY_28, within(1e-6));
    }

    // ── starting partway through a diet (ADR-051 §4) ────────────────────────────────────────────────────────

    @Test
    void settledOnMaintenanceIsTheSameAsTheUsualStart() {
        double cut = MAN.maintenanceKcal() - kcal(2000);
        double[] usual = EnergyBalanceModel.weightsKg(MAN, day -> cut, 60, parameters(Sex.MALE));
        double[] settled = EnergyBalanceModel.weightsKg(MAN, MAN.maintenanceKcal(), day -> cut, 60, parameters(Sex.MALE));

        for (int day = 0; day <= 60; day++) {
            assertThat(settled[day]).as("day %d", day).isCloseTo(usual[day], within(1e-12));
        }
    }

    @Test
    void settledOnTheCutTheWaterIsAlreadyGoneAndTheFirstDayFollowsTheSecondPhase() {
        // Someone weeks into a cut has lost the glycogen water and fluid already (eq. 1-2) and adapted (eq. 7): starting
        // settled, the first day moves at the second phase's own slope, dBW/dt = ΔEI/ρ (eq. 12, 14), not the first days'.
        double deficitKj = 5000;
        double cut = MAN.maintenanceKcal() - kcal(deficitKj);
        double weight = MAN.weightKg();
        double fat = weight / 100 * (0.14 * 23 + 37.31 * Math.log(weight / (1.8 * 1.8)) - 103.94);
        double alpha = 10.4 / fat;
        double rho = (750 + 39_500 + alpha * 960 + alpha * 7_600) / ((1 - 0.24) * (1 + alpha));

        double[] settled = EnergyBalanceModel.weightsKg(MAN, cut, day -> cut, 2, parameters(Sex.MALE));
        double[] fresh = constantCut(MAN, kcal(deficitKj), 2);

        assertThat(settled[0]).isCloseTo(weight, within(1e-9));
        assertThat(weight - settled[1]).isCloseTo(deficitKj / rho, withinPercentage(3));
        assertThat(weight - fresh[1]).isGreaterThan(3 * (weight - settled[1]));
    }

    @Test
    void settledOnTheCutEatingMoreBringsSomeWaterBack() {
        // Settled on the cut, then eating maintenance again: glycogen and fluid refill — the first day goes up.
        double cut = MAN.maintenanceKcal() - kcal(5000);
        double[] weights = EnergyBalanceModel.weightsKg(MAN, cut, day -> MAN.maintenanceKcal(), 3, parameters(Sex.MALE));

        assertThat(weights[1]).isGreaterThan(weights[0]);
    }

    @Test
    void settledOnFastingIsAPossibleStart() {
        double[] weights = EnergyBalanceModel.weightsKg(MAN, 0, day -> 0, 3, parameters(Sex.MALE));

        assertThat(weights[0]).isCloseTo(MAN.weightKg(), within(1e-9));
        assertThat(weights[3]).isLessThan(weights[0]);
    }

    @Test
    void aSettledIntakeThatCannotBeEatenIsRefused() {
        assertThatThrownBy(() -> EnergyBalanceModel.weightsKg(MAN, Double.POSITIVE_INFINITY, day -> 2000, 3, parameters(Sex.MALE)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> EnergyBalanceModel.weightsKg(MAN, -1, day -> 2000, 3, parameters(Sex.MALE)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> EnergyBalanceModel.weightsKg(MAN, Double.NaN, day -> 2000, 3, parameters(Sex.MALE)))
                .isInstanceOf(IllegalArgumentException.class);
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
        assertThat(weights[0]).isCloseTo(100.0, within(1e-9));
    }

    // ── what the model refuses ──────────────────────────────────────────────────────────────────────────────

    @Test
    void anIntakeThatCannotBeEatenIsRefusedByDay() {
        // Review finding: a negative or missing intake ran on silently into negative glycogen and then NaN weights.
        for (double impossible : new double[] {-50, Double.NaN, Double.POSITIVE_INFINITY}) {
            assertThatThrownBy(() -> EnergyBalanceModel.weightsKg(MAN, day -> day == 3 ? impossible : 2500, 10, parameters(Sex.MALE)))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("day 3");
        }
    }

    @Test
    void zeroIntakeIsAPossibleDay() {
        // A fasting day is food intake of 0, not an error.
        double[] weights = EnergyBalanceModel.weightsKg(MAN, day -> 0, 3, parameters(Sex.MALE));

        assertThat(weights[3]).isLessThan(weights[0]);
    }

    @Test
    void maintenanceTooCloseToRestingEnergyIsOutsideTheModel() {
        // Eq. 8: physical activity δ = [(1 − βTEF) × PAL − 1] × RMR / BW is negative under PAL 1 / (1 − 0.1) ≈ 1.11 — no
        // source supports running the model there (review finding).
        EnergyBalanceModel.Start almostResting = new EnergyBalanceModel.Start(Sex.MALE, MAN.profile(), MAN.weightKg(), MAN.restingKcal(),
                MAN.restingKcal() * 1.05);

        assertThatThrownBy(() -> EnergyBalanceModel.weightsKg(almostResting, day -> 2000, 10, parameters(Sex.MALE)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("activity");
    }

    @Test
    void theParametersMustBeThePersonsSex() {
        assertThatThrownBy(() -> EnergyBalanceModel.weightsKg(MAN, day -> 2000, 10, parameters(Sex.FEMALE)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void eachDayIsEatenOnThatDay() {
        // Intake for day d moves the weight from day d to day d + 1, and no other.
        double cut = MAN.maintenanceKcal() - kcal(5000);
        double[] firstDayOnly = EnergyBalanceModel.weightsKg(MAN, day -> day == 0 ? cut : MAN.maintenanceKcal(), 2, parameters(Sex.MALE));
        double[] secondDayOnly = EnergyBalanceModel.weightsKg(MAN, day -> day == 1 ? cut : MAN.maintenanceKcal(), 2, parameters(Sex.MALE));
        double[] everyDay = constantCut(MAN, kcal(5000), 2);

        assertThat(firstDayOnly[1]).isCloseTo(everyDay[1], within(1e-12));
        assertThat(secondDayOnly[1]).isCloseTo(MAN.weightKg(), within(1e-12));
        assertThat(secondDayOnly[2]).isLessThan(secondDayOnly[1]);
    }

    @Test
    void zeroDaysIsTheStartingWeightAlone() {
        assertThat(constantCut(MAN, 500, 0)).containsExactly(100.0);
        assertThatThrownBy(() -> constantCut(MAN, 500, -1)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aStartThatIsNotAPersonIsRefused() {
        Profile profile = MAN.profile();
        assertThatThrownBy(() -> new EnergyBalanceModel.Start(Sex.MALE, profile, 0, 2000, 3000)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EnergyBalanceModel.Start(Sex.MALE, profile, Double.NaN, 2000, 3000))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EnergyBalanceModel.Start(Sex.MALE, profile, 80, 0, 3000)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EnergyBalanceModel.Start(Sex.MALE, profile, 80, 2000, 1999)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EnergyBalanceModel.Start(null, profile, 80, 2000, 3000)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new EnergyBalanceModel.Start(Sex.MALE, null, 80, 2000, 3000)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void aBodyOutsideTheStartingFatRegressionIsRefused() {
        // Jackson 2002 turns negative near BMI 14 in a young man (H12 M4): a starting fat under 0 is not a body.
        assertThatThrownBy(() -> constantCut(sedentary(Sex.MALE, 45, 180, 18), 500, 10))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("outside the model");
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
