package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Reading USDA's Branded Foods release as a stream (K-1061, ADR-008: CC0) from a small sample in the real release's format:
 * the barcode, brand and label serving of each product, the label's four nutrients per 100 g, and what is skipped (never guessed).
 */
class FdcBrandedTests {

    private static final Path BRANDED = Path.of("src/test/resources/fdc/branded");

    private static List<FdcBranded.Food> read() {
        List<FdcBranded.Food> foods = new ArrayList<>();
        FdcBranded.Result result = FdcBranded.stream(BRANDED, foods::add);
        assertThat(result.foods()).isEqualTo(foods.size());
        return foods;
    }

    private static FdcBranded.Food food(String id) {
        return read().stream().filter(food -> food.id().equals(id)).findFirst().orElseThrow();
    }

    @Test
    void completeProductsComeOutInFoodCsvOrderAndTheOthersAreSkippedAndCounted() {
        List<FdcBranded.Food> foods = new ArrayList<>();

        FdcBranded.Result result = FdcBranded.stream(BRANDED, foods::add);

        assertThat(foods).extracting(FdcBranded.Food::id).containsExactly("fdc:2001", "fdc:2002", "fdc:2003", "fdc:2004", "fdc:2008", "fdc:2010");
        // 2005 has no protein, 2006 is on the Canadian market, 2007 has 950 kcal a hundred grams; 2009 is not a branded row at all.
        assertThat(result.skipped()).isEqualTo(3);
        assertThat(result.foods()).isEqualTo(6);
    }

    @Test
    void theBarcodeIsPaddedToFourteenDigitsAndATextThatIsNoBarcodeIsNone() {
        assertThat(food("fdc:2001").gtin()).as("a UPC-A").isEqualTo("00016000275287");
        assertThat(food("fdc:2002").gtin()).isEqualTo("00818290010004");
        assertThat(food("fdc:2004").gtin()).as("blank").isNull();
        assertThat(food("fdc:2010").gtin()).as("not digits").isNull();
    }

    @Test
    void capitalsAreShownAsWordsButSomeonesOwnSpellingStays() {
        assertThat(food("fdc:2001").name()).isEqualTo("Cheerios Cereal");
        assertThat(food("fdc:2004").name()).as("an apostrophe does not start a word").isEqualTo("Campbell's Clam Chowder");
        assertThat(food("fdc:2010").name()).isEqualTo("Raw Chicken, \"Breast\"");
        assertThat(food("fdc:2008").name()).as("mixed case is left as written").isEqualTo("Almond Butter");
        assertThat(FdcBranded.tidyCase("  2% MILK / SKIM-FREE ")).isEqualTo("2% Milk / Skim-Free");
    }

    @Test
    void theBrandIsTheBrandNameElseTheOwner() {
        assertThat(food("fdc:2001").brand()).isEqualTo("Cheerios");
        assertThat(food("fdc:2003").brand()).as("no brand name: the owner as written").isEqualTo("Richardson Oilseed Products (US) Limited");
        assertThat(food("fdc:2004").brand()).isEqualTo("Campbell Soup Company");
    }

    @Test
    void theLabelsFourNutrientsPerHundredGramsWithFdcsFallbacks() {
        FdcBranded.Food cheerios = food("fdc:2001");
        assertThat(cheerios.kcal()).isEqualByComparingTo("357");
        assertThat(cheerios.proteinG()).isEqualByComparingTo("10.71");
        assertThat(cheerios.fatG()).isEqualByComparingTo("7.14");
        assertThat(cheerios.carbsG()).isEqualByComparingTo("71.43");
        FdcBranded.Food yogurt = food("fdc:2002");
        assertThat(yogurt.kcal()).as("Atwater specific when there is no 1008").isEqualByComparingTo("88");
        assertThat(yogurt.carbsG()).as("by summation when there is no by difference").isEqualByComparingTo("11.3");
        assertThat(food("fdc:2008").carbsG()).as("FDC's rounding under zero is zero").isEqualByComparingTo("0");
    }

    @Test
    void theLabelServingKeepsTheHouseholdTextWithTheMetricAmount() {
        // "1 CUP (28g)" already says its weight; "2 tbsp" does not, so it is added.
        assertThat(food("fdc:2001").serving()).isEqualTo(new FdcImport.Serving("1 cup (28g)", new BigDecimal("28.00")));
        assertThat(food("fdc:2002").serving()).isEqualTo(new FdcImport.Serving("1 container (150g)", new BigDecimal("150.00")));
        assertThat(food("fdc:2008").serving()).isEqualTo(new FdcImport.Serving("2 tbsp (32 g)", new BigDecimal("32.00")));
    }

    @Test
    void householdTextThatIsNotAMeasureFallsBackToOneServingInGramsAndNoSizeIsNoServing() {
        assertThat(food("fdc:2004").serving()).as("\"PER CONTAINER\"").isEqualTo(new FdcImport.Serving("1 serving (440 g)", new BigDecimal("440.00")));
        assertThat(food("fdc:2010").serving()).as("no serving size").isNull();
    }

    @Test
    void aServingInMillilitresIsWeighedAsWaterAndItsHouseholdVolumeGivesTheDensity() {
        FdcBranded.Food oil = food("fdc:2003");

        assertThat(oil.serving()).isEqualTo(new FdcImport.Serving("1 tbsp (15 ml)", new BigDecimal("15.00")));
        // 15 g in a US tablespoon of 14.7868 mL
        assertThat(oil.gramsPerMl()).isEqualByComparingTo("1.014");
    }

    @Test
    void aDensityComesFromAHouseholdVolumeEvenForAServingInGrams() {
        assertThat(food("fdc:2001").gramsPerMl()).as("28 g a cup").isEqualByComparingTo("0.118");
        assertThat(food("fdc:2008").gramsPerMl()).as("32 g in 2 tbsp").isEqualByComparingTo("1.082");
        assertThat(food("fdc:2002").gramsPerMl()).as("a container is no volume").isNull();
    }

    @Test
    void aReleaseWhoseFilesLackAColumnIsRefusedNotReadAsEmpty(@TempDir Path dir) throws Exception {
        for (String file : List.of("food.csv", "food_nutrient.csv")) {
            java.nio.file.Files.copy(BRANDED.resolve(file), dir.resolve(file));
        }
        java.nio.file.Files.writeString(dir.resolve("branded_food.csv"), "\"fdc_id\",\"gtin\"\n\"1\",\"2\"\n");

        assertThatThrownBy(() -> FdcBranded.stream(dir, food -> {
        })).isInstanceOf(IllegalStateException.class).hasMessageContaining("gtin_upc");
    }
}
