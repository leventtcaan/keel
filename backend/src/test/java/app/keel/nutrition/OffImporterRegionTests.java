package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * Open Food Facts by region (K-1061, ADR-088, ADR-090 #1): each region's file owns its rows and its release record; importing
 * the US file removes no Turkey product and the other way round; a barcode in both regions is a product in each; a barcode a USDA
 * food holds stays with it. OFF rows are cleared around each test; other datasets' rows only where this class made them (ids "k1061:").
 */
@SpringBootTest
@Import(PostgresTestConfiguration.class)
class OffImporterRegionTests {

    private static final Path TR = Path.of("src/test/resources/off/off-tr.jsonl");
    private static final Path US = Path.of("src/test/resources/off/off-us.jsonl");

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
        jdbc.sql("delete from nutrition.food where dataset = 'OFF' or id like 'k1061:%'").update();
        jdbc.sql("delete from nutrition.food_import where dataset like 'OFF%'").update();
    }

    private int count(String where) {
        return jdbc.sql("select count(*) from nutrition.food where " + where).query(Integer.class).single();
    }

    @Test
    void theUsFileBecomesUsProductsOfDatasetOffWithTheirOwnReleaseRecord() {
        assertThat(importer.loadIfChanged(US, "US")).isEqualTo(OffImporter.Outcome.IMPORTED);

        assertThat(jdbc.sql("select id from nutrition.food where dataset = 'OFF' and region = 'US' order by id").query(String.class).list())
                .containsExactly("off-us:0049000028911", "off-us:0070847811169", "off-us:0818290010004", "off-us:8690504012344");
        assertThat(count("dataset = 'OFF' and region <> 'US'")).isZero();
        assertThat(jdbc.sql("select name || '|' || coalesce(brand, '') || '|' || source || '|' || gtin from nutrition.food where id = 'off-us:0049000028911'")
                .query(String.class).single()).isEqualTo("Coca-Cola|Coca-Cola|BRANDED|00049000028911");
        assertThat(jdbc.sql("select foods || '/' || skipped from nutrition.food_import where dataset = 'OFF_US'").query(String.class).single())
                .as("a Turkish line and a repeated code skipped").isEqualTo("4/2");
        assertThat(count("id = 'off-us:0049000028911'")).isOne();
        assertThat(jdbc.sql("select name from nutrition.food_serving where food_id = 'off-us:0049000028911'").query(String.class).single())
                .isEqualTo("1 serving (1 can (355 ml))");
    }

    @Test
    void importingOneRegionNeverRemovesTheOthersRows() throws Exception {
        importer.loadIfChanged(TR);
        importer.loadIfChanged(US, "US");
        assertThat(count("dataset = 'OFF' and region = 'TR'")).isEqualTo(3);
        assertThat(count("dataset = 'OFF' and region = 'US'")).isEqualTo(4);

        // A new US file with one product: the Turkey rows stay.
        Path nextUs = dir.resolve("off-us-next.jsonl");
        Files.writeString(nextUs, "{\"code\":\"0049000028911\",\"name\":\"Coca-Cola Zero\",\"brand\":\"Coca-Cola\",\"kcal\":0,\"protein\":0,\"carbs\":0,\"fat\":0,\"region\":\"US\"}\n");
        assertThat(importer.loadIfChanged(nextUs, "US")).isEqualTo(OffImporter.Outcome.IMPORTED);
        assertThat(count("dataset = 'OFF' and region = 'TR'")).as("Turkey's rows stay").isEqualTo(3);
        assertThat(jdbc.sql("select id from nutrition.food where dataset = 'OFF' and region = 'US'").query(String.class).list())
                .containsExactly("off-us:0049000028911");

        // And a new Turkey file leaves the US rows.
        Path nextTr = dir.resolve("off-tr-next.jsonl");
        Files.writeString(nextTr, "{\"code\":\"8690632999990\",\"name\":\"Yeni Ürün\",\"brand\":\"Marka\",\"kcal\":10,\"protein\":1,\"carbs\":1,\"fat\":1}\n");
        assertThat(importer.loadIfChanged(nextTr)).isEqualTo(OffImporter.Outcome.IMPORTED);
        assertThat(count("dataset = 'OFF' and region = 'US'")).as("the US rows stay").isEqualTo(1);
        assertThat(jdbc.sql("select id from nutrition.food where dataset = 'OFF' and region = 'TR'").query(String.class).list())
                .containsExactly("off:8690632999990");
        assertThat(count("id like 'off:%' and region <> 'TR'")).isZero();
    }

    @Test
    void eachRegionKeepsItsOwnReleaseRecordAndSkipsItsOwnUnchangedFile() {
        importer.loadIfChanged(TR);
        importer.loadIfChanged(US, "US");

        assertThat(jdbc.sql("select dataset from nutrition.food_import where dataset like 'OFF%' order by dataset").query(String.class).list())
                .containsExactly("OFF", "OFF_US");
        assertThat(importer.loadIfChanged(TR)).isEqualTo(OffImporter.Outcome.UNCHANGED);
        assertThat(importer.loadIfChanged(US, "US")).isEqualTo(OffImporter.Outcome.UNCHANGED);
    }

    @Test
    void theSameBarcodeInBothRegionsIsAProductInEachAndTheLookupPicksTheUsersRegion() {
        importer.loadIfChanged(TR);
        importer.loadIfChanged(US, "US");
        String gtin = Gtin.candidates("8690504012344").getFirst();

        assertThat(count("gtin = '" + gtin + "'")).isEqualTo(2);
        assertThat(foods.byGtin(gtin, Optional.of("US"))).hasValueSatisfying(food -> assertThat(food.id()).isEqualTo("off-us:8690504012344"));
        assertThat(foods.byGtin(gtin, Optional.of("TR"))).hasValueSatisfying(food -> assertThat(food.id()).isEqualTo("off:8690504012344"));
        assertThat(foods.byGtin(gtin)).as("no preference: a product anyway").isPresent();
    }

    @Test
    void aBarcodeAUsdaFoodHoldsStaysWithItAndTheLookupAnswersTheUsdaProduct() {
        jdbc.sql("""
                insert into nutrition.food (id, name, brand, source, kcal, protein_g, carbs_g, fat_g, gtin, dataset, region)
                values ('k1061:chobani', 'Greek Yogurt, Strawberry', 'Chobani', 'BRANDED', 88, 5.3, 11.3, 2, '00818290010004', 'FDC', 'US')""").update();

        importer.loadIfChanged(US, "US");

        assertThat(count("id = 'off-us:0818290010004'")).as("USDA's label is preferred").isZero();
        assertThat(jdbc.sql("select foods || '/' || skipped from nutrition.food_import where dataset = 'OFF_US'").query(String.class).single())
                .isEqualTo("3/3");
        assertThat(foods.byGtin("00818290010004", Optional.of("US"))).hasValueSatisfying(food -> assertThat(food.id()).isEqualTo("k1061:chobani"));
    }

    @Test
    void aUsdaProductBeatsAnOpenFoodFactsOneOfTheUsersRegionWhenBothAreThere() {
        importer.loadIfChanged(US, "US");
        jdbc.sql("""
                insert into nutrition.food (id, name, brand, source, kcal, protein_g, carbs_g, fat_g, gtin, dataset, region)
                values ('k1061:cola', 'Cola, regular', 'Coca-Cola', 'BRANDED', 42, 0, 10.6, 0, '00049000028911', 'FDC', 'US')""").update();

        assertThat(foods.byGtin("00049000028911", Optional.of("US"))).hasValueSatisfying(food -> assertThat(food.id()).isEqualTo("k1061:cola"));
    }

    @Test
    void aUsFileTakenForTurkeysImportsOnlyItsTurkishLine() {
        assertThat(importer.loadIfChanged(US)).isEqualTo(OffImporter.Outcome.IMPORTED);

        assertThat(jdbc.sql("select id from nutrition.food where dataset = 'OFF'").query(String.class).list()).containsExactly("off:8690632000011");
    }

    @Test
    void aRegionIsATwoLetterCode() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> importer.loadIfChanged(US, "usa")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aFileStoppedHalfWayIsFinishedByImportingItAgain() {
        importer.loadIfChanged(US, "US");
        String complete = String.join(",", jdbc.sql("select id || kcal || coalesce(import_release, '') from nutrition.food where dataset = 'OFF' order by id")
                .query(String.class).list());
        // As a restart in the middle leaves it: a product missing, the release record not written.
        jdbc.sql("delete from nutrition.food where id = 'off-us:0070847811169'").update();
        jdbc.sql("delete from nutrition.food_import where dataset = 'OFF_US'").update();

        assertThat(importer.loadIfChanged(US, "US")).isEqualTo(OffImporter.Outcome.IMPORTED);

        assertThat(String.join(",", jdbc.sql("select id || kcal || coalesce(import_release, '') from nutrition.food where dataset = 'OFF' order by id")
                .query(String.class).list())).isEqualTo(complete);
    }
}
