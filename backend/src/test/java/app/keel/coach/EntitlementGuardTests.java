package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.profile.TestOnboarding;
import app.keel.shared.AccountId;
import app.keel.subscription.TestWebhooks;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
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
 * What the subscription pays for (K-703, ADR-012, ADR-056 #10): the coach's language model and the meal photo. Without an
 * active subscription those three routes answer 403 ENTITLEMENT_REQUIRED before anything else — no consent looked at, no
 * use counted, nothing sent. Everything else works without one (the deterministic mode): the log, the call, the engine's
 * own words.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class EntitlementGuardTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String RICE = "{\"items\":[{\"food\":\"zkrice\",\"quantity\":200,\"unit\":\"g\"}]}";

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
    void forget() {
        fake = (FakeLanguageModel) model;
        fake.forget();
    }

    @Test
    void withoutASubscriptionTheModelsRoutesSayWhyAndNothingIsCountedOrSent() throws Exception {
        AccountId account = withACall();
        fake.answer(RICE);

        for (MvcTestResult refused : List.of(ask(account), parse(account), photo(account))) {
            assertThat(refused).hasStatus(403);
            assertThat(code(refused)).isEqualTo("ENTITLEMENT_REQUIRED");
        }
        assertThat(fake.requests()).isEmpty();
        // Not taken and given back: not even a row.
        assertThat(jdbc.sql("select count(*) from subscription.daily_use where account_id = :a").param("a", account.value())
                .query(Integer.class).single()).isZero();
    }

    @Test
    void theSubscriptionIsAskedBeforeTheConsents() throws Exception {
        // No consent and no subscription: the paywall first — a consent is not asked for a feature that cannot be used.
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account);

        assertThat(List.of(parse(account), photo(account))).allSatisfy(refused -> assertThat(code(refused)).isEqualTo("ENTITLEMENT_REQUIRED"));
        // The coach too: a call to tell, the health consent, but neither the AI consent nor a subscription.
        AccountId withCall = withACall();
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, occurred_at)
                values (gen_random_uuid(), :a, 'THIRD_PARTY_AI', 'WITHDRAWN', :version, now())""").param("a", withCall.value())
                .param("version", ConsentTextVersions.THIRD_PARTY_AI).update();
        assertThat(code(ask(withCall))).isEqualTo("ENTITLEMENT_REQUIRED");
        // A photo that is no photo is not even looked at.
        MvcTestResult notAPhoto = send(account, "/v1/meals/photo", Map.of("image", Base64.getEncoder().encodeToString("not a picture".getBytes())));
        assertThat(code(notAPhoto)).isEqualTo("ENTITLEMENT_REQUIRED");
    }

    @Test
    void withASubscriptionTheModelIsAsked() throws Exception {
        AccountId account = withACall();
        TestWebhooks.subscribe(mvc, context, account);
        fake.answer("{\"topic\":\"WHY\"}");

        assertThat(ask(account)).hasStatusOk();
        assertThat(fake.requests()).hasSize(1);
        assertThat(used(account)).isEqualTo(1);
    }

    @Test
    void aSubscriptionThatEndedOrWasRefundedPaysForNothingMore() throws Exception {
        AccountId expired = withACall();
        AccountId refunded = withACall();
        AccountId endingSoon = withACall();
        Instant now = context.getBean(Clock.class).instant();
        // Ended an hour ago; bought a minute ago and refunded a second ago (the refund after the purchase, both past);
        // and one that ends in an hour, which still pays — the time asked about is now, not a day off either way.
        assertThat(TestWebhooks.send(mvc, context, TestWebhooks.event("evt-" + UUID.randomUUID(), "INITIAL_PURCHASE", expired,
                now.minus(Duration.ofDays(30)), now.minus(Duration.ofHours(1))))).hasStatusOk();
        assertThat(TestWebhooks.send(mvc, context, TestWebhooks.event("evt-" + UUID.randomUUID(), "INITIAL_PURCHASE", refunded,
                now.minusSeconds(60), now.plus(Duration.ofDays(30))))).hasStatusOk();
        Map<String, Object> refund = TestWebhooks.event("evt-" + UUID.randomUUID(), "CANCELLATION", refunded, now.minusSeconds(1),
                now.plus(Duration.ofDays(30)));
        refund.put("cancel_reason", "CUSTOMER_SUPPORT");
        assertThat(TestWebhooks.send(mvc, context, refund)).hasStatusOk();
        assertThat(TestWebhooks.send(mvc, context, TestWebhooks.event("evt-" + UUID.randomUUID(), "INITIAL_PURCHASE", endingSoon,
                now.minus(Duration.ofDays(30)), now.plus(Duration.ofHours(1))))).hasStatusOk();
        fake.answer("{\"topic\":\"WHY\"}");

        assertThat(code(ask(expired))).isEqualTo("ENTITLEMENT_REQUIRED");
        assertThat(code(ask(refunded))).isEqualTo("ENTITLEMENT_REQUIRED");
        assertThat(fake.requests()).isEmpty();
        assertThat(ask(endingSoon)).hasStatusOk();
        assertThat(fake.requests()).hasSize(1);
    }

    @Test
    void atTheDailyLimitWithoutASubscriptionItIsStillThePaywall() throws Exception {
        // The subscription before the day's count: past the limit an unsubscribed user is not told "tomorrow" (or given
        // an empty draft) — and no use is taken and given back, so not even a row is written.
        AccountId account = withACall();
        AccountId fresh = withACall();
        for (String use : List.of("COACH_MESSAGE", "PHOTO_ANALYSIS")) {
            jdbc.sql("insert into subscription.daily_use (account_id, day, use, used) values (:a, :day, :use, 1000)").param("a", account.value())
                    .param("day", java.time.LocalDate.now(java.time.ZoneOffset.UTC)).param("use", use).update();
        }

        for (MvcTestResult refused : List.of(ask(account), parse(account), photo(account), ask(fresh), parse(fresh), photo(fresh))) {
            assertThat(code(refused)).isEqualTo("ENTITLEMENT_REQUIRED");
        }
        assertThat(jdbc.sql("select count(*) from subscription.daily_use where account_id = :a").param("a", fresh.value())
                .query(Integer.class).single()).isZero();
    }

    @Test
    void aCallTheEngineAloneTellsNeedsNoSubscription() throws Exception {
        // The safety label (V4): never the model's to tell, so nothing is paid for — the call as it stands.
        AccountId account = withACall();
        jdbc.sql("update decision.weekly_call set decision = decision || '{\"safety\": true}'::jsonb where account_id = :a")
                .param("a", account.value()).update();

        MvcTestResult answer = ask(account);

        assertThat(answer).hasStatusOk();
        assertThat(JSON.readValue(answer.getResponse().getContentAsString(), Map.class)).containsEntry("mode", "DETERMINISTIC")
                .containsEntry("copyKey", "coach.answer.call").containsKey("call");
        assertThat(fake.requests()).isEmpty();
        // A call that is not there is still not found, subscription or not.
        assertThat(send(account, "/v1/coach/messages", Map.of("text", "Why?", "decisionId", UUID.randomUUID()))).hasStatus(404);
    }

    @Test
    void theEnginesOwnWordsNeedNoSubscription() throws Exception {
        // No call yet: the engine says so; nothing would be sent, so nothing is paid for.
        AccountId account = ready();

        MvcTestResult answer = ask(account);

        assertThat(answer).hasStatusOk();
        assertThat(JSON.readValue(answer.getResponse().getContentAsString(), Map.class)).containsEntry("mode", "DETERMINISTIC")
                .containsEntry("copyKey", "coach.answer.no_call");
    }

    @Test
    void everythingElseWorksWithoutASubscription() throws Exception {
        AccountId account = withACall();

        assertThat(mvc.get().uri("/v1/decisions/current").header("Authorization", TestSessions.bearer(context, account)).exchange()).hasStatusOk();
        assertThat(send(account, "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", Instant.now().minusSeconds(60).toString(),
                "kg", 82.0, "source", "MANUAL")).getResponse().getStatus()).isEqualTo(201);
        assertThat(send(account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", Instant.now().minusSeconds(60).toString()))
                .getResponse().getStatus()).isEqualTo(201);
        assertThat(send(account, "/v1/foods/search", Map.of("q", "rice"))).hasStatusOk();
    }

    private static String code(MvcTestResult result) throws Exception {
        return (String) JSON.readValue(result.getResponse().getContentAsString(), Map.class).get("code");
    }

    private int used(AccountId account) {
        return jdbc.sql("select coalesce(sum(used), 0) from subscription.daily_use where account_id = :a").param("a", account.value())
                .query(Integer.class).single();
    }

    /** Both consents, a profile, a weigh-in: no call yet, and no subscription. */
    private AccountId ready() {
        AccountId account = TestSessions.newAccount();
        send(account, "/v1/consents/HEALTH_DATA", "PUT", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        send(account, "/v1/consents/THIRD_PARTY_AI", "PUT", Map.of("textVersion", ConsentTextVersions.THIRD_PARTY_AI, "provider", "Example AI",
                "dataTypes", List.of("meal photo", "meal note", "coach question")));
        assertThat(send(account, "/v1/profile", "PUT", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")))).hasStatusOk();
        TestOnboarding.finishedTwoWeeksAgo(context, account);
        send(account, "/v1/weigh-ins", "POST", Map.of("clientId", UUID.randomUUID(), "measuredAt", Instant.now().minusSeconds(3600).toString(),
                "kg", 82.4, "source", "MANUAL"));
        return account;
    }

    /** Ready, with this week's call made, kept as a cut's step: a call the model would be asked about. */
    @SuppressWarnings("unchecked")
    private AccountId withACall() throws Exception {
        AccountId account = ready();
        String weekOf = (String) JSON.readValue(mvc.get().uri("/v1/check-ins/current").header("Authorization", TestSessions.bearer(context, account))
                .exchange().getResponse().getContentAsString(), Map.class).get("weekOf");
        assertThat(send(account, "/v1/check-ins/current/answers", "POST", Map.of("clientId", UUID.randomUUID(), "weekOf", weekOf, "answers", List.of())))
                .hasStatusOk();
        jdbc.sql("""
                update decision.weekly_call set decision = decision || '{"action": {"type": "ADJUST_CALORIES", "kcalPerDay": -500},
                    "copyKey": "decision.adjust_calories.cut"}'::jsonb where account_id = :a""").param("a", account.value()).update();
        return account;
    }

    private MvcTestResult ask(AccountId account) {
        return send(account, "/v1/coach/messages", Map.of("text", "Why less food?"));
    }

    private MvcTestResult parse(AccountId account) {
        return send(account, "/v1/meals/parse", Map.of("text", "200 g rice"));
    }

    private MvcTestResult photo(AccountId account) throws Exception {
        return send(account, "/v1/meals/photo", Map.of("image", Base64.getEncoder().encodeToString(MealPhotoTests.jpeg(200, 200))));
    }

    private MvcTestResult send(AccountId account, String uri, Object body) {
        return send(account, uri, "POST", body);
    }

    private MvcTestResult send(AccountId account, String uri, String method, Object body) {
        var request = method.equals("PUT") ? mvc.put() : mvc.post();
        return request.uri(uri).header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(body)).exchange();
    }
}
