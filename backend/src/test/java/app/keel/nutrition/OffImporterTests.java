package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * Loading the Open Food Facts Turkey file (K-1042, ADR-088): the rows, the barcode lookup and the search find them, the
 * same file twice changes nothing, a new file replaces the OFF rows and only those. The database is shared across test
 * classes: the OFF rows are cleared around each test, other datasets' rows are never touched here (ids "k1042:").
 */
@SpringBootTest
@Import(PostgresTestConfiguration.class)
class OffImporterTests {

    private static final Path SAMPLE = Path.of("src/test/resources/off/off-tr.jsonl");
    private static final String GOFRET = "{\"code\":\"8690504012344\",\"name\":\"Çikolatalı Gofret\",\"brand\":\"Ülker\",\"kcal\":520,\"protein\":6.5,"
            + "\"carbs\":60.25,\"fat\":28,\"serving_g\":30,\"serving\":\"1 gofret (30 g)\"}\n";

    @Autowired
    OffImporter importer;

    @Autowired
    FoodStore foods;

    @Autowired
    JdbcClient jdbc;

    @TempDir
    Path dir;

    @BeforeEach
    @AfterEach
    void clear() {
        jdbc.sql("delete from nutrition.food where dataset = 'OFF' or id like 'k1042:%'").update();
        jdbc.sql("delete from nutrition.food_import where dataset = 'OFF'").update();
        jdbc.sql("delete from nutrition.meal where eaten_at = '1999-12-31T23:59:00Z'").update();
    }

    @Test
    void theFileBecomesBrandedFoodsOfDatasetOffWithBarcodeBrandAndServing() {
        assertThat(importer.loadIfChanged(SAMPLE)).isEqualTo(OffImporter.Outcome.IMPORTED);

        Map<String, Object> gofret = jdbc.sql("""
                select name, brand, source, dataset, gtin, kcal::text as kcal, protein_g::text as protein, carbs_g::text as carbs, fat_g::text as fat,
                       grams_per_ml from nutrition.food where id = 'off:8690504012344'""").query().singleRow();
        assertThat(gofret).containsEntry("name", "Çikolatalı Gofret").containsEntry("brand", "Ülker").containsEntry("source", "BRANDED")
                .containsEntry("dataset", "OFF").containsEntry("gtin", "08690504012344").containsEntry("kcal", "520.00")
                .containsEntry("protein", "6.50").containsEntry("carbs", "60.25").containsEntry("fat", "28.00").containsEntry("grams_per_ml", null);
        assertThat(jdbc.sql("select name || ' = ' || grams::text from nutrition.food_serving where food_id = 'off:8690504012344' order by seq")
                .query(String.class).list()).containsExactly("1 serving (1 gofret (30 g)) = 30.00");
        assertThat(jdbc.sql("select gtin from nutrition.food where id = 'off:96385074'").query(String.class).single()).isEqualTo("00000096385074");
        assertThat(jdbc.sql("select count(*) from nutrition.food_serving where food_id = 'off:8690632000011'").query(Integer.class).single()).isZero();
        assertThat(jdbc.sql("select count(*) from nutrition.food where dataset = 'OFF'").query(Integer.class).single()).isEqualTo(3);
        assertThat(jdbc.sql("select foods || '/' || skipped from nutrition.food_import where dataset = 'OFF'").query(String.class).single())
                .as("what came in and what was skipped is recorded").isEqualTo("3/2");
    }

    @Test
    void theBarcodeAScannerReadsFindsTheProductAndSoDoesTheSearchByNameAndBrand() {
        importer.loadIfChanged(SAMPLE);

        // A scanned EAN-13 and EAN-8 as the app sends them: Gtin makes the GTIN-14 the table keys on.
        String ean13 = Gtin.candidates("8690504012344").getFirst();
        String ean8 = Gtin.candidates("96385074").getFirst();
        assertThat(foods.byGtin(ean13)).hasValueSatisfying(food -> {
            assertThat(food.id()).isEqualTo("off:8690504012344");
            assertThat(food.brand()).isEqualTo("Ülker");
            assertThat(food.source()).isEqualTo(FoodRanges.Source.BRANDED);
            assertThat(food.servings()).extracting(FoodStore.Serving::name).containsExactly("1 serving (1 gofret (30 g))");
        });
        assertThat(foods.byGtin(ean8)).hasValueSatisfying(food -> assertThat(food.name()).isEqualTo("Sade Gazoz"));

        assertThat(foods.search("ülker", 20)).extracting(FoodStore.Food::id).contains("off:8690504012344");
        assertThat(foods.search("ÜLKER gofret", 20)).extracting(FoodStore.Food::id).contains("off:8690504012344");
        assertThat(foods.search("beyaz peynir", 20)).extracting(FoodStore.Food::id).contains("off:8690632000011");
    }

    @Test
    void theSameFileAgainChangesNothing() {
        importer.loadIfChanged(SAMPLE);
        String before = snapshot();

        assertThat(importer.loadIfChanged(SAMPLE)).isEqualTo(OffImporter.Outcome.UNCHANGED);

        assertThat(snapshot()).isEqualTo(before);
    }

    @Test
    void aNewFileReplacesTheOffRowsAndAProductThatStaysKeepsItsId() throws Exception {
        importer.loadIfChanged(SAMPLE);
        Path next = dir.resolve("off-next.jsonl");
        Files.writeString(next, GOFRET.replace("\"kcal\":520", "\"kcal\":530").replace("\"serving_g\":30", "\"serving_g\":40")
                + "{\"code\":\"8690632999990\",\"name\":\"Yeni Ürün\",\"brand\":\"Marka\",\"kcal\":10,\"protein\":1,\"carbs\":1,\"fat\":1}\n");

        assertThat(importer.loadIfChanged(next)).isEqualTo(OffImporter.Outcome.IMPORTED);

        assertThat(jdbc.sql("select id from nutrition.food where dataset = 'OFF' order by id").query(String.class).list())
                .as("the two products the file no longer has are gone, the new one is in").containsExactly("off:8690504012344", "off:8690632999990");
        assertThat(jdbc.sql("select kcal::text from nutrition.food where id = 'off:8690504012344'").query(String.class).single()).isEqualTo("530.00");
        assertThat(jdbc.sql("select grams::text from nutrition.food_serving where food_id = 'off:8690504012344'").query(String.class).list())
                .containsExactly("40.00");
        assertThat(jdbc.sql("select count(*) from nutrition.food_serving where food_id in ('off:8690632000011', 'off:96385074')")
                .query(Integer.class).single()).as("servings go with their product").isZero();
        assertThat(jdbc.sql("select count(*) from nutrition.food_import where dataset = 'OFF'").query(Integer.class).single()).isEqualTo(1);
        assertThat(jdbc.sql("select foods from nutrition.food_import where dataset = 'OFF'").query(Integer.class).single()).isEqualTo(2);
    }

    @Test
    void foodsOfOtherDatasetsAreNeverTouchedAndTheirBarcodesAreNotTaken() throws Exception {
        jdbc.sql("""
                insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g, gtin) values
                ('k1042:fdc', 'Rice, white, cooked', 'FOUNDATION', 130, 2.7, 28, 0.3, null),
                ('k1042:branded', 'Granola, a brand', 'BRANDED', 450, 10, 60, 18, '08690632000011')""").update();
        jdbc.sql("insert into nutrition.food_serving (food_id, seq, name, grams) values ('k1042:fdc', 1, '1 cup', 158)").update();

        importer.loadIfChanged(SAMPLE);

        assertThat(jdbc.sql("select name from nutrition.food where id = 'k1042:fdc'").query(String.class).single()).isEqualTo("Rice, white, cooked");
        assertThat(jdbc.sql("select dataset from nutrition.food where id in ('k1042:fdc', 'k1042:branded') order by id").query(String.class).list())
                .containsExactly("FDC", "FDC");
        assertThat(jdbc.sql("select count(*) from nutrition.food_serving where food_id = 'k1042:fdc'").query(Integer.class).single()).isEqualTo(1);
        assertThat(jdbc.sql("select id from nutrition.food where gtin = '08690632000011'").query(String.class).single())
                .as("the barcode another food holds stays with it").isEqualTo("k1042:branded");
        assertThat(jdbc.sql("select count(*) from nutrition.food where id = 'off:8690632000011'").query(Integer.class).single()).isZero();
        assertThat(jdbc.sql("select skipped from nutrition.food_import where dataset = 'OFF'").query(Integer.class).single()).isEqualTo(3);

        // And a later file leaves them be as well.
        Path next = dir.resolve("off-next.jsonl");
        Files.writeString(next, GOFRET);
        importer.loadIfChanged(next);
        assertThat(jdbc.sql("select count(*) from nutrition.food where id in ('k1042:fdc', 'k1042:branded')").query(Integer.class).single()).isEqualTo(2);
    }

    @Test
    void aMealThatHoldsAProductKeepsItWhenTheProductLeavesTheFile() throws Exception {
        importer.loadIfChanged(SAMPLE);
        UUID meal = UUID.randomUUID();
        UUID account = UUID.randomUUID();
        // The meal copies the food's name and ranges and holds its id with no foreign key (V10): the account is not a row here either.
        jdbc.sql("""
                insert into nutrition.meal (id, account_id, client_id, eaten_at, day, slot) values (:meal, :account, :client, '1999-12-31T23:59:00Z', '1999-12-31', 'SNACK')""")
                .param("meal", meal).param("account", account).param("client", UUID.randomUUID()).update();
        jdbc.sql("""
                insert into nutrition.meal_item (meal_id, account_id, seq, food_id, name, quantity, unit, kcal_low, kcal_high, protein_low, protein_high,
                carbs_low, carbs_high, fat_low, fat_high) values (:meal, :account, 1, 'off:96385074', 'Sade Gazoz', 250, 'ml', 100, 110, 0, 0, 25, 27, 0, 0)""")
                .param("meal", meal).param("account", account).update();
        Path next = dir.resolve("off-next.jsonl");
        Files.writeString(next, GOFRET);

        importer.loadIfChanged(next);

        assertThat(jdbc.sql("select count(*) from nutrition.food where id = 'off:96385074'").query(Integer.class).single()).isZero();
        assertThat(jdbc.sql("select name from nutrition.meal_item where meal_id = :meal").param("meal", meal).query(String.class).single())
                .isEqualTo("Sade Gazoz");
    }

    @Test
    void noFileIsNoImportAndAFileWithNothingUsableLeavesTheFoodsAlone() throws Exception {
        assertThat(importer.loadIfChanged(dir.resolve("none.jsonl"))).isEqualTo(OffImporter.Outcome.ABSENT);
        importer.loadIfChanged(SAMPLE);
        Path empty = dir.resolve("empty.jsonl");
        Files.writeString(empty, "garbage\n\n{}\n");

        assertThat(importer.loadIfChanged(empty)).isEqualTo(OffImporter.Outcome.NOTHING_USABLE);

        assertThat(jdbc.sql("select count(*) from nutrition.food where dataset = 'OFF'").query(Integer.class).single()).isEqualTo(3);
    }

    @Test
    void existingFoodsAreFdcByDefault() {
        jdbc.sql("insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g) values ('k1042:plain', 'Plain', 'SR_LEGACY', 1, 1, 1, 1)")
                .update();

        assertThat(jdbc.sql("select dataset from nutrition.food where id = 'k1042:plain'").query(String.class).single()).isEqualTo("FDC");
    }

    private String snapshot() {
        List<String> rows = jdbc.sql("""
                select f.id || '|' || f.name || '|' || coalesce(f.brand, '') || '|' || f.gtin || '|' || f.kcal || '|' || coalesce(s.name, '')
                from nutrition.food f left join nutrition.food_serving s on s.food_id = f.id where f.dataset = 'OFF' order by f.id""")
                .query(String.class).list();
        return String.join("\n", rows) + "\n" + jdbc.sql("select imported_at::text from nutrition.food_import where dataset = 'OFF'")
                .query(String.class).single();
    }
}
