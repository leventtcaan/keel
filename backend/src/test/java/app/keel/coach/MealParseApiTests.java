package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.subscription.TestWebhooks;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
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
 * POST /v1/meals/parse (K-504): a meal said in words becomes a draft — foods from the database with the grams the model
 * read; sure when a food holds every word, one tap among the others when not (U5). No number of what a food holds comes
 * from the model (U1): the estimate is the database's, once the user picks.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class MealParseApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    LanguageModel model;

    private FakeLanguageModel fake;

    @BeforeEach
    void foodsAndAFreshModel() {
        fake = (FakeLanguageModel) model;
        fake.forget();
        // Names no other test's search can meet ("zkhen", "zkstew"…): the database is shared across test classes.
        jdbc.sql("""
                insert into nutrition.food (id, name, brand, source, kcal, protein_g, carbs_g, fat_g) values
                ('k504:1', 'Zkhen breast, grilled', null, 'FOUNDATION', 165, 31, 0, 4),
                ('k504:2', 'Zkhen thigh, roasted', null, 'FOUNDATION', 209, 26, 0, 11),
                ('k504:3', 'Zkrice, white, cooked', null, 'FOUNDATION', 130, 3, 28, 0),
                ('k504:4', 'Zkegg, whole, raw', null, 'FOUNDATION', 143, 13, 1, 10),
                ('k504:5', 'Zkeggnog', null, 'FOUNDATION', 88, 5, 8, 4),
                ('k504:6', 'Zkhen wings', 'Zkfarm', 'BRANDED', 203, 30, 0, 8),
                ('k504:7', 'Zkhen nuggets', null, 'FOUNDATION', 296, 15, 16, 19),
                ('k504:8', 'Zkhen soup', null, 'FOUNDATION', 50, 4, 5, 2),
                ('k504:9', 'Zkstew, beef', null, 'FOUNDATION', 95, 7, 8, 4)
                on conflict (id) do nothing""").update();
    }

    @org.junit.jupiter.api.AfterEach
    void noFoodLeftForOtherTests() {
        jdbc.sql("delete from nutrition.food where id like 'k504:%'").update();
    }

    @Test
    @SuppressWarnings("unchecked")
    void aMealInWordsIsADraftOfTheDatabasesFoods() throws Exception {
        AccountId account = ready();
        fake.answer("{\"items\":[{\"food\":\"zkhen breast grilled\",\"quantity\":150,\"unit\":\"g\"},{\"food\":\"qqq unknown dish\",\"quantity\":1,\"unit\":\"bowl\"}]}");

        Map<String, Object> draft = ok(parse(account, "150 g grilled chicken breast and some mystery stew"));

        assertThat(draft).containsEntry("mode", "MODEL");
        List<Map<String, Object>> items = (List<Map<String, Object>>) draft.get("items");
        assertThat(items).hasSize(2);
        assertThat(items.get(0)).containsEntry("food", "zkhen breast grilled").containsEntry("amount", Map.of("quantity", 150, "unit", "g"))
                .containsEntry("confident", true);
        assertThat((List<Map<String, Object>>) items.get(0).get("candidates")).first().isEqualTo(Map.of("id", "k504:1", "name", "Zkhen breast, grilled"));
        // Words no food holds: nothing sure, nothing made up — the user searches.
        assertThat(items.get(1)).containsEntry("confident", false).containsEntry("candidates", List.of())
                .containsEntry("amount", Map.of("quantity", 1, "unit", "bowl"));
        assertThat(JSON.writeValueAsString(draft)).doesNotContainIgnoringCase("kcal");
        assertThat(fake.requests()).singleElement().satisfies(request -> {
            assertThat(request.purpose()).isEqualTo(Purpose.PARSE_MEAL);
            // The words' own instructions and the user's words, as they were (K-514 review: the shared path pins neither).
            assertThat(request.system()).isEqualTo(CoachInstructions.read("parse-meal.md"));
            assertThat(request.turns()).containsExactly(Turn.user("150 g grilled chicken breast and some mystery stew"));
        });
        assertThat(used(account)).as("one use for one message").isEqualTo(1);
    }

    @Test
    @SuppressWarnings("unchecked")
    void theAmountGoesAsItIsToTheDatabasesEstimate() throws Exception {
        // K-504 review: what the draft says is what /v1/food-estimates takes — a quantity rounded to 2 decimals.
        AccountId account = ready();
        fake.answer("{\"items\":[{\"food\":\"zkrice white cooked\",\"quantity\":52.6667,\"unit\":\"g\"}]}");
        Map<String, Object> item = ((List<Map<String, Object>>) ok(parse(account, "a third of a cup of rice")).get("items")).getFirst();
        String picked = (String) ((List<Map<String, Object>>) item.get("candidates")).getFirst().get("id");

        assertThat(mvc.post().uri("/v1/food-estimates").header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("items", List.of(Map.of("foodId", picked, "amount", item.get("amount")))))).exchange()).hasStatusOk();
    }

    @Test
    @SuppressWarnings("unchecked")
    void aWholeWordIsSureAndOnlyAWholeWord() throws Exception {
        // "egg" holds in "Egg, whole" — not in "Eggnog", which a search by letters finds first (K-504 review).
        AccountId account = ready();
        fake.answer("{\"items\":[{\"food\":\"zkegg\",\"quantity\":2,\"unit\":\"piece\"}]}");

        Map<String, Object> item = ((List<Map<String, Object>>) ok(parse(account, "two eggs")).get("items")).getFirst();

        assertThat(item).containsEntry("confident", true);
        assertThat((List<Map<String, Object>>) item.get("candidates")).extracting(food -> food.get("id")).containsExactly("k504:4", "k504:5");
    }

    @Test
    @SuppressWarnings("unchecked")
    void wordsNoFoodHoldsTogetherOfferEachWordsFoodsInTurn() throws Exception {
        // "zkhen zkstew": no food holds both; the first word has more foods than are offered — the second still gets
        // its turn (K-504 review), and a stop word is never looked up.
        AccountId account = ready();
        fake.answer("{\"items\":[{\"food\":\"zkhen and zkstew\",\"quantity\":300,\"unit\":\"g\"}]}");

        Map<String, Object> item = ((List<Map<String, Object>>) ok(parse(account, "a bowl of chicken stew")).get("items")).getFirst();

        assertThat(item).containsEntry("confident", false);
        List<Map<String, Object>> offered = (List<Map<String, Object>>) item.get("candidates");
        assertThat(offered).hasSizeLessThanOrEqualTo(5).extracting(food -> food.get("id")).contains("k504:9");
        assertThat(offered).anySatisfy(food -> assertThat(food).containsEntry("brand", "Zkfarm").containsEntry("id", "k504:6"))
                .as("a brand when there is one, none when not").anySatisfy(food -> assertThat(food).doesNotContainKey("brand"));
    }

    @Test
    void aReplyThatSaysWhatAFoodHoldsIsDroppedWhole() throws Exception {
        AccountId account = ready();
        fake.answer("{\"items\":[{\"food\":\"zkrice\",\"quantity\":200,\"unit\":\"g\",\"kcal\":260}]}");

        assertThat(ok(parse(account, "200 g rice"))).isEqualTo(Map.of("mode", "DETERMINISTIC", "items", List.of()));
    }

    @Test
    void withoutTheAiConsentToSendTheMealNothingIsSent() throws Exception {
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account); // the account row, for the subscription below
        TestWebhooks.subscribe(mvc, context, account); // what is tested here is the consent, not the subscription (K-703)
        healthConsent(account);
        fake.answer("{\"items\":[{\"food\":\"zkrice\",\"quantity\":200,\"unit\":\"g\"}]}");

        assertThat(parse(account, "200 g rice")).hasStatus(403);
        assertThat(fake.requests()).isEmpty();
        assertThat(used(account)).isZero();
    }

    @Test
    void aMealIsHealthDataSoWithoutThatConsentNothingIsSent() throws Exception {
        // ADR-026 #2: every meal route is behind the health data consent — a meal read from words too (K-504 review).
        AccountId account = ready();
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, occurred_at)
                values (gen_random_uuid(), :a, 'HEALTH_DATA', 'WITHDRAWN', :version, now())""").param("a", account.value())
                .param("version", ConsentTextVersions.HEALTH_DATA).update();
        fake.answer("{\"items\":[{\"food\":\"zkrice\",\"quantity\":200,\"unit\":\"g\"}]}");

        assertThat(parse(account, "200 g rice")).hasStatus(403);
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    void aProviderThatFailsGivesTheUseBack() throws Exception {
        AccountId account = ready();
        fake.fail(new IllegalStateException("provider down"));

        assertThat(parse(account, "200 g rice").getResponse().getStatus()).isGreaterThanOrEqualTo(500);
        assertThat(used(account)).isZero();
    }

    @Test
    void pastTheDailyLimitTheUserSearchesAndNothingIsSent() throws Exception {
        AccountId account = ready();
        jdbc.sql("insert into subscription.daily_use (account_id, day, use, used) values (:a, :day, 'COACH_MESSAGE', 1000)")
                .param("a", account.value()).param("day", LocalDate.now(ZoneOffset.UTC)).update();

        assertThat(ok(parse(account, "200 g rice"))).isEqualTo(Map.of("mode", "DETERMINISTIC", "items", List.of()));
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    void aMealIsAFewSentences() {
        AccountId account = ready();
        assertThat(parse(account, " ")).hasStatus(400);
        assertThat(parse(account, "a".repeat(501))).hasStatus(400);
    }

    private int used(AccountId account) {
        return jdbc.sql("select coalesce(sum(used), 0) from subscription.daily_use where account_id = :a").param("a", account.value())
                .query(Integer.class).single();
    }

    private void healthConsent(AccountId account) {
        assertThat(mvc.put().uri("/v1/consents/HEALTH_DATA").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("textVersion", ConsentTextVersions.HEALTH_DATA)))
                .exchange()).hasStatusOk();
    }

    private AccountId ready() {
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account); // the account row, for the subscription below
        TestWebhooks.subscribe(mvc, context, account); // what is tested here is the consent, not the subscription (K-703)
        healthConsent(account);
        assertThat(mvc.put().uri("/v1/consents/THIRD_PARTY_AI").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("textVersion", ConsentTextVersions.THIRD_PARTY_AI,
                        "provider", "Example AI", "dataTypes", List.of("meal photo", "meal note", "coach question"))))
                .exchange()).hasStatusOk();
        return account;
    }

    private MvcTestResult parse(AccountId account, String text) {
        return mvc.post().uri("/v1/meals/parse").header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("text", text))).exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> ok(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
