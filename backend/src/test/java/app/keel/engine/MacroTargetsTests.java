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
 * Macro targets from a calorie target (K-108). Protein 2 g/kg of total bodyweight (Güray G3 K-18/K-19), 2.2 for women
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
        Macros macros = MacroTargets.forTarget(2500, new BigDecimal("80"), Sex.MALE, 30, MALE);

        assertThat(macros).isEqualTo(new Macros(160, 80, 285, 38, java.util.List.of()));
    }

    @Test
    void proteinIsPerKiloOfTotalBodyweightNotLeanMass() {
        // Güray G3 K-19: total bodyweight, even for a heavier person.
        assertThat(MacroTargets.forTarget(3000, new BigDecimal("110"), Sex.MALE, 30, MALE).proteinG()).isEqualTo(220);
    }

    @Test
    void aWoman45OrOlderGetsMoreProtein() {
        // 60 kg: 44 → 2.0 × 60 = 120 g; 45 → 2.2 × 60 = 132 g (J1 A5).
        assertThat(MacroTargets.forTarget(2000, new BigDecimal("60"), Sex.FEMALE, 44, FEMALE).proteinG()).isEqualTo(120);
        assertThat(MacroTargets.forTarget(2000, new BigDecimal("60"), Sex.FEMALE, 45, FEMALE).proteinG()).isEqualTo(132);
        assertThat(MacroTargets.forTarget(2000, new BigDecimal("60"), Sex.MALE, 50, MALE).proteinG()).isEqualTo(120);
    }

    @Test
    void fibreIsAFixedAmountNotAShareOfCalories() {
        assertThat(MacroTargets.forTarget(1800, new BigDecimal("60"), Sex.FEMALE, 30, FEMALE).fiberG()).isEqualTo(25);
        assertThat(MacroTargets.forTarget(3200, new BigDecimal("60"), Sex.FEMALE, 30, FEMALE).fiberG()).isEqualTo(25);
    }

    @Test
    void whenCarbsWouldFallUnderTheirFloorFatGivesWayFirst() {
        // 100 kg, 1700 kcal: protein 200 g (800) + fat 100 g (900) = 1700 → carbs 0 < 50.
        // Fat drops to make room for 50 g carbs (200 kcal): (1700 − 800 − 200) / 9 = 77.8 → 77 g, carbs (1700−800−693)/4 = 51.75 → 52 g.
        Macros macros = MacroTargets.forTarget(1700, new BigDecimal("100"), Sex.MALE, 30, MALE);

        assertThat(macros.proteinG()).isEqualTo(200);
        assertThat(macros.fatG()).isEqualTo(77);
        assertThat(macros.carbsG()).isEqualTo(52);
        assertThat(macros.notes()).extracting(Reason::rule).containsExactly(new RuleId("carb_squeeze"));
    }

    @Test
    void fatNeverGoesUnderItsFloorAndProteinIsNeverCut() {
        // 100 kg, 1400 kcal: protein 200 g (800) · fat at floor 50 g (450) · carbs (1400 − 1250) / 4 = 37.5 → 38 g < 50.
        // H3 Ç3 would cut protein to 1.8 g/kg; Güray's 2 g/kg wins (U14), so carbs stay short and that is reported.
        Macros macros = MacroTargets.forTarget(1400, new BigDecimal("100"), Sex.MALE, 30, MALE);

        assertThat(macros).isEqualTo(new Macros(200, 50, 38, 38, macros.notes()));
        assertThat(macros.notes()).extracting(Reason::rule).containsExactly(new RuleId("carb_squeeze"));
    }

    @Test
    void aWomansFatFloorIsHigher() {
        // 60 kg, 1100 kcal: protein 120 g (480) · fat floor 0.75 × 60 = 45 g (405) · carbs (1100 − 885) / 4 = 53.75 → 54 g.
        Macros macros = MacroTargets.forTarget(1100, new BigDecimal("60"), Sex.FEMALE, 30, FEMALE);

        assertThat(macros.fatG()).isGreaterThanOrEqualTo(45);
    }

    @Test
    void theSqueezeNamesItsResearch() {
        Macros macros = MacroTargets.forTarget(1400, new BigDecimal("100"), Sex.MALE, 30, MALE);

        assertThat(macros.notes()).containsExactly(new Reason(new RuleId("carb_squeeze"),
                new Source("arastirma/ham/H3-bosluk-literatur.md#Ç3", SourceTag.LITERATURE)));
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
    boolean withoutASqueezeTheGramsAddUpToTheTarget(
            @ForAll @IntRange(min = 1200, max = 5000) int kcal, @ForAll("bodyweights") BigDecimal kg, @ForAll Sex sex) {
        Macros m = MacroTargets.forTarget(kcal, kg, sex, 30, parameters(sex));
        int total = m.proteinG() * 4 + m.fatG() * 9 + m.carbsG() * 4;
        // Only carbs are rounded after protein and fat are fixed: at most half a gram of carbs = 2 kcal off.
        return !m.notes().isEmpty() || Math.abs(total - kcal) <= 2;
    }

    @Property
    boolean proteinAndTheFatFloorAreNeverTraded(
            @ForAll @IntRange(min = 800, max = 5000) int kcal, @ForAll("bodyweights") BigDecimal kg, @ForAll Sex sex) {
        Parameters p = parameters(sex);
        Macros m = MacroTargets.forTarget(kcal, kg, sex, 30, p);
        double perKg = p.number(ParameterKey.PROTEIN_G_PER_KG);
        return m.proteinG() >= Math.floor(kg.doubleValue() * perKg)
                && m.fatG() >= Math.floor(kg.doubleValue() * p.number(ParameterKey.FAT_G_PER_KG_MIN))
                && m.fatG() <= Math.ceil(kg.doubleValue() * p.number(ParameterKey.FAT_G_PER_KG_MAX));
    }

    @Property
    boolean withoutASqueezeMoreCaloriesNeverMeanFewerCarbs(
            @ForAll @IntRange(min = 800, max = 4900) int kcal, @ForAll @IntRange(min = 1, max = 100) int more,
            @ForAll("bodyweights") BigDecimal kg, @ForAll Sex sex) {
        // In a squeeze extra calories refill fat first (it gave way first), so carbs may wobble there; outside it,
        // every extra calorie is carbs.
        Parameters p = parameters(sex);
        Macros lower = MacroTargets.forTarget(kcal, kg, sex, 30, p);
        Macros higher = MacroTargets.forTarget(kcal + more, kg, sex, 30, p);
        return !lower.notes().isEmpty() || !higher.notes().isEmpty() || higher.carbsG() >= lower.carbsG();
    }

    @Property
    boolean carbsGoUnderTheirFloorOnlyOnceFatIsAtItsFloor(
            @ForAll @IntRange(min = 600, max = 5000) int kcal, @ForAll("bodyweights") BigDecimal kg, @ForAll Sex sex) {
        Parameters p = parameters(sex);
        Macros m = MacroTargets.forTarget(kcal, kg, sex, 30, p);
        int fatFloor = kg.multiply(BigDecimal.valueOf(p.number(ParameterKey.FAT_G_PER_KG_MIN)))
                .setScale(0, java.math.RoundingMode.HALF_UP).intValueExact();
        // Carbs are rounded, so "under the floor" means more than half a gram under.
        boolean carbsUnderFloor = m.carbsG() < p.number(ParameterKey.CARBS_MIN_G_PER_DAY) - 0.5;
        return !carbsUnderFloor || m.fatG() == fatFloor;
    }

    @Provide
    Arbitrary<BigDecimal> bodyweights() {
        return Arbitraries.bigDecimals().between(new BigDecimal("40"), new BigDecimal("160")).ofScale(1);
    }
}
