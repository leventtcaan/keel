package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Loading a FoodData Central release (K-226): the same release twice gives the same rows, and the release is recorded. */
@SpringBootTest
@Import(PostgresTestConfiguration.class)
class FdcImporterTests {

    private static final Path FOUNDATION = Path.of("src/test/resources/fdc/foundation");

    @Autowired
    FdcImporter importer;

    @Autowired
    JdbcClient jdbc;

    @Test
    void importingTheSameReleaseTwiceGivesTheSameRows() {
        FdcImporter.Imported first = importer.load(FOUNDATION, FdcImport.Dataset.FOUNDATION, "test-1");
        Map<String, Object> rice = rice();
        long servings = servings();

        FdcImporter.Imported again = importer.load(FOUNDATION, FdcImport.Dataset.FOUNDATION, "test-1");

        assertThat(again).isEqualTo(first);
        assertThat(first.foods()).isEqualTo(5);
        assertThat(first.skipped()).isEqualTo(1);
        assertThat(rice()).isEqualTo(rice);
        assertThat(servings()).isEqualTo(servings);
        assertThat(rice).containsEntry("name", "Rice, white, cooked").containsEntry("source", "FOUNDATION");
        assertThat(jdbc.sql("select foods from nutrition.food_import where dataset = 'FOUNDATION' and release = 'test-1'").query(Integer.class).single())
                .isEqualTo(5);
    }

    @Test
    void storedValuesKeepTheColumnsTwoDecimals() {
        importer.load(FOUNDATION, FdcImport.Dataset.FOUNDATION, "test-2");

        assertThat(jdbc.sql("select kcal::text from nutrition.food where id = 'fdc:100'").query(String.class).single()).isEqualTo("128.50");
        assertThat(jdbc.sql("select grams_per_ml::text from nutrition.food where id = 'fdc:101'").query(String.class).single()).isEqualTo("1.031");
    }

    @Test
    void aFoodTheNewReleaseNoLongerHasIsRemovedAndOtherSourcesAreLeftAlone() {
        // FDC gives an updated food a new id: the old one must not stay beside it in search (K-226 review).
        jdbc.sql("""
                insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g) values
                ('fdc:999001', 'Chicken, old release', 'FOUNDATION', 170, 18, 0, 11),
                ('fdc:999002', 'Granola, a brand', 'BRANDED', 450, 10, 60, 18) on conflict (id) do nothing""").update();

        importer.load(FOUNDATION, FdcImport.Dataset.FOUNDATION, "test-3");

        assertThat(jdbc.sql("select count(*) from nutrition.food where id = 'fdc:999001'").query(Integer.class).single()).isZero();
        assertThat(jdbc.sql("select count(*) from nutrition.food where id = 'fdc:999002'").query(Integer.class).single()).isEqualTo(1);
        assertThat(jdbc.sql("select carbs_g::text from nutrition.food where id = 'fdc:105'").query(String.class).single()).isEqualTo("0.00");
    }

    private Map<String, Object> rice() {
        return jdbc.sql("select name, source, kcal, protein_g, carbs_g, fat_g, grams_per_ml from nutrition.food where id = 'fdc:100'").query().singleRow();
    }

    private long servings() {
        return jdbc.sql("select count(*) from nutrition.food_serving where food_id in ('fdc:100', 'fdc:101', 'fdc:104', 'fdc:106')").query(Long.class)
                .single();
    }
}
