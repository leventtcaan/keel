package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * The folded search text (K-1213, V64, V65): the database folds as {@link FoodSearchTerms#fold} does, on every write, and the
 * background backfill fills the rows that were there before and says when it is done. Runs in CI (a database).
 */
@SpringBootTest
@Import(PostgresTestConfiguration.class)
class SearchFoldedTests {

    @Autowired
    JdbcClient jdbc;

    @Autowired
    SearchFoldBackfill backfill;

    @AfterEach
    void clean() {
        jdbc.sql("delete from nutrition.food where id like 'k1213f:%'").update();
    }

    @Test
    void everyTurkishLetterAndEveryFormOfTheDottedIFoldsInTheDatabaseAsInTheCode() {
        List<String> names = List.of("çğıİöşü ÇĞIÖŞÜ", "i̇stanbul", "İZMIR", "şeker ğ ç ö ü", "Mercimek Çorbası", "plain ascii", "ŞİŞ");
        int n = 0;
        for (String name : names) {
            String id = "k1213f:" + n++;
            jdbc.sql("insert into nutrition.food (id, name, brand, aliases, source, kcal, protein_g, carbs_g, fat_g) values (:id, :name, :brand, :aliases, 'SR_LEGACY', 1, 1, 1, 1)")
                    .param("id", id).param("name", name).param("brand", "Pınar").param("aliases", "Ğ").update();
            String stored = jdbc.sql("select search_folded from nutrition.food where id = :id").param("id", id).query(String.class).single();

            assertThat(stored).as(name).isEqualTo(FoodSearchTerms.fold(name + " Pınar Ğ"));
        }
    }

    @Test
    void aRowWrittenWithoutTheFoldIsFilledByTheBackfillInBatchesAndTheDoneFlagIsSet() {
        for (int i = 0; i < 7; i++) {
            jdbc.sql("insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g) values (:id, :name, 'SR_LEGACY', 1, 1, 1, 1)")
                    .param("id", "k1213f:b" + i).param("name", "Çorba " + i).update();
        }
        jdbc.sql("update nutrition.food set search_folded = null where id like 'k1213f:b%'").update();

        backfill.run(3);

        assertThat(jdbc.sql("select count(*) from nutrition.food where search_folded is null").query(Integer.class).single()).isZero();
        assertThat(jdbc.sql("select search_folded from nutrition.food where id = 'k1213f:b0'").query(String.class).single()).isEqualTo("corba 0  ");
        assertThat(backfill.ready()).isTrue();
        assertThat(backfill.run(3)).as("again changes nothing").isZero();
    }
}
