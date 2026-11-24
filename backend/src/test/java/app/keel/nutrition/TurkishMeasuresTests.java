package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

/** The Turkish household measures (K-1213): a su bardağı is 200 ml, and what it weighs depends on what is in it. */
class TurkishMeasuresTests {

    private static final TurkishMeasures MEASURES = TurkishMeasures.load();

    private static BigDecimal grams(String food, String unit) {
        return MEASURES.grams(food, unit).orElseThrow(() -> new AssertionError(unit + " of " + food));
    }

    @Test
    void aCupOfLiquidIs200AndOfOilLessAndOfFlourLess() {
        assertThat(grams("Milk, whole, 3.25% milkfat", "tr:su-bardagi")).isEqualByComparingTo("200");
        assertThat(grams("Water, bottled, generic", "tr:cay-bardagi")).isEqualByComparingTo("100");
        assertThat(grams("Oil, olive, salad or cooking", "tr:su-bardagi")).isEqualByComparingTo("180");
        assertThat(grams("Wheat flour, white, all-purpose", "tr:su-bardagi")).isLessThan(new BigDecimal("120"));
        assertThat(grams("Sugars, granulated", "tr:yemek-kasigi")).isEqualByComparingTo("12");
    }

    @Test
    void yogurtIsNotLiquidAndCookedGrainAndLegumesHaveTheirOwnRows() {
        assertThat(grams("Yogurt, plain, whole milk, 8 grams protein per 8 ounce", "tr:yemek-kasigi")).isEqualByComparingTo("25");
        assertThat(grams("Rice, white, long-grain, regular, enriched, cooked", "tr:su-bardagi")).isLessThan(new BigDecimal("160"));
        assertThat(grams("Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt", "tr:su-bardagi"))
                .isEqualByComparingTo("150");
        assertThat(MEASURES.grams("Rice, white, long-grain, regular, raw, enriched", "tr:su-bardagi")).as("raw rice is not cooked rice").isNotEqualTo(
                MEASURES.grams("Rice, white, long-grain, regular, enriched, cooked", "tr:su-bardagi"));
    }

    @Test
    void theLadlesAreForWhatIsLadled() {
        assertThat(grams("Milk, whole", "tr:corba-kepcesi")).isEqualByComparingTo("150");
        assertThat(MEASURES.grams("Egg, whole, raw, fresh", "tr:corba-kepcesi")).isEmpty();
    }

    @Test
    void aFoodOfNoClassHasNoMeasuresAndTurkishNamesAreRead() {
        assertThat(MEASURES.forFood("Egg, whole, raw, fresh")).isEmpty();
        assertThat(MEASURES.forFood("Süt")).extracting(TurkishMeasures.Measure::unit).contains("tr:su-bardagi");
        assertThat(MEASURES.forFood("Zeytinyağı").stream().map(TurkishMeasures.Measure::unit).toList()).as("a Turkish name, folded").isNotEmpty();
        List<TurkishMeasures.Measure> milk = MEASURES.forFood("Milk, whole");
        assertThat(milk).extracting(TurkishMeasures.Measure::unit).doesNotHaveDuplicates().allMatch(unit -> unit.startsWith("tr:"));
    }

    @Test
    void everyUnitHasItsWordsInBothLanguagesAndItsSourceIsOnTheRecordAsUnverified() {
        assertThat(MEASURES.units()).isNotEmpty();
        assertThat(MEASURES.source()).contains("TÜBER 2022").contains("Rakıcıoğlu").contains("[doğrulanmadı]");
    }
}
