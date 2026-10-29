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
 * Food search order, folding and one row per name (K-1038, ADR-085 #7-9; POST /v1/foods/search). The foods are test rows
 * named as USDA names them; the database is shared across test classes, so only this class's rows (id "k1038:...") are looked at.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class FoodSearchRankingTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String MINE = "k1038:";

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @BeforeEach
    void foods() {
        // Longer or alphabetically earlier names than "Egg, whole, raw" on purpose: only the word rule may put it first.
        food("1", "Eggnog", null, "FOUNDATION");
        food("2", "Eggplant, raw", null, "SR_LEGACY");
        food("3", "Eggplant, raw", null, "FOUNDATION");
        food("4", "Egg, whole, raw", null, "FOUNDATION");
        food("5", "Egg", null, "SR_LEGACY");
        food("6", "Rice flour, white", null, "FOUNDATION");
        food("7", "Rice, white, long-grain, cooked", null, "SR_LEGACY");
        food("8", "Brown rice, cooked", null, "FOUNDATION");
        food("9", "Chicken, broilers or fryers, breast, raw", null, "FOUNDATION");
        food("10", "Instant noodles", "Mama", "BRANDED");
        food("11", "Instant noodles", "Indomie", "BRANDED");
        food("12", "Fried egg sandwich", null, "FOUNDATION");
    }

    @AfterEach
    void noFoodLeftForOtherTests() {
        jdbc.sql("delete from nutrition.food where id like 'k1038:%'").update();
    }

    @Test
    void theWholeFoodComesBeforeTheFoodsThatOnlyStartWithTheLetters() throws Exception {
        // "Egg" itself, then USDA's "Egg, whole" style (first word, comma), then names that start with the letters, then
        // a name with the word further in.
        assertThat(search("egg")).containsExactly("5", "4", "1", "3", "12");
    }

    @Test
    void aNameThatStartsWithTheWordComesBeforeOneThatHoldsItLater() throws Exception {
        assertThat(search("rice")).containsExactly("7", "6", "8");
        assertThat(search("rice white")).containsExactly("7", "6");
    }

    @Test
    void theTurkishDotlessAndDottedIAreTheSameLetterAsI() throws Exception {
        assertThat(search("chıcken")).containsExactly("9");
        assertThat(search("CHİCKEN")).containsExactly("9");
        assertThat(search("Chicken breast")).containsExactly("9");
    }

    @Test
    void aNameIsReturnedOnceWithTheBestSourceKept() throws Exception {
        // "Eggplant, raw" is in SR Legacy and in Foundation: the Foundation row.
        assertThat(search("eggplant")).containsExactly("3");
    }

    @Test
    void sameNameOfDifferentBrandsAreDifferentProducts() throws Exception {
        assertThat(search("noodles")).containsExactlyInAnyOrder("10", "11");
    }

    @Test
    void theLimitCountsRowsAfterTheDuplicatesAreGone() throws Exception {
        // Two "Eggplant, raw" rows: a limit of 1 still gives the Foundation one, not an SR Legacy one that took the slot.
        assertThat(found(Map.of("q", "eggplant", "limit", 1))).extracting(food -> food.get("id")).containsExactly(MINE + "3");
    }

    @Test
    void wordsAreStillTextNotPatterns() throws Exception {
        assertThat(search("%%")).isEmpty();
        assertThat(search("egg_")).isEmpty();
        assertThat(search("e%g")).isEmpty();
    }

    /** The ids (without the prefix) of this class's rows the search returns, in the order returned. */
    private List<String> search(String query) throws Exception {
        return found(Map.of("q", query, "limit", 50)).stream().map(food -> (String) food.get("id")).filter(id -> id.startsWith(MINE))
                .map(id -> id.substring(MINE.length())).toList();
    }

    private List<Map<String, Object>> found(Map<String, Object> body) throws Exception {
        AccountId account = TestSessions.newAccount();
        var result = mvc.post().uri("/v1/foods/search").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body)).exchange();
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }

    private void food(String number, String name, String brand, String source) {
        jdbc.sql("""
                insert into nutrition.food (id, name, brand, source, kcal, protein_g, carbs_g, fat_g)
                values (:id, :name, :brand, :source, 100, 5, 10, 2) on conflict (id) do nothing""")
                .param("id", MINE + number).param("name", name).param("brand", brand).param("source", source).update();
    }
}
