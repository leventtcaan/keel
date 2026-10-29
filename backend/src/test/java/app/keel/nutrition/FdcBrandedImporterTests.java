package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * Loading USDA's Branded Foods and Survey (FNDDS) releases (K-1061): the products with barcode, brand, label serving and
 * region; the same release again gives the same rows; a new release replaces the old one's rows; a stopped import is finished by
 * running it again. The database is shared across test classes: only this class's rows (the sample's FDC ids) are looked at.
 */
@SpringBootTest
@Import(PostgresTestConfiguration.class)
class FdcBrandedImporterTests {

    private static final Path BRANDED = Path.of("src/test/resources/fdc/branded");
    private static final Path SURVEY = Path.of("src/test/resources/fdc/survey");
    private static final String MINE = "id in ('fdc:2001', 'fdc:2002', 'fdc:2003', 'fdc:2004', 'fdc:2008', 'fdc:2010', 'fdc:3001', 'fdc:3002', 'fdc:3003')";

    @Autowired
    FdcImporter importer;

    @Autowired
    JdbcClient jdbc;

    @TempDir
    Path dir;

    @BeforeEach
    @AfterEach
    void clear() {
        jdbc.sql("delete from nutrition.food where " + MINE).update();
        jdbc.sql("delete from nutrition.food_import where dataset in ('BRANDED', 'FNDDS')").update();
    }

    @Test
    void brandedProductsAreStoredWithBarcodeBrandServingRegionAndTheReleaseThatWroteThem() {
        FdcImporter.Imported imported = importer.loadBranded(BRANDED, "test-b1");

        assertThat(imported.foods()).isEqualTo(6);
        assertThat(imported.skipped()).isEqualTo(3);
        Map<String, Object> cheerios = jdbc.sql("""
                select name, brand, source, dataset, region, gtin, kcal::text as kcal, protein_g::text as protein, carbs_g::text as carbs,
                       fat_g::text as fat, grams_per_ml::text as gml, import_release from nutrition.food where id = 'fdc:2001'""").query().singleRow();
        assertThat(cheerios).containsEntry("name", "Cheerios Cereal").containsEntry("brand", "Cheerios").containsEntry("source", "BRANDED")
                .containsEntry("dataset", "FDC").containsEntry("region", "US").containsEntry("gtin", "00016000275287")
                .containsEntry("kcal", "357.00").containsEntry("protein", "10.71").containsEntry("carbs", "71.43").containsEntry("fat", "7.14")
                .containsEntry("gml", "0.118").containsEntry("import_release", "test-b1");
        assertThat(jdbc.sql("select name || ' = ' || grams::text from nutrition.food_serving where food_id = 'fdc:2001'").query(String.class).list())
                .containsExactly("1 cup (28g) = 28.00");
        assertThat(jdbc.sql("select name || ' = ' || grams::text from nutrition.food_serving where food_id = 'fdc:2004'").query(String.class).list())
                .containsExactly("1 serving (440 g) = 440.00");
        assertThat(jdbc.sql("select count(*) from nutrition.food_serving where food_id = 'fdc:2010'").query(Integer.class).single()).isZero();
        assertThat(jdbc.sql("select count(*) from nutrition.food where id = 'fdc:2004' and gtin is null").query(Integer.class).single())
                .as("no barcode, no gtin").isEqualTo(1);
        assertThat(jdbc.sql("select foods || '/' || skipped from nutrition.food_import where dataset = 'BRANDED' and release = 'test-b1'")
                .query(String.class).single()).isEqualTo("6/3");
    }

    @Test
    void aReleaseCountsAsImportedOnlyOnceItIsRecorded() {
        assertThat(importer.imported(FdcImport.Dataset.BRANDED, "test-b2")).isFalse();

        importer.loadBranded(BRANDED, "test-b2");

        assertThat(importer.imported(FdcImport.Dataset.BRANDED, "test-b2")).isTrue();
        assertThat(importer.imported(FdcImport.Dataset.BRANDED, "test-b3")).isFalse();
        assertThat(importer.imported(FdcImport.Dataset.FNDDS, "test-b2")).isFalse();
    }

    @Test
    void theSameReleaseTwiceGivesTheSameRows() {
        importer.loadBranded(BRANDED, "test-b4");
        String before = snapshot();

        FdcImporter.Imported again = importer.loadBranded(BRANDED, "test-b4");

        assertThat(again.foods()).isEqualTo(6);
        assertThat(snapshot()).isEqualTo(before);
        assertThat(jdbc.sql("select count(*) from nutrition.food_import where dataset = 'BRANDED'").query(Integer.class).single()).isEqualTo(1);
    }

    @Test
    void anImportThatWasStoppedHalfWayIsFinishedByRunningItAgain() {
        importer.loadBranded(BRANDED, "test-b5");
        String complete = snapshot();
        // Half of it written, as a restart in the middle leaves it: a row gone, one of another release's stamp, its serving lost.
        jdbc.sql("delete from nutrition.food where id = 'fdc:2003'").update();
        jdbc.sql("update nutrition.food set import_release = 'older', kcal = 1 where id = 'fdc:2002'").update();
        jdbc.sql("delete from nutrition.food_serving where food_id = 'fdc:2001'").update();

        importer.loadBranded(BRANDED, "test-b5");

        assertThat(snapshot()).isEqualTo(complete);
    }

    @Test
    void aNewReleaseReplacesTheOldOnesRowsAndAProductThatStaysKeepsItsId() throws Exception {
        importer.loadBranded(BRANDED, "test-b6");
        Path next = Files.createDirectories(dir.resolve("next"));
        for (String file : List.of("food.csv", "branded_food.csv", "food_nutrient.csv")) {
            Files.write(next.resolve(file), Files.readAllLines(BRANDED.resolve(file)).stream()
                    .filter(line -> line.startsWith("\"fdc_id\"") || line.startsWith("\"id\"") || line.startsWith("\"2001\"") || line.contains(",\"2001\",")
                            || line.startsWith("\"2002\"") || line.contains(",\"2002\","))
                    .collect(Collectors.toList()));
        }
        // Cheerios gets a new energy value in the new release.
        Files.writeString(next.resolve("food_nutrient.csv"), Files.readString(next.resolve("food_nutrient.csv")).replace("\"357.0\"", "\"360.0\""));

        FdcImporter.Imported imported = importer.loadBranded(next, "test-b7");

        assertThat(imported.foods()).isEqualTo(2);
        assertThat(jdbc.sql("select id from nutrition.food where source = 'BRANDED' and dataset = 'FDC' and import_release = 'test-b7' order by id")
                .query(String.class).list()).containsExactly("fdc:2001", "fdc:2002");
        assertThat(jdbc.sql("select count(*) from nutrition.food where id in ('fdc:2003', 'fdc:2004', 'fdc:2008', 'fdc:2010')").query(Integer.class).single())
                .as("what the new release does not have is gone").isZero();
        assertThat(jdbc.sql("select count(*) from nutrition.food_serving where food_id in ('fdc:2003', 'fdc:2004', 'fdc:2008')").query(Integer.class).single())
                .as("with its servings").isZero();
        assertThat(jdbc.sql("select kcal::text from nutrition.food where id = 'fdc:2001'").query(String.class).single()).isEqualTo("360.00");
    }

    @Test
    void aReleaseWithNoUsableProductChangesNothing() throws Exception {
        importer.loadBranded(BRANDED, "test-b8");
        Path empty = Files.createDirectories(dir.resolve("empty"));
        Files.writeString(empty.resolve("food.csv"), "\"fdc_id\",\"data_type\",\"description\"\n");
        Files.writeString(empty.resolve("branded_food.csv"), "\"fdc_id\",\"gtin_upc\",\"serving_size\",\"serving_size_unit\",\"household_serving_fulltext\"\n");
        Files.writeString(empty.resolve("food_nutrient.csv"), "\"id\",\"fdc_id\",\"nutrient_id\",\"amount\"\n");

        FdcImporter.Imported imported = importer.loadBranded(empty, "test-b9");

        assertThat(imported.foods()).isZero();
        assertThat(jdbc.sql("select count(*) from nutrition.food where import_release = 'test-b8' and " + MINE).query(Integer.class).single()).isEqualTo(6);
        assertThat(importer.imported(FdcImport.Dataset.BRANDED, "test-b9")).isFalse();
    }

    @Test
    void otherDatasetsAndOpenFoodFactsRowsAreLeftAlone() {
        jdbc.sql("""
                insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g, dataset, region, import_release) values
                ('fdc:2099', 'Rice, white, cooked', 'SR_LEGACY', 130, 2.7, 28, 0.3, 'FDC', 'US', null),
                ('off:2098', 'A Turkish product', 'BRANDED', 100, 1, 1, 1, 'OFF', 'TR', 'x')""").update();
        try {
            importer.loadBranded(BRANDED, "test-b10");

            assertThat(jdbc.sql("select count(*) from nutrition.food where id in ('fdc:2099', 'off:2098')").query(Integer.class).single()).isEqualTo(2);
        } finally {
            jdbc.sql("delete from nutrition.food where id in ('fdc:2099', 'off:2098')").update();
        }
    }

    @Test
    void surveyFoodsAreGenericFoodsWithHouseholdPortions() {
        FdcImporter.Imported imported = importer.load(SURVEY, FdcImport.Dataset.FNDDS, "test-s1");

        assertThat(imported.foods()).isEqualTo(3);
        assertThat(jdbc.sql("select source || '/' || dataset || '/' || region from nutrition.food where id = 'fdc:3001'").query(String.class).single())
                .isEqualTo("FNDDS/FDC/US");
        assertThat(jdbc.sql("select name from nutrition.food_serving where food_id = 'fdc:3001' order by seq").query(String.class).list())
                .containsExactly("1 large", "1 cup, chopped");
        assertThat(jdbc.sql("select grams_per_ml::text from nutrition.food where id = 'fdc:3002'").query(String.class).single()).isEqualTo("1.031");
        String before = snapshot();
        importer.load(SURVEY, FdcImport.Dataset.FNDDS, "test-s1");
        assertThat(snapshot()).as("again: the same rows").isEqualTo(before);
        assertThat(importer.imported(FdcImport.Dataset.FNDDS, "test-s1")).isTrue();
    }

    private String snapshot() {
        return String.join("\n", jdbc.sql("select f.id || '|' || f.name || '|' || coalesce(f.brand, '') || '|' || coalesce(f.gtin, '') || '|' || f.kcal"
                + " || '|' || coalesce(f.grams_per_ml::text, '') || '|' || coalesce(f.import_release, '')"
                + " || '|' || coalesce(string_agg(s.name || '=' || s.grams, ',' order by s.seq), '')"
                + " from nutrition.food f left join nutrition.food_serving s on s.food_id = f.id where f." + MINE
                + " group by f.id order by f.id").query(String.class).list());
    }
}
