package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import app.keel.nutrition.FoodRanges.Certainty;
import app.keel.nutrition.FoodRanges.Per100g;
import app.keel.nutrition.FoodRanges.Range;
import app.keel.nutrition.FoodRanges.Source;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.BigRange;
import net.jqwik.api.constraints.Scale;
import org.junit.jupiter.api.Test;

/**
 * An amount of food has one number and a range around it (ADR-090 #5 and Ek 8, #684): the range is centred on the number,
 * so the middle of a logged item's range is the portion's number the app showed (contract Portion: "the middle of the
 * range"), and it is never narrower than the uncentred range was on either side (U5).
 */
class CentredRangeTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    @Test
    void aPortionOf614KcalIsLoggedAs614InTheMiddleOfItsRange() {
        // 307 kcal per 100 g (an analysed mean), 200 g weighed: 307 × 2 = 614. The uncentred range was 524 to 710 (middle
        // 617): 614 × 0.9 × 0.95 = 524.97 and 614 × 1.1 × 1.05 = 709.17. The upper side is the wider one (95.17 over), so
        // the range is 614 ± 96, and the lower end reaches 518, below the old 524.
        Range kcal = FoodRanges.item(per100g("307"), Source.ANALYSED, new BigDecimal("200"), Certainty.WEIGHED, P).kcal();

        assertThat(kcal).isEqualTo(new Range(518, 710));
        assertThat(middle(kcal)).isEqualTo(614);
    }

    @Test
    void aValueTypedInAsOwnFoodShowsWhatWasTyped() {
        // 200 kcal per 100 g, 100 g measured: the number is 200 whichever side of it the range reaches further.
        Range kcal = FoodRanges.item(per100g("200"), Source.ANALYSED, new BigDecimal("100"), Certainty.MEASURED, P).kcal();

        assertThat(middle(kcal)).isEqualTo(200);
        assertThat(kcal.low()).as("not narrower than 200 × 0.9 × 0.75 = 135").isLessThanOrEqualTo(135);
        assertThat(kcal.high()).as("not narrower than 200 × 1.1 × 1.25 = 275").isGreaterThanOrEqualTo(275);
    }

    @Test
    void theCatalogueValuesAreNotCentred() {
        // The published per-100 g ranges stay what they were: they describe the database value, not an amount.
        assertThat(FoodRanges.per100g(per100g("165"), Source.ANALYSED, P).kcal()).isEqualTo(new Range(148, 182));
    }

    @Test
    void aTinyAmountStaysAtZeroOrAbove() {
        // 0.3 kcal: the number is 0, and a range cannot reach below it.
        Range kcal = FoodRanges.item(per100g("30"), Source.ANALYSED, new BigDecimal("1"), Certainty.ESTIMATED, P).kcal();

        assertThat(kcal.low()).isNotNegative();
        assertThat(middle(kcal)).isEqualTo(0);
    }

    @Test
    void aMealIsStillTheSumOfItsItemsAndItsMiddleTheSumOfTheirNumbers() {
        FoodRanges.Nutrients chicken = FoodRanges.item(per100g("165"), Source.ANALYSED, new BigDecimal("200"), Certainty.WEIGHED, P);
        FoodRanges.Nutrients cereal = FoodRanges.item(per100g("400"), Source.BRANDED, new BigDecimal("50"), Certainty.ESTIMATED, P);

        Range meal = FoodRanges.total(List.of(chicken, cereal)).kcal();

        assertThat(middle(meal)).isEqualTo(330 + 200);
    }

    @Property
    void theMiddleOfEveryItemRangeIsTheRoundedNumberTheRangeIsNeverNarrowerAndNeverBelowZero(
            @ForAll @BigRange(min = "0", max = "900") @Scale(1) BigDecimal kcal, @ForAll @BigRange(min = "0.1", max = "2000") @Scale(1) BigDecimal grams) {
        Per100g food = new Per100g(kcal, kcal, kcal, kcal);
        BigDecimal analysed = BigDecimal.valueOf(P.number(ParameterKey.ANALYSED_VALUE_ERROR_RATIO));
        BigDecimal label = BigDecimal.valueOf(P.number(ParameterKey.LABEL_VALUE_TOLERANCE_RATIO));
        for (Source source : Source.values()) {
            for (Certainty certainty : Certainty.values()) {
                FoodRanges.Nutrients item = FoodRanges.item(food, source, grams, certainty, P);
                BigDecimal amountError = BigDecimal.valueOf(P.number(switch (certainty) {
                    case WEIGHED -> ParameterKey.AMOUNT_ERROR_WEIGHED_RATIO;
                    case MEASURED -> ParameterKey.AMOUNT_ERROR_MEASURED_RATIO;
                    case ESTIMATED -> ParameterKey.AMOUNT_ERROR_ESTIMATED_RATIO;
                }));
                boolean branded = source == Source.BRANDED;
                // The value error as the uncentred range took it: energy and fat over a label by `label` (21 CFR 101.9(g)(5)),
                // protein and carbs under it by `label` ((g)(4)), the other side at the analysed error.
                BigDecimal over = branded ? label : analysed;
                check(item.kcal(), kcal, grams, analysed, over, amountError);
                check(item.fatG(), kcal, grams, analysed, over, amountError);
                check(item.proteinG(), kcal, grams, over, analysed, amountError);
                check(item.carbsG(), kcal, grams, over, analysed, amountError);
            }
        }
    }

    /** The Portion the app lists (FoodPortions) and the item it then logs (FoodRanges) say the same number. */
    @Property
    void thePortionNumberAndTheMiddleOfTheLoggedRangeAreTheSameWholeNumber(
            @ForAll @BigRange(min = "0", max = "900") @Scale(2) BigDecimal kcal, @ForAll @BigRange(min = "0.1", max = "2000") @Scale(3) BigDecimal grams) {
        Per100g value = new Per100g(kcal, kcal, kcal, kcal);
        FoodStore.Food food = new FoodStore.Food("test:one", "One", null, Source.ANALYSED, value, null, List.of(new FoodStore.Serving("1 serving", grams)));
        FoodPortions.Portion portion = FoodPortions.of(food, new FoodPortions.Settings(List.of())).portions().stream()
                .filter(candidate -> candidate.unit().equals("1 serving")).findFirst().orElseThrow();

        FoodRanges.Nutrients logged = FoodRanges.item(value, Source.ANALYSED, grams, Certainty.MEASURED, P);

        assertThat(middle(logged.kcal())).isEqualTo(Math.round(portion.kcal().doubleValue()));
        assertThat(middle(logged.proteinG())).isEqualTo(Math.round(portion.proteinG().doubleValue()));
        assertThat(middle(logged.carbsG())).isEqualTo(Math.round(portion.carbsG().doubleValue()));
        assertThat(middle(logged.fatG())).isEqualTo(Math.round(portion.fatG().doubleValue()));
    }

    private static void check(Range range, BigDecimal per100g, BigDecimal grams, BigDecimal valueDown, BigDecimal valueUp, BigDecimal amountError) {
        BigDecimal number = per100g.multiply(grams.divide(HUNDRED));
        BigDecimal oldLow = number.multiply(BigDecimal.ONE.subtract(valueDown)).multiply(BigDecimal.ONE.subtract(amountError));
        BigDecimal oldHigh = number.multiply(BigDecimal.ONE.add(valueUp)).multiply(BigDecimal.ONE.add(amountError));
        int rounded = number.setScale(4, RoundingMode.HALF_UP).setScale(0, RoundingMode.HALF_UP).intValueExact();

        assertThat(middle(range)).as("the middle is the number").isEqualTo(rounded);
        assertThat(range.low()).isNotNegative().isLessThanOrEqualTo(rounded);
        assertThat(range.high()).isGreaterThanOrEqualTo(rounded);
        assertThat(range.low()).as("never narrower below").isLessThanOrEqualTo(oldLow.setScale(0, RoundingMode.FLOOR).intValueExact());
        if (number.compareTo(BigDecimal.TEN) >= 0) {
            // From ten units up nothing is clamped at zero, so nothing is narrower on the upper side either.
            assertThat(range.high()).as("never narrower above").isGreaterThanOrEqualTo(oldHigh.setScale(0, RoundingMode.CEILING).intValueExact());
        }
    }

    private static int middle(Range range) {
        assertThat(range.low() + range.high()).as("an even sum, so the middle is a whole number").isEven();
        return (range.low() + range.high()) / 2;
    }

    private static Per100g per100g(String kcal) {
        return new Per100g(new BigDecimal(kcal), new BigDecimal("10"), new BigDecimal("10"), new BigDecimal("10"));
    }
}
