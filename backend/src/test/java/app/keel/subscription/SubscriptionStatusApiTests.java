package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * The subscription over the API (K-705, ADR-056 addendum 1): what the server keeps from RevenueCat's events, read only —
 * active from accessUntil alone, the status for the app to tell; an account that never subscribed is 200 and inactive,
 * not an error; one account never sees another's.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class SubscriptionStatusApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    private Instant now() {
        return context.getBean(Clock.class).instant().truncatedTo(ChronoUnit.MILLIS);
    }

    private AccountId account() {
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account); // makes the account row
        return account;
    }

    private void send(Map<String, Object> event) {
        assertThat(TestWebhooks.send(mvc, context, event)).hasStatusOk();
    }

    private static String id() {
        return "evt-" + UUID.randomUUID();
    }

    @Test
    void anAccountThatNeverSubscribedIsInactiveAndNothingElseAndReadingKeepsNothing() throws Exception {
        AccountId account = account();

        Map<String, Object> subscription = read(get(account));

        assertThat(subscription).isEqualTo(Map.of("active", false));
        assertThat(jdbc.sql("select count(*) from subscription.subscription where account_id = :account").param("account", account.value())
                .query(Integer.class).single()).as("reading changes nothing").isZero();
    }

    @Test
    void aTrialIsActiveUntilItsEnd() throws Exception {
        AccountId account = account();
        Instant weekLater = now().plus(Duration.ofDays(7));
        Map<String, Object> trial = TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now(), weekLater);
        trial.put("period_type", "TRIAL");
        send(trial);

        assertThat(read(get(account))).containsEntry("active", true).containsEntry("status", "TRIAL")
                .containsEntry("accessUntil", weekLater.toString());
    }

    @Test
    void aCancelledSubscriptionStaysActiveUntilWhatWasPaidFor() throws Exception {
        AccountId account = account();
        Instant monthLater = now().plus(Duration.ofDays(30));
        send(TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now().minus(Duration.ofDays(1)), monthLater));
        Map<String, Object> cancellation = TestWebhooks.event(id(), "CANCELLATION", account, now(), monthLater);
        cancellation.put("cancel_reason", "UNSUBSCRIBE");
        send(cancellation);

        assertThat(read(get(account))).containsEntry("active", true).containsEntry("status", "CANCELLED")
                .containsEntry("accessUntil", monthLater.toString());
    }

    @Test
    void anExpiredSubscriptionIsInactiveAndSaysWhenItEnded() throws Exception {
        AccountId account = account();
        Instant ended = now().minus(Duration.ofDays(2));
        send(TestWebhooks.event(id(), "INITIAL_PURCHASE", account, ended.minus(Duration.ofDays(30)), ended));
        send(TestWebhooks.event(id(), "EXPIRATION", account, ended, ended));

        assertThat(read(get(account))).containsEntry("active", false).containsEntry("status", "EXPIRED")
                .containsEntry("accessUntil", ended.toString());
    }

    @Test
    void aPeriodOverWithoutItsExpiryYetIsInactiveByTheServersClock() throws Exception {
        // The status is what the last event said; whether access is on is the server's own clock against accessUntil.
        AccountId account = account();
        Instant over = now().minus(Duration.ofMinutes(5));
        send(TestWebhooks.event(id(), "RENEWAL", account, over.minus(Duration.ofDays(30)), over));

        assertThat(read(get(account))).containsEntry("active", false).containsEntry("status", "ACTIVE");
    }

    @Test
    void oneAccountNeverSeesAnothersSubscription() throws Exception {
        AccountId subscribed = account();
        TestWebhooks.subscribe(mvc, context, subscribed);
        AccountId other = account();

        assertThat(read(get(subscribed))).containsEntry("active", true).containsEntry("status", "ACTIVE");
        assertThat(read(get(other))).isEqualTo(Map.of("active", false));
    }

    @Test
    void withoutASessionThereIsNoAnswer() {
        assertThat(mvc.get().uri("/v1/subscription").exchange()).hasStatus(401);
    }

    private MvcTestResult get(AccountId account) {
        return mvc.get().uri("/v1/subscription").header("Authorization", TestSessions.bearer(context, account)).exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
