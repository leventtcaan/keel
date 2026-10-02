package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * Recipe memory (K-413, ADR-034, contract /v1/recipes): a recipe is entered once — its ingredients and how many portions
 * it makes — and logged by the portion as one item of a meal. Only the ingredients are kept; the ranges come from the
 * database each time (U1), a portion's share rounded outward (U5). Recipes are health data, as meals are.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class RecipeTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @BeforeEach
    void foods() {
        jdbc.sql("""
                insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g) values
                ('fdc:171477', 'Chicken breast, roasted', 'FOUNDATION', 165, 31, 0, 3.6),
                ('fdc:1897574', 'Toasted oat cereal', 'BRANDED', 400, 10, 70, 8) on conflict (id) do nothing""").update();
    }

    @Test
    void aRecipeIsKeptOncePerClientIdWithItsRangesPerPortion() throws Exception {
        AccountId account = consenting();
        Map<String, Object> recipe = recipe(UUID.randomUUID(), "Chicken and oats", 4);

        MvcTestResult first = send(account, "POST", "/v1/recipes", recipe);
        MvcTestResult again = send(account, "POST", "/v1/recipes", recipe);

        assertThat(first).hasStatus(201);
        assertThat(again).hasStatus(200);
        assertThat(map(again)).isEqualTo(map(first));
        Map<String, Object> whole = map(send(account, "POST", "/v1/food-estimates", Map.of("items", recipe.get("items"))));
        assertThat(map(first)).containsEntry("name", "Chicken and oats").containsEntry("portions", 4);
        assertThat(((Map<String, Object>) map(first).get("perPortion")).get("kcal")).isEqualTo(quarter((Map<String, Integer>) whole.get("kcal"), 1));
        assertThat((List<Map<String, Object>>) map(first).get("items")).extracting(item -> item.get("name"))
                .containsExactly("Chicken breast, roasted", "Toasted oat cereal");
    }

    @Test
    void theRecipesAreListedByName() throws Exception {
        AccountId account = consenting();
        send(account, "POST", "/v1/recipes", recipe(UUID.randomUUID(), "lentil soup", 6));
        send(account, "POST", "/v1/recipes", recipe(UUID.randomUUID(), "Chili", 4));

        assertThat(list(send(account, "GET", "/v1/recipes", null))).extracting(recipe -> recipe.get("name")).containsExactly("Chili", "lentil soup");
        assertThat(list(send(consenting(), "GET", "/v1/recipes", null))).as("another user's").isEmpty();
    }

    @Test
    void aMealLogsARecipeByThePortionAsOneItem() throws Exception {
        AccountId account = consenting();
        Map<String, Object> recipe = recipe(UUID.randomUUID(), "Chili", 4);
        String id = (String) map(send(account, "POST", "/v1/recipes", recipe)).get("id");
        Map<String, Object> whole = map(send(account, "POST", "/v1/food-estimates", Map.of("items", recipe.get("items"))));

        MvcTestResult logged = send(account, "POST", "/v1/meals", Map.of("clientId", UUID.randomUUID(), "eatenAt", "2026-09-30T19:00:00Z", "slot", "DINNER",
                "items", List.of(Map.of("foodId", "recipe:" + id, "amount", Map.of("quantity", 1.5, "unit", "portion")))));

        assertThat(logged).hasStatus(201);
        List<Map<String, Object>> items = (List<Map<String, Object>>) map(logged).get("items");
        assertThat(items).singleElement().satisfies(item -> {
            assertThat(item).containsEntry("foodId", "recipe:" + id).containsEntry("name", "Chili");
            assertThat(item.get("kcal")).isEqualTo(quarter((Map<String, Integer>) whole.get("kcal"), 1.5));
        });
    }

    @Test
    void aPortionIsNotAskedInGrams() throws Exception {
        AccountId account = consenting();
        String id = (String) map(send(account, "POST", "/v1/recipes", recipe(UUID.randomUUID(), "Chili", 4))).get("id");

        Map<String, Object> estimate = map(send(account, "POST", "/v1/food-estimates", Map.of("items", List.of(
                Map.of("foodId", "recipe:" + id, "amount", Map.of("quantity", 2, "unit", "portion"))))));

        assertThat(estimate).doesNotContainKey("question");
    }

    @Test
    void aMealKeepsWhatItLoggedWhenItsRecipeIsDeleted() throws Exception {
        AccountId account = consenting();
        String id = (String) map(send(account, "POST", "/v1/recipes", recipe(UUID.randomUUID(), "Chili", 4))).get("id");
        send(account, "POST", "/v1/meals", Map.of("clientId", UUID.randomUUID(), "eatenAt", "2026-09-30T19:00:00Z", "slot", "DINNER",
                "items", List.of(Map.of("foodId", "recipe:" + id, "amount", Map.of("quantity", 1, "unit", "portion")))));

        assertThat(send(account, "DELETE", "/v1/recipes/" + id, null)).hasStatus(204);
        assertThat(send(account, "DELETE", "/v1/recipes/" + id, null)).hasStatus(404);

        assertThat(list(send(account, "GET", "/v1/recipes", null))).isEmpty();
        assertThat(list(send(account, "GET", "/v1/meals?day=2026-09-30", null))).singleElement()
                .satisfies(meal -> assertThat((List<Map<String, Object>>) meal.get("items")).extracting(item -> item.get("name")).containsExactly("Chili"));
    }

    @Test
    void onlyTheUsersOwnRecipeCanBeLogged() throws Exception {
        AccountId owner = consenting();
        String id = (String) map(send(owner, "POST", "/v1/recipes", recipe(UUID.randomUUID(), "Chili", 4))).get("id");
        AccountId other = consenting();

        assertThat(send(other, "POST", "/v1/food-estimates", Map.of("items", List.of(
                Map.of("foodId", "recipe:" + id, "amount", Map.of("quantity", 1, "unit", "portion")))))).hasStatus(400);
        assertThat(send(other, "DELETE", "/v1/recipes/" + id, null)).hasStatus(404);
    }

    @Test
    void whatTheServerDoesNotTake() {
        AccountId account = consenting();
        Map<String, Object> chicken = Map.of("foodId", "fdc:171477", "amount", Map.of("quantity", 100, "unit", "g"));
        for (Map<String, Object> wrong : List.of(
                Map.of("clientId", UUID.randomUUID(), "name", "Chili", "portions", 0, "items", List.of(chicken)),
                Map.of("clientId", UUID.randomUUID(), "name", "Chili", "portions", 51, "items", List.of(chicken)),
                Map.of("clientId", UUID.randomUUID(), "name", "  ", "portions", 4, "items", List.of(chicken)),
                Map.of("clientId", UUID.randomUUID(), "name", "x".repeat(81), "portions", 4, "items", List.of(chicken)),
                Map.of("clientId", UUID.randomUUID(), "name", "Chili", "portions", 4, "items", List.of()),
                Map.of("clientId", UUID.randomUUID(), "name", "Chili", "portions", 4, "items", List.of(
                        Map.of("foodId", "recipe:" + UUID.randomUUID(), "amount", Map.of("quantity", 1, "unit", "portion")))))) {
            assertThat(send(account, "POST", "/v1/recipes", wrong)).as(wrong.toString()).hasStatus(400);
        }
        assertThat(send(account, "POST", "/v1/food-estimates", Map.of("items", List.of(
                Map.of("foodId", "fdc:171477", "amount", Map.of("quantity", 1, "unit", "portion")))))).as("a portion of a database food").hasStatus(400);
        assertThat(send(account, "POST", "/v1/food-estimates", Map.of("items", List.of(
                Map.of("foodId", "recipe:not-a-uuid", "amount", Map.of("quantity", 1, "unit", "portion")))))).hasStatus(400);
    }

    @Test
    void recipesAreHealthDataAndNeedTheConsent() {
        AccountId account = TestSessions.newAccount();

        assertThat(send(account, "POST", "/v1/recipes", recipe(UUID.randomUUID(), "Chili", 4))).hasStatus(403);
        assertThat(send(account, "GET", "/v1/recipes", null)).hasStatus(403);
        assertThat(send(account, "DELETE", "/v1/recipes/" + UUID.randomUUID(), null)).hasStatus(403);
    }

    /** `eaten` portions of 4, of a whole range: the low end down, the high end up. */
    private static Map<String, Integer> quarter(Map<String, Integer> whole, double eaten) {
        return Map.of("low", (int) Math.floor(whole.get("low") * eaten / 4), "high", (int) Math.ceil(whole.get("high") * eaten / 4));
    }

    private AccountId consenting() {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"))).hasStatusOk();
        return account;
    }

    private static Map<String, Object> recipe(UUID clientId, String name, int portions) {
        return Map.of("clientId", clientId, "name", name, "portions", portions, "items", List.of(
                Map.of("foodId", "fdc:171477", "amount", Map.of("quantity", 400, "unit", "g", "certainty", "WEIGHED")),
                Map.of("foodId", "fdc:1897574", "amount", Map.of("quantity", 120, "unit", "g"))));
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "PUT" -> mvc.put();
            case "DELETE" -> mvc.delete();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        }
        return request.exchange();
    }

    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private static List<Map<String, Object>> list(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }
}
