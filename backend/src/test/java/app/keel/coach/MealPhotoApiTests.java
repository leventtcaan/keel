package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.subscription.TestWebhooks;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
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
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * POST /v1/meals/photo (K-514, V1, V2, U1, U5): a meal photo — at most 1024 px a side — goes out only with the AI consent
 * that names the meal photo, without anything the file carried besides its pixels, and comes back as a draft of the
 * database's foods with grams by eye, marked as estimated: the range and the gram question are the database's
 * (/v1/food-estimates). It counts against the day's photo analyses, not the coach's messages.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class MealPhotoApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String RICE = "{\"items\":[{\"food\":\"zkphrice white cooked\",\"quantity\":180,\"unit\":\"g\"}]}";

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
        // Names no other test's search can meet: the database is shared across test classes (K-504 review).
        jdbc.sql("""
                insert into nutrition.food (id, name, brand, source, kcal, protein_g, carbs_g, fat_g) values
                ('k514:1', 'Zkphrice, white, cooked', null, 'FOUNDATION', 130, 3, 28, 0),
                ('k514:2', 'Zkphchicken breast, grilled', null, 'FOUNDATION', 165, 31, 0, 4)
                on conflict (id) do nothing""").update();
    }

    @AfterEach
    void noFoodLeftForOtherTests() {
        jdbc.sql("delete from nutrition.food where id like 'k514:%'").update();
    }

    @Test
    @SuppressWarnings("unchecked")
    void aMealPhotoIsADraftWithGramsByEyeMarkedEstimated() throws Exception {
        AccountId account = ready();
        fake.answer(RICE);

        Map<String, Object> draft = ok(photo(account, MealPhotoTests.jpeg(800, 600)));

        assertThat(draft).containsEntry("mode", "MODEL");
        Map<String, Object> item = ((List<Map<String, Object>>) draft.get("items")).getFirst();
        assertThat(item).containsEntry("food", "zkphrice white cooked").containsEntry("confident", true)
                .containsEntry("amount", Map.of("quantity", 180, "unit", "g", "certainty", "ESTIMATED"));
        assertThat(JSON.writeValueAsString(draft)).doesNotContainIgnoringCase("kcal");
        assertThat(fake.requests()).singleElement().satisfies(request -> {
            assertThat(request.purpose()).isEqualTo(Purpose.PHOTO_MEAL);
            // The photo's own instructions (grams only): a real model given the words' would answer in cups (K-514 review).
            assertThat(request.system()).isEqualTo(CoachInstructions.read("photo-meal.md"));
            assertThat(request.turns()).singleElement().satisfies(turn -> {
                assertThat(turn.text()).isEmpty();
                assertThat(turn.picture().mediaType()).isEqualTo("image/jpeg");
            });
        });
        assertThat(used(account, "PHOTO_ANALYSIS")).as("a photo analysis, not a coach message").isEqualTo(1);
        assertThat(used(account, "COACH_MESSAGE")).isZero();
    }

    @Test
    @SuppressWarnings("unchecked")
    void theRangeIsTheDatabasesWideForAnEyeAndItAsksForGrams() throws Exception {
        AccountId account = ready();
        fake.answer(RICE);
        Map<String, Object> item = ((List<Map<String, Object>>) ok(photo(account, MealPhotoTests.jpeg(400, 300))).get("items")).getFirst();
        String picked = (String) ((List<Map<String, Object>>) item.get("candidates")).getFirst().get("id");

        MvcTestResult estimate = mvc.post().uri("/v1/food-estimates").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("items", List.of(Map.of("foodId", picked, "amount", item.get("amount")))))).exchange();

        Map<String, Object> body = ok(estimate);
        Map<String, Object> kcal = (Map<String, Object>) body.get("kcal");
        assertThat(((Number) kcal.get("low")).intValue()).isLessThan(((Number) kcal.get("high")).intValue());
        assertThat(body).containsKey("question");
    }

    @Test
    void whatTheFileCarriedBesidesThePixelsNeverLeaves() throws Exception {
        AccountId account = ready();
        fake.answer(RICE);
        byte[] withExif = MealPhotoTests.withSegment(MealPhotoTests.jpeg(640, 480), MealPhotoTests.exif("GPSLatitude 36.8969"));

        assertThat(photo(account, withExif)).hasStatusOk();

        Picture sent = fake.requests().getFirst().turns().getFirst().picture();
        assertThat(MealPhotoTests.contains(sent.bytes(), "Exif")).isFalse();
        assertThat(MealPhotoTests.contains(sent.bytes(), "GPSLatitude")).isFalse();
        assertThat(ImageIO.read(new ByteArrayInputStream(sent.bytes())).getWidth()).isEqualTo(640);
    }

    @Test
    void largerThan1024PxIsRefusedAndNothingIsSent() throws Exception {
        AccountId account = ready();
        fake.answer(RICE);

        assertThat(photo(account, MealPhotoTests.jpeg(1025, 700))).hasStatus(400);
        assertThat(fake.requests()).isEmpty();
        assertThat(used(account, "PHOTO_ANALYSIS")).isZero();
    }

    @Test
    void onlyAPhotoIsTaken() throws Exception {
        AccountId account = ready();
        assertThat(post(account, Map.of("image", Base64.getEncoder().encodeToString("not a picture".getBytes())))).hasStatus(400);
        assertThat(post(account, Map.of("image", "%%% not base64 %%%"))).hasStatus(400);
        assertThat(post(account, Map.of())).hasStatus(400);
        assertThat(post(account, Map.of("image", 123))).hasStatus(400);
        assertThat(mvc.post().uri("/v1/meals/photo").header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content("[]").exchange()).hasStatus(400);
        assertThat(mvc.post().uri("/v1/meals/photo").header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"image\":\"" + "A".repeat(4_000_000) + "\"}").exchange()).as("more than a 1024 px photo can be").hasStatus(413);
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    void withoutTheConsentToSendAMealPhotoNothingIsSent() throws Exception {
        // The AI consent names the data (V2): agreeing to send a meal note is not agreeing to send a photo. The server
        // takes a grant only with today's list, so a consent that left the photo out is one given to another text.
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account); // the account row, for the subscription below
        TestWebhooks.subscribe(mvc, context, account); // what is tested here is the consent, not the subscription (K-703)
        healthConsent(account);
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, provider, data_types, occurred_at)
                values (gen_random_uuid(), :a, 'THIRD_PARTY_AI', 'GRANTED', :version, 'Example AI', :types, now())""")
                .param("a", account.value()).param("version", ConsentTextVersions.THIRD_PARTY_AI)
                .param("types", new String[] {"meal note", "coach question"}).update();
        fake.answer(RICE);

        assertThat(photo(account, MealPhotoTests.jpeg(200, 200))).hasStatus(403);
        assertThat(fake.requests()).isEmpty();
        assertThat(used(account, "PHOTO_ANALYSIS")).isZero();
    }

    @Test
    void withoutTheConsentAPhotoIsNotEvenLookedAt() throws Exception {
        // The consent first (K-514 review): a user who has not agreed gets the consent's answer, not a verdict on the photo.
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account); // the account row, for the subscription below
        TestWebhooks.subscribe(mvc, context, account); // what is tested here is the consent, not the subscription (K-703)
        healthConsent(account);

        assertThat(post(account, Map.of("image", Base64.getEncoder().encodeToString("not a picture".getBytes())))).hasStatus(403);
        assertThat(photo(account, MealPhotoTests.jpeg(1025, 10))).hasStatus(403);
    }

    @Test
    void aMealIsHealthDataSoWithoutThatConsentNothingIsSent() throws Exception {
        AccountId account = ready();
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, occurred_at)
                values (gen_random_uuid(), :a, 'HEALTH_DATA', 'WITHDRAWN', :version, now())""").param("a", account.value())
                .param("version", ConsentTextVersions.HEALTH_DATA).update();
        fake.answer(RICE);

        assertThat(photo(account, MealPhotoTests.jpeg(200, 200))).hasStatus(403);
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    void pastTheDaysPhotoAnalysesTheUserSearchesAndNothingIsSent() throws Exception {
        AccountId account = ready();
        jdbc.sql("insert into subscription.daily_use (account_id, day, use, used) values (:a, :day, 'PHOTO_ANALYSIS', 1000)")
                .param("a", account.value()).param("day", LocalDate.now(ZoneOffset.UTC)).update();

        assertThat(ok(photo(account, MealPhotoTests.jpeg(200, 200)))).isEqualTo(Map.of("mode", "DETERMINISTIC", "items", List.of()));
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    void aReplyOffItsSchemaLeavesTheUserToSearch() throws Exception {
        AccountId account = ready();
        fake.answer("{\"items\":[{\"food\":\"zkphrice\",\"quantity\":1,\"unit\":\"cup\"}]}");
        assertThat(ok(photo(account, MealPhotoTests.jpeg(200, 200)))).isEqualTo(Map.of("mode", "DETERMINISTIC", "items", List.of()));

        fake.answer("{\"items\":[{\"food\":\"zkphrice\",\"quantity\":180,\"unit\":\"g\",\"kcal\":234}]}");
        assertThat(ok(photo(account, MealPhotoTests.jpeg(200, 200)))).isEqualTo(Map.of("mode", "DETERMINISTIC", "items", List.of()));
    }

    @Test
    void aProviderThatFailsGivesTheUseBack() throws Exception {
        AccountId account = ready();
        fake.fail(new IllegalStateException("provider down"));

        assertThat(photo(account, MealPhotoTests.jpeg(200, 200)).getResponse().getStatus()).isGreaterThanOrEqualTo(500);
        assertThat(used(account, "PHOTO_ANALYSIS")).isZero();
    }

    private int used(AccountId account, String use) {
        return jdbc.sql("select coalesce(sum(used), 0) from subscription.daily_use where account_id = :a and use = :use").param("a", account.value())
                .param("use", use).query(Integer.class).single();
    }

    private void healthConsent(AccountId account) {
        assertThat(mvc.put().uri("/v1/consents/HEALTH_DATA").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("textVersion", ConsentTextVersions.HEALTH_DATA)))
                .exchange()).hasStatusOk();
    }

    private void aiConsent(AccountId account, List<String> dataTypes) {
        assertThat(mvc.put().uri("/v1/consents/THIRD_PARTY_AI").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("textVersion", ConsentTextVersions.THIRD_PARTY_AI,
                        "provider", "Example AI", "dataTypes", dataTypes)))
                .exchange()).hasStatusOk();
    }

    private AccountId ready() {
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account); // the account row, for the subscription below
        TestWebhooks.subscribe(mvc, context, account); // what is tested here is the consent, not the subscription (K-703)
        healthConsent(account);
        aiConsent(account, List.of("meal photo", "meal note", "coach question"));
        return account;
    }

    private MvcTestResult photo(AccountId account, byte[] image) {
        return post(account, Map.of("image", Base64.getEncoder().encodeToString(image)));
    }

    private MvcTestResult post(AccountId account, Map<String, Object> body) {
        return mvc.post().uri("/v1/meals/photo").header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(body)).exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> ok(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
