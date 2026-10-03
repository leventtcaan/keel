package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
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
        jdbc.sql("""
                insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g) values
                ('k504:1', 'Chicken breast, grilled', 'FOUNDATION', 165, 31, 0, 4),
                ('k504:2', 'Chicken thigh, roasted', 'FOUNDATION', 209, 26, 0, 11),
                ('k504:3', 'Rice, white, cooked', 'FOUNDATION', 130, 3, 28, 0)
                on conflict (id) do nothing""").update();
    }

    @Test
    @SuppressWarnings("unchecked")
    void aMealInWordsIsADraftOfTheDatabasesFoods() throws Exception {
        AccountId account = ready();
        fake.answer("{\"items\":[{\"food\":\"chicken breast grilled\",\"grams\":150},{\"food\":\"zzz unknown dish\",\"grams\":80}]}");

        Map<String, Object> draft = ok(parse(account, "150 g grilled chicken breast and some mystery stew"));

        assertThat(draft).containsEntry("mode", "MODEL");
        List<Map<String, Object>> items = (List<Map<String, Object>>) draft.get("items");
        assertThat(items).hasSize(2);
        assertThat(items.get(0)).containsEntry("food", "chicken breast grilled").containsEntry("grams", 150).containsEntry("confident", true);
        assertThat((List<Map<String, Object>>) items.get(0).get("candidates")).first().satisfies(food -> assertThat(food).containsEntry("id", "k504:1"));
        // Words no food holds: nothing sure, nothing made up — the user searches.
        assertThat(items.get(1)).containsEntry("confident", false).containsEntry("candidates", List.of());
        assertThat(JSON.writeValueAsString(draft)).doesNotContainIgnoringCase("kcal");
        assertThat(fake.requests()).singleElement().satisfies(request -> assertThat(request.purpose()).isEqualTo(Purpose.PARSE_MEAL));
    }

    @Test
    @SuppressWarnings("unchecked")
    void wordsNoFoodHoldsTogetherOfferTheFoodsOfItsWords() throws Exception {
        // "chicken stew" — no food holds both words: the foods of each word, one tap away, none sure (U5).
        AccountId account = ready();
        fake.answer("{\"items\":[{\"food\":\"chicken stew\",\"grams\":300}]}");

        Map<String, Object> item = ((List<Map<String, Object>>) ok(parse(account, "a bowl of chicken stew")).get("items")).getFirst();

        assertThat(item).containsEntry("confident", false);
        assertThat((List<Map<String, Object>>) item.get("candidates")).extracting(food -> food.get("id")).contains("k504:1", "k504:2");
    }

    @Test
    void aReplyThatSaysWhatAFoodHoldsIsDroppedWhole() throws Exception {
        AccountId account = ready();
        fake.answer("{\"items\":[{\"food\":\"rice\",\"grams\":200,\"kcal\":260}]}");

        assertThat(ok(parse(account, "200 g rice"))).isEqualTo(Map.of("mode", "DETERMINISTIC", "items", List.of()));
    }

    @Test
    void withoutTheAiConsentToSendTheMealNothingIsSent() throws Exception {
        AccountId account = TestSessions.newAccount();
        fake.answer("{\"items\":[{\"food\":\"rice\",\"grams\":200}]}");

        assertThat(parse(account, "200 g rice")).hasStatus(403);
        assertThat(fake.requests()).isEmpty();
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

    private AccountId ready() {
        AccountId account = TestSessions.newAccount();
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
