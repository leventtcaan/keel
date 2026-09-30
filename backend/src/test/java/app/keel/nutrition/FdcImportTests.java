package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Reading USDA FoodData Central's CSV release (K-226, ADR-008, CC0): only the dataset's own foods, per 100 g, energy and
 * carbohydrate from the value FDC gives (falling back as FDC documents), a food missing a value skipped — never guessed.
 */
class FdcImportTests {

    private static final Path FOUNDATION = Path.of("src/test/resources/fdc/foundation");

    @Test
    void onlyTheDatasetsOwnFoodsAreReadAndOneMissingAValueIsSkipped() {
        FdcImport.Read read = FdcImport.read(FOUNDATION, FdcImport.Dataset.FOUNDATION);

        assertThat(read.foods()).extracting(FdcImport.Food::id).containsExactly("fdc:100", "fdc:101", "fdc:104");
        assertThat(read.skipped()).as("103 has no protein").isEqualTo(1);
    }

    @Test
    void energyAndCarbohydrateFallBackAsFdcGivesThem() {
        // 100 has no 1008 (Energy): Atwater specific (2048) before general (2047); no 1005 (by difference): 1050 (by summation).
        FdcImport.Food rice = food("fdc:100");
        FdcImport.Food milk = food("fdc:101");

        assertThat(rice.kcal()).isEqualByComparingTo("128.5");
        assertThat(rice.carbsG()).isEqualByComparingTo("28.2");
        assertThat(rice.proteinG()).isEqualByComparingTo("2.7");
        assertThat(rice.fatG()).isEqualByComparingTo("0.3");
        assertThat(rice.source()).isEqualTo(FdcImport.Dataset.FOUNDATION);
        assertThat(milk.kcal()).isEqualByComparingTo("61.0");
        assertThat(milk.carbsG()).isEqualByComparingTo("4.8");
    }

    @Test
    void servingsAreNamedByAmountAndUnitInFdcsOrderAndAWeightlessOneIsLeftOut() {
        assertThat(food("fdc:101").servings()).containsExactly(
                new FdcImport.Serving("1 cup", new BigDecimal("244.0")),
                new FdcImport.Serving("1 tablespoon", new BigDecimal("15.25")),
                new FdcImport.Serving("1 slice", new BigDecimal("28")));
        assertThat(food("fdc:100").servings()).containsExactly(new FdcImport.Serving("1 cup", new BigDecimal("158.0")));
    }

    @Test
    void gramsPerMillilitreComeFromTheFirstVolumeServing() {
        // A US cup is 236.588 mL: 244 g of milk → 1.031 g/mL; 158 g of rice → 0.668.
        assertThat(food("fdc:101").gramsPerMl()).isEqualByComparingTo("1.031");
        assertThat(food("fdc:100").gramsPerMl()).isEqualByComparingTo("0.668");
    }

    @Test
    void aVolumeNamedInTheModifierCountsToo() {
        // SR Legacy names the unit in the modifier ("cup, cooked") with FDC's "no unit" id: 180 g a cup → 0.761 g/mL. A
        // portion of amount 0 (in the real release) is no serving and no volume.
        assertThat(food("fdc:104").servings()).containsExactly(new FdcImport.Serving("1 cup, cooked", new BigDecimal("180")));
        assertThat(food("fdc:104").gramsPerMl()).isEqualByComparingTo("0.761");
    }

    private static FdcImport.Food food(String id) {
        List<FdcImport.Food> foods = FdcImport.read(FOUNDATION, FdcImport.Dataset.FOUNDATION).foods();
        assertThat(foods).extracting(FdcImport.Food::id).as("read").contains(id);
        return foods.stream().filter(food -> food.id().equals(id)).findFirst().orElseThrow();
    }

    @Test
    void aReleaseIsReadFromFdcsFolderName() {
        assertThat(FdcImportRunner.release("FoodData_Central_foundation_food_csv_2025-12-18")).isEqualTo("2025-12-18");
        assertThat(FdcImportRunner.release("FoodData_Central_sr_legacy_food_csv_2018-04")).isEqualTo("2018-04");
        assertThat(FdcImportRunner.release("my-copy")).isEqualTo("my-copy");
    }

    @Test
    void theFoldersHoldingADatasetsFoodListAreFound(@org.junit.jupiter.api.io.TempDir Path root) throws Exception {
        Path foundation = java.nio.file.Files.createDirectories(root.resolve("a/FoodData_Central_foundation_food_csv_2025-12-18"));
        java.nio.file.Files.createFile(foundation.resolve("foundation_food.csv"));
        Path legacy = java.nio.file.Files.createDirectories(root.resolve("b/FoodData_Central_sr_legacy_food_csv_2018-04"));
        java.nio.file.Files.createFile(legacy.resolve("sr_legacy_food.csv"));
        java.nio.file.Files.createDirectories(root.resolve("c/unrelated"));

        assertThat(FdcImportRunner.releases(root)).containsExactly(foundation, legacy);
    }
}
