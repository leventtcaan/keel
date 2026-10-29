package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Reading USDA's Survey (FNDDS) release (K-1061, ADR-008): its portions have no amount and a numeric modifier code, the whole
 * text ("1 large", "1 cup, chopped") is the description; the FDC dataset folders are told apart by their food list.
 */
class FdcSurveyImportTests {

    private static final Path SURVEY = Path.of("src/test/resources/fdc/survey");

    private static FdcImport.Food food(String id) {
        return FdcImport.read(SURVEY, FdcImport.Dataset.FNDDS).foods().stream().filter(food -> food.id().equals(id)).findFirst().orElseThrow();
    }

    @Test
    void onlyTheSurveyFoodsAreReadWithTheirFourNutrients() {
        FdcImport.Read read = FdcImport.read(SURVEY, FdcImport.Dataset.FNDDS);

        assertThat(read.foods()).extracting(FdcImport.Food::id).containsExactly("fdc:3001", "fdc:3002", "fdc:3003");
        assertThat(read.skipped()).isZero();
        assertThat(food("fdc:3001").source()).isEqualTo(FdcImport.Dataset.FNDDS);
        assertThat(food("fdc:3001").kcal()).isEqualByComparingTo("155");
        assertThat(food("fdc:3001").proteinG()).isEqualByComparingTo("12.6");
    }

    @Test
    void thePortionDescriptionIsTheNameWhenThereIsNoAmountAndTheModifierIsACode() {
        // "Quantity not specified" has no weight and no meaning; the second "1 large" is the same name as the first.
        assertThat(food("fdc:3001").servings()).containsExactly(
                new FdcImport.Serving("1 large", new BigDecimal("50.0")),
                new FdcImport.Serving("1 cup, chopped", new BigDecimal("136.0")));
        assertThat(food("fdc:3003").servings()).containsExactly(
                new FdcImport.Serving("3 oz", new BigDecimal("85.0")),
                new FdcImport.Serving("1 breast", new BigDecimal("172.0")));
    }

    @Test
    void theDensityComesFromTheFirstVolumePortion() {
        assertThat(food("fdc:3002").gramsPerMl()).as("244 g a cup").isEqualByComparingTo("1.031");
        assertThat(food("fdc:3001").gramsPerMl()).as("136 g a cup, chopped").isEqualByComparingTo("0.575");
        assertThat(food("fdc:3003").gramsPerMl()).as("an ounce and a breast are no volume").isNull();
    }

    @Test
    void aSurveyFolderIsRecognisedByItsFoodListAndTheNewestOfEachDatasetIsTheOneImported(@TempDir Path root) throws Exception {
        Path survey = Files.createDirectories(root.resolve("FoodData_Central_survey_food_csv_2024-10-31"));
        Files.createFile(survey.resolve("survey_fndds_food.csv"));
        Path branded = Files.createDirectories(root.resolve("FoodData_Central_branded_food_csv_2026-04-30"));
        Files.createFile(branded.resolve("branded_food.csv"));
        Path olderBranded = Files.createDirectories(root.resolve("FoodData_Central_branded_food_csv_2025-12-18"));
        Files.createFile(olderBranded.resolve("branded_food.csv"));
        // The fetch script's marker where an imported release was pruned: no food list, not a release.
        Path pruned = Files.createDirectories(root.resolve("FoodData_Central_foundation_food_csv_2025-12-18"));
        Files.createFile(pruned.resolve(".fetched"));

        List<Path> releases = FdcImportRunner.releases(root);

        assertThat(releases).containsExactlyInAnyOrder(survey, branded);
        assertThat(FdcImportRunner.dataset(survey)).isEqualTo(FdcImport.Dataset.FNDDS);
        assertThat(FdcImportRunner.dataset(branded)).isEqualTo(FdcImport.Dataset.BRANDED);
        assertThat(FdcImportRunner.release(branded.getFileName().toString())).isEqualTo("2026-04-30");
    }
}
