package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/**
 * Macro targets from a calorie target (K-108). Protein 2 g/kg of total bodyweight (coaching experience, G3 K-18/K-19), 2.2 for women
 * 45+ (J1 A5); fat from the top of its band down to its floor (G3 K-21, G2 K-22); carbs are what is left (03 §2.3);
 * fibre is absolute (H3 B11). Expected grams are worked out by hand with Atwater factors 4 / 9 / 4 kcal per gram.
 */
class MacroTargetsTests {

    private static final Parameters MALE = parameters(Sex.MALE);
    private static final Parameters FEMALE = parameters(Sex.FEMALE);

    @Test
    void theLiteralGramsBelowAssumeTodaysParameters() {
        assertThat(MALE.number(ParameterKey.PROTEIN_G_PER_KG)).isEqualTo(2.0);
        assertThat(FEMALE.number(ParameterKey.PROTEIN_G_PER_KG_FEMALE_45_PLUS)).isEqualTo(2.2);
        assertThat(MALE.number(ParameterKey.FAT_G_PER_KG_MAX)).isEqualTo(1.0);
        assertThat(MALE.number(ParameterKey.FAT_G_PER_KG_MIN)).isEqualTo(0.5);
        assertThat(FEMALE.number(ParameterKey.FAT_G_PER_KG_MIN)).isEqualTo(0.75);
        assertThat(MALE.number(ParameterKey.CARBS_MIN_G_PER_DAY)).isEqualTo(50.0);
        assertThat(FEMALE.wholeNumber(ParameterKey.PROTEIN_FEMALE_HIGHER_FROM_AGE)).isEqualTo(45);
    }

    @Test
    void aManAt80KgOn2500Kcal() {
        // protein 80 × 2 = 160 g (640 kcal) · fat 80 × 1.0 = 80 g (720 kcal) · carbs (2500 − 1360) / 4 = 285 g · fibre 38 g
        assertThat(MacroTargets.forTarget(2500, new BigDecimal("80"), Sex.MALE, 30, MALE))
                .isEqualTo(new MacroResult.Split(new Macros(160, 80, 285, 38, java.util.List.of())));
    }

    @Test
    void proteinIsPerKiloOfTotalBodyweightNotLeanMass() {
        // coaching experience, G3 K-19: total bodyweight, even for a heavier person.
        assertThat(split(3000, "110", Sex.MALE, 30).proteinG()).isEqualTo(220);
    }

    @Test
    void aWoman45OrOlderGetsMoreProtein() {
        // 60 kg: 44 → 2.0 × 60 = 120 g; 45 → 2.2 × 60 = 132 g (J1 A5).
        assertThat(split(2000, "60", Sex.FEMALE, 44).proteinG()).isEqualTo(120);
        assertThat(split(2000, "60", Sex.FEMALE, 45).proteinG()).isEqualTo(132);
        assertThat(split(2000, "60", Sex.MALE, 50).proteinG()).isEqualTo(120);
    }

    @Test
    void fibreIsAFixedAmountNotAShareOfCalories() {
        assertThat(split(1800, "60", Sex.FEMALE, 30).fiberG()).isEqualTo(25);
        assertThat(split(3200, "60", Sex.FEMALE, 30).fiberG()).isEqualTo(25);
    }

    @Test
    void whenCarbsWouldFallUnderTheirFloorFatGivesWayFirst() {
        // 100 kg, 1700 kcal: protein 200 g (800) + fat 100 g (900) = 1700 → carbs 0 < 50.
        // Fat drops to make room for 50 g carbs (200 kcal): (1700 − 800 − 200) / 9 = 77.8 → 77 g, carbs (1700−800−693)/4 = 51.75 → 52 g.
        Macros macros = split(1700, "100", Sex.MALE, 30);

        assertThat(macros.proteinG()).isEqualTo(200);
        assertThat(macros.fatG()).isEqualTo(77);
        assertThat(macros.carbsG()).isEqualTo(52);
        assertThat(macros.notes()).containsExactly(new Reason(new RuleId("fat_trimmed_for_carbs"),
                new Source("arastirma/ham/guray/G2-kilo-verme.md#K-22", SourceTag.EXPERIENCE)));
    }

    @Test
    void aTargetUnderProteinAndBothFloorsIsRefusedNotBent() {
        // 100 kg, 1400 kcal: protein 200 g (800) + fat floor 50 g (450) + carb floor 50 g (200) = 1450 kcal > 1400.
        // No split keeps the coaching protein (G3 K-18), fat floor (G2 K-22) and carb floor (03 §2.3: zero carb is rejected),
        // so none is invented; the smallest target that fits is reported instead (H3 Ç3: "don't cut this far").
        MacroResult result = MacroTargets.forTarget(1400, new BigDecimal("100"), Sex.MALE, 30, MALE);

        assertThat(result).isEqualTo(new MacroResult.TargetTooLow(1450, java.util.List.of(new Reason(new RuleId("carb_squeeze"),
                new Source("arastirma/ham/H3-bosluk-literatur.md#Ç3", SourceTag.LITERATURE)))));
    }

    @Test
    void aWomansHigherFatFloorMakesHerMinimumTargetHigher() {
        // 60 kg at 1000 kcal. Man: 480 + fat floor 30 g (270) + 200 = 950 ≤ 1000 → fits, fat (1000−480−200)/9 = 35 g.
        // Woman: 480 + fat floor 45 g (405) + 200 = 1085 > 1000 → too low. At exactly 1085 she fits with fat at 45 g.
        assertThat(split(1000, "60", Sex.MALE, 30).fatG()).isEqualTo(35);
        assertThat(MacroTargets.forTarget(1000, new BigDecimal("60"), Sex.FEMALE, 30, FEMALE))
                .isInstanceOfSatisfying(MacroResult.TargetTooLow.class, low -> assertThat(low.minimumKcal()).isEqualTo(1085));
        assertThat(split(1085, "60", Sex.FEMALE, 30)).isEqualTo(new Macros(120, 45, 50, 25, split(1085, "60", Sex.FEMALE, 30).notes()));
    }

    @Test
    void refusesNonsenseInputs() {
        assertThatThrownBy(() -> MacroTargets.forTarget(0, new BigDecimal("80"), Sex.MALE, 30, MALE))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> MacroTargets.forTarget(2000, BigDecimal.ZERO, Sex.MALE, 30, MALE))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> MacroTargets.forTarget(2000, new BigDecimal("80"), Sex.MALE, -1, MALE))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    @Property
    boolean everySplitAddsUpToTheTarget(
            @ForAll @IntRange(min = 600, max = 5000) int kcal, @ForAll("bodyweights") BigDecimal kg, @ForAll Sex sex,
            @ForAll @IntRange(min = 18, max = 80) int age) {
        // Only carbs are rounded after protein and fat are fixed: at most half a gram of carbs = 2 kcal off.
        return !(MacroTargets.forTarget(kcal, kg, sex, age, parameters(sex)) instanceof MacroResult.Split(Macros m))
                || Math.abs(m.proteinG() * 4 + m.fatG() * 9 + m.carbsG() * 4 - kcal) <= 2;
    }

    @Property
    boolean everySplitKeepsProteinAndAllThreeFloors(
            @ForAll @IntRange(min = 600, max = 5000) int kcal, @ForAll("bodyweights") BigDecimal kg, @ForAll Sex sex,
            @ForAll @IntRange(min = 18, max = 80) int age) {
        Parameters p = parameters(sex);
        if (!(MacroTargets.forTarget(kcal, kg, sex, age, p) instanceof MacroResult.Split(Macros m))) {
            return true;
        }
        return m.proteinG() >= Math.floor(kg.doubleValue() * p.number(ParameterKey.PROTEIN_G_PER_KG))
                && m.fatG() >= Math.floor(kg.doubleValue() * p.number(ParameterKey.FAT_G_PER_KG_MIN))
                && m.fatG() <= Math.ceil(kg.doubleValue() * p.number(ParameterKey.FAT_G_PER_KG_MAX))
                && m.carbsG() >= p.number(ParameterKey.CARBS_MIN_G_PER_DAY);
    }

    @Property
    boolean aRefusedTargetNamesAMinimumThatIsAboveItAndFits(
            @ForAll @IntRange(min = 600, max = 5000) int kcal, @ForAll("bodyweights") BigDecimal kg, @ForAll Sex sex,
            @ForAll @IntRange(min = 18, max = 80) int age) {
        Parameters p = parameters(sex);
        if (!(MacroTargets.forTarget(kcal, kg, sex, age, p) instanceof MacroResult.TargetTooLow(int minimum, var reasons))) {
            return true;
        }
        return minimum > kcal && MacroTargets.forTarget(minimum, kg, sex, age, p) instanceof MacroResult.Split;
    }

    @Property
    boolean moreCaloriesNeverMeanFewerCarbsOnceFatIsFull(
            @ForAll @IntRange(min = 800, max = 4900) int kcal, @ForAll @IntRange(min = 1, max = 100) int more,
            @ForAll("bodyweights") BigDecimal kg, @ForAll Sex sex) {
        // While fat is being trimmed, extra calories refill fat first (it gave way first); after that, every extra
        // calorie is carbs.
        Parameters p = parameters(sex);
        if (!(MacroTargets.forTarget(kcal, kg, sex, 30, p) instanceof MacroResult.Split(Macros lower))
                || !(MacroTargets.forTarget(kcal + more, kg, sex, 30, p) instanceof MacroResult.Split(Macros higher))) {
            return true;
        }
        return !lower.notes().isEmpty() || !higher.notes().isEmpty() || higher.carbsG() >= lower.carbsG();
    }

    private static Macros split(int kcal, String kg, Sex sex, int age) {
        MacroResult result = MacroTargets.forTarget(kcal, new BigDecimal(kg), sex, age, parameters(sex));
        assertThat(result).as(kcal + " kcal, " + kg + " kg").isInstanceOf(MacroResult.Split.class);
        return ((MacroResult.Split) result).macros();
    }

    @Provide
    Arbitrary<BigDecimal> bodyweights() {
        return Arbitraries.bigDecimals().between(new BigDecimal("40"), new BigDecimal("160")).ofScale(1);
    }
}
