package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
 * The foods eaten lately (K-1025, GET /v1/foods/recent): the user's own meals of the last weeks, freshest first, each food once
 * in the amount of its last time and as the database estimates it now (a range, U5); the slot's foods first; never a food
 * the profile avoids; a few at most; behind the HEALTH_DATA consent; not tied to the day's target. The dates are relative to
 * now (the window is the last suggestion-days up to the user's today).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class RecentFoodsApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String CHICKEN = "fdc:171477";
    private static final String CEREAL = "fdc:1897574";

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
    @SuppressWarnings("unchecked")
    void theFoodsAreFreshestFirstEachInTheAmountOfItsLastTimeAsARange() throws Exception {
        AccountId account = consenting();
        meal(account, 3, "LUNCH", CHICKEN, 200, CEREAL, 50);
        meal(account, 1, "SNACK", CEREAL, 80);

        List<Map<String, Object>> recent = list(send(account, "GET", "/v1/foods/recent", null));

        assertThat(recent).extracting(item -> item.get("foodId")).containsExactly(CEREAL, CHICKEN);
        Map<String, Object> cereal = recent.getFirst();
        assertThat(((Number) ((Map<String, Object>) cereal.get("amount")).get("quantity")).intValue()).as("the last time, not the 50 g before").isEqualTo(80);
        assertThat((Map<String, Object>) cereal.get("amount")).containsEntry("unit", "g").containsEntry("certainty", "ESTIMATED");
        assertThat((Map<String, Object>) cereal.get("kcal")).containsKeys("low", "high");
        assertThat((Map<String, Object>) cereal.get("proteinG")).containsKeys("low", "high");
        assertThat(((Number) ((Map<String, Object>) recent.get(1).get("amount")).get("quantity")).intValue()).isEqualTo(200);
    }

    @Test
    void theSlotsFoodsComeFirstAndTheRestFollow() throws Exception {
        AccountId account = consenting();
        meal(account, 3, "LUNCH", CHICKEN, 200);
        meal(account, 1, "SNACK", CEREAL, 80);

        assertThat(list(send(account, "GET", "/v1/foods/recent?slot=LUNCH", null))).extracting(item -> item.get("foodId"))
                .as("lunch's chicken first, the snack's cereal after it, not left out").containsExactly(CHICKEN, CEREAL);
        assertThat(list(send(account, "GET", "/v1/foods/recent?slot=SNACK", null))).extracting(item -> item.get("foodId")).containsExactly(CEREAL, CHICKEN);
        assertThat(list(send(account, "GET", "/v1/foods/recent?slot=BREAKFAST", null))).extracting(item -> item.get("foodId"))
                .as("a slot nobody ate in: as without one").containsExactly(CEREAL, CHICKEN);
    }

    @Test
    @SuppressWarnings("unchecked")
    void theFrequentFoodsOfASlotAreThoseHadThereWithAllThreeMacros() throws Exception {
        AccountId account = consenting();
        meal(account, 3, "LUNCH", CHICKEN, 200);
        meal(account, 2, "LUNCH", CHICKEN, 200);
        meal(account, 1, "SNACK", CEREAL, 80);

        List<Map<String, Object>> lunch = list(send(account, "GET", "/v1/foods/frequent?slot=LUNCH", null));

        assertThat(lunch).extracting(item -> item.get("foodId")).as("only lunch's chicken, not the snack's cereal").containsExactly(CHICKEN);
        assertThat(lunch.getFirst()).containsKeys("kcal", "proteinG", "carbsG", "fatG");
        assertThat((Map<String, Object>) lunch.getFirst().get("carbsG")).containsKeys("low", "high");
        assertThat(list(send(account, "GET", "/v1/foods/frequent?slot=BREAKFAST", null))).as("a slot nobody ate in has none").isEmpty();
        assertThat(list(send(account, "GET", "/v1/foods/frequent", null))).extracting(item -> item.get("foodId")).containsExactly(CHICKEN, CEREAL);
        assertThat(send(account, "GET", "/v1/foods/frequent?slot=ELEVENSES", null)).hasStatus(400);
    }

    @Test
    void aFewAtMostAndOnlyTheLastWeeks() throws Exception {
        for (int i = 0; i < 14; i++) {
            jdbc.sql("""
                    insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g) values
                    (:id, :name, 'FOUNDATION', 100, 5, 10, 2) on conflict (id) do nothing""").param("id", "test:k1025-" + i)
                    .param("name", "K-1025 food " + i).update();
        }
        AccountId account = consenting();
        // Fourteen foods on fourteen days, the freshest the last; and one from more than the window ago.
        for (int i = 0; i < 14; i++) {
            meal(account, 14 - i, "LUNCH", "test:k1025-" + i, 100);
        }
        meal(account, 40, "LUNCH", CHICKEN, 200);

        List<Map<String, Object>> recent = list(send(account, "GET", "/v1/foods/recent", null));

        assertThat(recent).extracting(item -> item.get("foodId")).as("twelve (recent-foods, K-1063), the freshest, none of 40 days ago")
                .containsExactly("test:k1025-13", "test:k1025-12", "test:k1025-11", "test:k1025-10", "test:k1025-9", "test:k1025-8", "test:k1025-7",
                        "test:k1025-6", "test:k1025-5", "test:k1025-4", "test:k1025-3", "test:k1025-2");
    }

    @Test
    void noMealsIsAnEmptyListNotAnError() throws Exception {
        assertThat(list(send(consenting(), "GET", "/v1/foods/recent", null))).isEmpty();
    }

    @Test
    void aFoodTheProfileAvoidsIsNeverOffered() throws Exception {
        AccountId account = consenting();
        assertThat(send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC", "food", Map.of("avoid", List.of("cereal")),
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")))).hasStatusOk();
        meal(account, 2, "LUNCH", CHICKEN, 200, CEREAL, 50);

        assertThat(list(send(account, "GET", "/v1/foods/recent", null))).extracting(item -> item.get("foodId")).containsExactly(CHICKEN);
    }

    @Test
    void itAnswersWithNoTargetAndWithADayEatenPastWhateverItHeld() throws Exception {
        // The day's suggestions need a target and fit what is left (and say nothing past it); the recent foods are the user's own,
        // whatever the day holds: this account has no target, and has eaten six large meals today.
        AccountId account = consenting();
        for (int i = 0; i < 6; i++) {
            meal(account, 0, "SNACK", CHICKEN, 500, CEREAL, 300);
        }

        assertThat(list(send(account, "GET", "/v1/foods/recent", null))).extracting(item -> item.get("foodId")).containsExactlyInAnyOrder(CHICKEN, CEREAL);
    }

    @Test
    void itIsHealthDataAndTheUsersOwn() throws Exception {
        assertThat(send(TestSessions.newAccount(), "GET", "/v1/foods/recent", null)).hasStatus(403);
        AccountId mine = consenting();
        AccountId other = consenting();
        meal(other, 1, "LUNCH", CHICKEN, 200);

        assertThat(list(send(mine, "GET", "/v1/foods/recent", null))).isEmpty();
        assertThat(list(send(other, "GET", "/v1/foods/recent", null))).hasSize(1);
    }

    @Test
    void aSlotThatIsNotOneIsRefused() {
        assertThat(send(consenting(), "GET", "/v1/foods/recent?slot=ELEVENSES", null)).hasStatus(400);
    }

    private AccountId consenting() {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        return account;
    }

    @Test
    void theWindowIsTwentyEightDaysBackAndNotTheTwentyNinth() throws Exception {
        // suggestion-days 28: the day 28 days ago is in, the 29th is not (at noon UTC of the day, whatever hour the test runs at).
        AccountId account = consenting();
        meal(account, 28, "LUNCH", CHICKEN, 200);
        meal(account, 29, "LUNCH", CEREAL, 50);

        assertThat(list(send(account, "GET", "/v1/foods/recent", null))).extracting(item -> item.get("foodId")).containsExactly(CHICKEN);
    }

    @Test
    @SuppressWarnings("unchecked")
    void aRecipeIsOfferedAsIsAndNotWhenOneOfItsIngredientsIsAvoided() throws Exception {
        jdbc.sql("""
                insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g) values
                ('test:k1025-walnut', 'K-1025 test walnuts', 'FOUNDATION', 654, 15, 14, 65) on conflict (id) do nothing""").update();
        AccountId account = consenting();
        Map<String, Object> recipe = JSON.readValue(send(account, "POST", "/v1/recipes", Map.of("clientId", UUID.randomUUID(), "name", "K-1025 bowl",
                "portions", 2, "items", List.of(Map.of("foodId", "test:k1025-walnut", "amount", Map.of("quantity", 40, "unit", "g"))))).getResponse()
                .getContentAsString(), Map.class);
        String recipeId = "recipe:" + recipe.get("id");
        assertThat(send(account, "POST", "/v1/meals", Map.of("clientId", UUID.randomUUID(), "eatenAt", Instant.now().minus(Duration.ofHours(30)).toString(),
                "slot", "BREAKFAST", "items", List.of(Map.of("foodId", recipeId, "amount", Map.of("quantity", 1, "unit", "portion")))))).hasStatus(201);

        assertThat(list(send(account, "GET", "/v1/foods/recent", null))).singleElement().satisfies(item -> {
            assertThat(item).containsEntry("foodId", recipeId);
            assertThat((Map<String, Object>) item.get("kcal")).containsKeys("low", "high");
        });

        assertThat(send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC", "food", Map.of("avoid", List.of("walnut")),
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")))).hasStatusOk();
        assertThat(list(send(account, "GET", "/v1/foods/recent", null))).as("the bowl holds walnuts").isEmpty();
    }

    /**
     * A meal some days ago of foods and grams in pairs: at noon UTC of that day (a user without a profile lives on UTC), so
     * it is that day whatever hour the test runs at; today's, an hour earlier than now.
     */
    private void meal(AccountId account, int daysAgo, String slot, Object... foodAndGrams) {
        List<Map<String, Object>> items = new java.util.ArrayList<>();
        for (int i = 0; i < foodAndGrams.length; i += 2) {
            items.add(Map.of("foodId", foodAndGrams[i], "amount", Map.of("quantity", foodAndGrams[i + 1], "unit", "g")));
        }
        Instant at = daysAgo == 0 ? Instant.now().minus(1, ChronoUnit.HOURS)
                : java.time.LocalDate.now(java.time.ZoneOffset.UTC).minusDays(daysAgo).atTime(12, 0).toInstant(java.time.ZoneOffset.UTC);
        assertThat(send(account, "POST", "/v1/meals", Map.of("clientId", UUID.randomUUID(), "eatenAt", at.toString(), "slot", slot, "items", items)))
                .hasStatus(201);
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "PUT" -> mvc.put();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        }
        return request.exchange();
    }

    private static List<Map<String, Object>> list(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }
}
