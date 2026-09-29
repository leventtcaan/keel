package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import app.keel.nutrition.FoodRanges.Certainty;
import app.keel.nutrition.FoodRanges.Item;
import app.keel.nutrition.FoodRanges.Nutrients;
import app.keel.nutrition.FoodRanges.Per100g;
import app.keel.nutrition.FoodRanges.Range;
import app.keel.nutrition.FoodRanges.Source;
import java.math.BigDecimal;
import java.util.List;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.BigRange;
import net.jqwik.api.constraints.Scale;
import org.junit.jupiter.api.Test;

/**
 * A food's energy and macros as ranges (K-208, U5, arastirma/ham/H7-besin-araligi.md): the database value's error (an
 * analysis mean ±10 %; a label one-sided by law: energy and fat up to +20 %, protein and carbs down to −20 %) times the
 * amount's error (weighed ±5 %, a serving ±25 %, eyeballed ±50 %). Low rounds down, high rounds up.
 */
class RangeTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final Per100g CHICKEN = per100g("165", "31", "0", "3.6");   // analysed
    private static final Per100g CEREAL = per100g("400", "10", "70", "8");     // a label
    private static final Per100g RICE = per100g("130", "2.7", "28", "0.3");    // analysed

    @Test
    void anAnalysedValueIsPlusOrMinusTenPercent() {
        assertThat(FoodRanges.per100g(CHICKEN, Source.ANALYSED, P))
                .isEqualTo(new Nutrients(new Range(148, 182), new Range(27, 35), new Range(0, 0), new Range(3, 4)));
    }

    @Test
    void aLabelIsOneSidedAsTheLawAllows() {
        // 21 CFR 101.9(g)(5): energy and fat at most 20 % over the label; (g)(4): protein and carbs at least 80 % of it.
        assertThat(FoodRanges.per100g(CEREAL, Source.BRANDED, P))
                .isEqualTo(new Nutrients(new Range(400, 480), new Range(8, 10), new Range(56, 70), new Range(8, 10)));
    }

    @Test
    void weighedChicken() {
        // 165 × 0.9 × 2 × 0.95 = 282.15 → 282; 165 × 1.1 × 2 × 1.05 = 381.15 → 382
        assertThat(FoodRanges.item(CHICKEN, Source.ANALYSED, new BigDecimal("200"), Certainty.WEIGHED, P))
                .isEqualTo(new Nutrients(new Range(282, 382), new Range(53, 72), new Range(0, 0), new Range(6, 9)));
    }

    @Test
    void eyeballedCereal() {
        // 400 × 0.5 × 0.5 = 100; 480 × 0.5 × 1.5 = 360
        assertThat(FoodRanges.item(CEREAL, Source.BRANDED, new BigDecimal("50"), Certainty.ESTIMATED, P))
                .isEqualTo(new Nutrients(new Range(100, 360), new Range(2, 8), new Range(14, 53), new Range(2, 8)));
    }

    @Test
    void aCupOfRice() {
        // 130 × 0.9 × 1.58 × 0.75 = 138.645 → 138; 130 × 1.1 × 1.58 × 1.25 = 282.425 → 283
        assertThat(FoodRanges.item(RICE, Source.ANALYSED, new BigDecimal("158"), Certainty.MEASURED, P).kcal())
                .isEqualTo(new Range(138, 283));
    }

    @Test
    void aMealIsTheSumOfItsItems() {
        Nutrients chicken = FoodRanges.item(CHICKEN, Source.ANALYSED, new BigDecimal("200"), Certainty.WEIGHED, P);
        Nutrients cereal = FoodRanges.item(CEREAL, Source.BRANDED, new BigDecimal("50"), Certainty.ESTIMATED, P);

        assertThat(FoodRanges.total(List.of(chicken, cereal)))
                .isEqualTo(new Nutrients(new Range(382, 742), new Range(55, 80), new Range(14, 53), new Range(8, 17)));
    }

    @Test
    void theGramQuestionIsForTheWidestUnweighedItemAsWideAsTheSmallestCalorieStep() {
        // bulk_step_kcal (250): one item's uncertainty as large as a decision step is worth one question (H7 §7).
        Item weighedWide = new Item("chicken", nutrientsWithKcal(0, 400), Certainty.WEIGHED);
        Item eyeballed = new Item("cereal", nutrientsWithKcal(100, 360), Certainty.ESTIMATED);
        Item narrow = new Item("rice", nutrientsWithKcal(100, 349), Certainty.ESTIMATED);

        assertThat(FoodRanges.question(List.of(weighedWide, eyeballed, narrow), P)).contains("cereal");
        assertThat(FoodRanges.question(List.of(weighedWide, narrow), P)).as("249 wide, and weighed").isEmpty();
        assertThat(FoodRanges.question(List.of(new Item("rice", nutrientsWithKcal(100, 350), Certainty.MEASURED)), P)).contains("rice");
    }

    @Property
    void lowNeverAboveHighNeverNegativeAndAWeighedAmountIsTheNarrowest(
            @ForAll @BigRange(min = "0", max = "900") @Scale(1) BigDecimal kcal, @ForAll @BigRange(min = "0.1", max = "2000") @Scale(1) BigDecimal grams) {
        Per100g food = per100g(kcal.toPlainString(), "10", "10", "10");
        for (Source source : Source.values()) {
            Range weighed = FoodRanges.item(food, source, grams, Certainty.WEIGHED, P).kcal();
            Range measured = FoodRanges.item(food, source, grams, Certainty.MEASURED, P).kcal();
            Range estimated = FoodRanges.item(food, source, grams, Certainty.ESTIMATED, P).kcal();

            assertThat(weighed.low()).isNotNegative().isLessThanOrEqualTo(weighed.high());
            assertThat(measured.low()).isLessThanOrEqualTo(weighed.low());
            assertThat(measured.high()).isGreaterThanOrEqualTo(weighed.high());
            assertThat(estimated.low()).isLessThanOrEqualTo(measured.low());
            assertThat(estimated.high()).isGreaterThanOrEqualTo(measured.high());
            if (kcal.multiply(grams).compareTo(BigDecimal.valueOf(10_000)) >= 0) {
                // An item of 100 kcal or more (below, whole-kcal rounding can make both 2 wide): an eyeballed amount is
                // strictly less certain than a weighed one.
                assertThat(estimated.high() - estimated.low()).isGreaterThan(weighed.high() - weighed.low());
            }
        }
    }

    private static Nutrients nutrientsWithKcal(int low, int high) {
        return new Nutrients(new Range(low, high), new Range(0, 0), new Range(0, 0), new Range(0, 0));
    }

    private static Per100g per100g(String kcal, String protein, String carbs, String fat) {
        return new Per100g(new BigDecimal(kcal), new BigDecimal(protein), new BigDecimal(carbs), new BigDecimal(fat));
    }
}
