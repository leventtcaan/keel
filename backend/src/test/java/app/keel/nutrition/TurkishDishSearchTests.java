package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import tools.jackson.databind.json.JsonMapper;

/**
 * The Turkish dishes (K-1213) in the database and in the search: worked out from USDA ingredients found by their description,
 * found by Turkish names with or without the Turkish letters, ahead of the products, and logged in the household measures.
 * Runs in CI (a database); the ingredients are test rows named as USDA names them, the dishes' ids start "tr:k1213-".
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class TurkishDishSearchTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String SOUP = "Mercimek çorbası";

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    TurkishDishImporter importer;

    @Autowired
    SearchFoldBackfill backfill;

    private static List<TurkishDishes.Dish> dishes() {
        return TurkishDishes.read("""
                {"version": 1, "source": "recipe-estimate", "dishes": [
                 {"id": "k1213-soup", "name": "Mercimek çorbası", "aliases": ["lentil soup"], "serving": "1 bowl", "servingG": 250,
                  "ingredients": [{"food": "k1213 Lentils, cooked", "grams": 100}, {"food": "k1213 Oil, olive", "grams": 10}]},
                 {"id": "k1213-menemen", "name": "Menemen", "aliases": ["Turkish scrambled eggs"], "serving": "1 plate", "servingG": 200,
                  "ingredients": [{"food": "k1213 Lentils, cooked", "grams": 100}, {"food": "k1213 Missing, raw", "grams": 10}]}]}""");
    }

    @BeforeEach
    void ingredientsAndDishes() {
        ingredient("lentils", "k1213 Lentils, cooked", "SR_LEGACY", "116", "9", "20", "0.4");
        ingredient("oil", "k1213 Oil, olive", "FOUNDATION", "884", "0", "0", "100");
        jdbc.sql("""
                insert into nutrition.food (id, name, brand, source, kcal, protein_g, carbs_g, fat_g, region)
                values ('k1213:product', 'Mercimek Çorbası', 'Knorr', 'BRANDED', 60, 2, 10, 1, 'TR') on conflict (id) do nothing""").update();
        importer.load(dishes(), "test");
        // The search reads the folded text once the backfill is done; the rows written above got theirs from the trigger.
        backfill.run(1000);
    }

    @AfterEach
    void clean() {
        jdbc.sql("delete from nutrition.food where id like 'k1213%' or id like 'tr:k1213-%'").update();
    }

    @Test
    void aDishIsWorkedOutFromItsIngredientsAndOneWithAMissingIngredientIsLeftOut() {
        Map<String, Object> soup = jdbc.sql("select * from nutrition.food where id = 'tr:k1213-soup'").query().singleRow();

        assertThat(soup.get("source")).isEqualTo("RECIPE");
        assertThat(soup.get("region")).isEqualTo("TR");
        assertThat(soup.get("dataset")).isEqualTo("RECIPE");
        assertThat(((Number) soup.get("kcal")).doubleValue()).isEqualTo(81.76);
        assertThat(jdbc.sql("select count(*) from nutrition.food where id = 'tr:k1213-menemen'").query(Integer.class).single()).isZero();
        assertThat(jdbc.sql("select name from nutrition.food_serving where food_id = 'tr:k1213-soup'").query(String.class).single())
                .isEqualTo("1 bowl (250 g)");
    }

    @Test
    void loadingAgainChangesNothingAndADishWhoseIngredientIsMissingThisRunKeepsItsLastGoodRow() {
        importer.load(dishes(), "test");
        jdbc.sql("update nutrition.food set name = 'k1213 Lentils, renamed' where id = 'k1213:lentils'").update();

        TurkishDishImporter.Imported again = importer.load(dishes(), "test");

        assertThat(again.dishes()).isZero();
        assertThat(again.kept()).isEqualTo(1);
        assertThat(jdbc.sql("select count(*) from nutrition.food where id = 'tr:k1213-soup'").query(Integer.class).single()).isEqualTo(1);
        assertThat(((Number) jdbc.sql("select kcal from nutrition.food where id = 'tr:k1213-soup'").query().singleRow().get("kcal")).doubleValue()).isEqualTo(81.76);
    }

    @Test
    void aDishTheFileNoLongerHasIsTakenBack() {
        importer.load(dishes().subList(1, 2), "test");

        assertThat(jdbc.sql("select count(*) from nutrition.food where id like 'tr:k1213-%'").query(Integer.class).single()).isZero();
    }

    @Test
    void turkishNamesWithOrWithoutTheTurkishLettersFindTheDishFirst() throws Exception {
        for (String query : List.of("mercimek", "mercimek çorbası", "mercimek corbasi", "MERCİMEK ÇORBASI", "lentil soup")) {
            assertThat(found(query, "tr-TR")).as(query).first().isEqualTo("tr:k1213-soup");
        }
    }

    @Test
    void theDishIsGenericAndItsPortionsHoldTheMeasuresOfItsClassNone() throws Exception {
        var request = mvc.get().uri("/v1/foods/tr:k1213-soup").header("Authorization", TestSessions.bearer(context, account()));
        var result = request.exchange();
        assertThat(result).hasStatusOk();
        Map<?, ?> food = JSON.readValue(result.getResponse().getContentAsString(), Map.class);

        assertThat(food.get("brand")).isNull();
        assertThat(((Map<?, ?>) food.get("defaultAmount")).get("unit")).isEqualTo("1 bowl (250 g)");
    }

    private void ingredient(String number, String name, String source, String kcal, String protein, String carbs, String fat) {
        jdbc.sql("""
                insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g, region)
                values (:id, :name, :source, :kcal, :protein, :carbs, :fat, 'US') on conflict (id) do nothing""")
                .param("id", "k1213:" + number).param("name", name).param("source", source).param("kcal", new java.math.BigDecimal(kcal))
                .param("protein", new java.math.BigDecimal(protein)).param("carbs", new java.math.BigDecimal(carbs))
                .param("fat", new java.math.BigDecimal(fat)).update();
    }

    private static AccountId account() {
        return TestSessions.newAccount();
    }

    private List<String> found(String query, String language) throws Exception {
        var result = mvc.post().uri("/v1/foods/search").header("Authorization", TestSessions.bearer(context, account()))
                .header("Accept-Language", language).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("q", query, "limit", 20))).exchange();
        assertThat(result).hasStatusOk();
        List<Map<String, Object>> foods = JSON.readValue(result.getResponse().getContentAsString(), List.class);
        return foods.stream().map(food -> (String) food.get("id")).filter(id -> id.startsWith("tr:k1213-") || id.startsWith("k1213:")).toList();
    }
}
