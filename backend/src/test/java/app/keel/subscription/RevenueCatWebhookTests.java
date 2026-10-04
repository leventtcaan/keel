package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
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

/**
 * RevenueCat's webhook on the server (K-701, ADR-056): only a signed event changes a subscription; each event is applied
 * once; an older one never takes the state back; an account that is not ours keeps nothing; the account a transfer left
 * loses access. Entitlements.active is what other modules read.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class RevenueCatWebhookTests {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    Entitlements entitlements;

    @Autowired
    SubscriptionAccountData data;

    private final Instant now = Instant.now().truncatedTo(ChronoUnit.MILLIS);
    private final Instant monthLater = now.plus(Duration.ofDays(30));

    private AccountId account() {
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account); // makes the account row
        return account;
    }

    private static String id() {
        return "evt-" + UUID.randomUUID();
    }

    private MvcTestResult send(Map<String, Object> event) {
        return TestWebhooks.send(mvc, context, event);
    }

    private int rows(String table, AccountId account) {
        return jdbc.sql("select count(*) from " + table + " where account_id = :account").param("account", account.value()).query(Integer.class).single();
    }

    @Test
    void aSignedPurchaseGivesAccessUntilItsEndAndNothingElseIsKept() {
        AccountId account = account();
        assertThat(entitlements.active(account, now)).as("no subscription, no access").isFalse();

        MvcTestResult sent = send(TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now, monthLater));

        assertThat(sent.getResponse().getStatus()).isEqualTo(200);
        assertThat(entitlements.active(account, now)).isTrue();
        assertThat(entitlements.active(account, monthLater.minusMillis(1))).isTrue();
        assertThat(entitlements.active(account, monthLater)).isFalse();
        // Only the state and the event's kind and moment: no price, country or attribute.
        String kept = jdbc.sql("select row_to_json(s)::text from subscription.subscription s where account_id = :account")
                .param("account", account.value()).query(String.class).single()
                + jdbc.sql("select string_agg(row_to_json(e)::text, '') from subscription.webhook_event e where account_id = :account")
                .param("account", account.value()).query(String.class).single();
        assertThat(kept).doesNotContain("12.99").doesNotContain("TR\"").doesNotContain("example.com").doesNotContain("APP_STORE");
    }

    @Test
    void anUnsignedOrWronglySignedEventChangesNothing() throws Exception {
        AccountId account = account();
        byte[] body = TestWebhooks.body(TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now, monthLater));
        long t = Instant.now().getEpochSecond();

        MvcTestResult unsigned = mvc.post().uri(RevenueCatWebhook.PATH).contentType(MediaType.APPLICATION_JSON).content(body).exchange();
        MvcTestResult wrong = mvc.post().uri(RevenueCatWebhook.PATH).header(WebhookSignature.HEADER,
                        "t=" + t + ",v1=" + RevenueCatSignatureTests.sign(TestWebhooks.utf8("not our secret"), t, body))
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
        // A session token is no proof either: the webhook reads none.
        MvcTestResult withSession = mvc.post().uri(RevenueCatWebhook.PATH).header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();

        assertThat(List.of(unsigned, wrong, withSession)).allSatisfy(result -> {
            assertThat(result.getResponse().getStatus()).isEqualTo(401);
            assertThat(result.getResponse().getContentAsString()).contains("UNAUTHENTICATED");
        });
        assertThat(rows("subscription.subscription", account)).isZero();
        assertThat(rows("subscription.webhook_event", account)).isZero();
        assertThat(entitlements.active(account, now)).isFalse();
    }

    @Test
    void theSameEventSentAgainIsAppliedOnce() {
        AccountId account = account();
        Map<String, Object> purchase = TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now, monthLater);

        send(purchase);
        MvcTestResult again = send(purchase);

        assertThat(again.getResponse().getStatus()).as("RevenueCat must not send it a third time").isEqualTo(200);
        assertThat(rows("subscription.webhook_event", account)).isEqualTo(1);
        assertThat(entitlements.active(account, now)).isTrue();
    }

    @Test
    void anOlderEventArrivingLateNeverTakesTheStateBack() {
        AccountId account = account();
        Map<String, Object> refundBefore = TestWebhooks.event(id(), "CANCELLATION", account, now.minusSeconds(3600), monthLater);
        refundBefore.put("cancel_reason", "CUSTOMER_SUPPORT");

        send(TestWebhooks.event(id(), "RENEWAL", account, now, monthLater));
        send(refundBefore);

        assertThat(entitlements.active(account, now)).as("the renewal came after the refund").isTrue();
        assertThat(rows("subscription.webhook_event", account)).as("both weighed").isEqualTo(2);
    }

    @Test
    void aRefundEndsAccessAtOnceAndALaterRenewalGivesItBack() {
        AccountId account = account();
        Map<String, Object> refund = TestWebhooks.event(id(), "CANCELLATION", account, now, monthLater);
        refund.put("cancel_reason", "CUSTOMER_SUPPORT");

        send(TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now.minusSeconds(60), monthLater));
        send(refund);
        assertThat(entitlements.active(account, now)).isFalse();

        send(TestWebhooks.event(id(), "RENEWAL", account, now.plusSeconds(60), monthLater));
        assertThat(entitlements.active(account, now.plusSeconds(60))).isTrue();
    }

    @Test
    void anEventForNoAccountOfOursKeepsNothing() {
        String anonymous = "$RCAnonymousID:" + UUID.randomUUID().toString().replace("-", "");
        UUID gone = UUID.randomUUID(); // never an account
        Map<String, Object> forAnonymous = TestWebhooks.event(id(), "INITIAL_PURCHASE", new AccountId(UUID.randomUUID()), now, monthLater);
        forAnonymous.put("app_user_id", anonymous);
        Map<String, Object> forGone = TestWebhooks.event(id(), "INITIAL_PURCHASE", new AccountId(gone), now, monthLater);
        Map<String, Object> notCanonical = TestWebhooks.event(id(), "INITIAL_PURCHASE", new AccountId(gone), now, monthLater);
        notCanonical.put("app_user_id", gone.toString().toUpperCase());

        assertThat(List.of(send(forAnonymous), send(forGone), send(notCanonical))).allSatisfy(result ->
                assertThat(result.getResponse().getStatus()).isEqualTo(200));
        assertThat(jdbc.sql("select count(*) from subscription.webhook_event where event_id in (:ids)")
                .param("ids", List.of(forAnonymous.get("id"), forGone.get("id"), notCanonical.get("id"))).query(Integer.class).single()).isZero();
        assertThat(rows("subscription.subscription", new AccountId(gone))).isZero();
    }

    @Test
    void anEventOfAnotherEntitlementOrStoreEnvironmentOrOfNoInterestChangesNothing() {
        AccountId account = account();
        Map<String, Object> other = TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now, monthLater);
        other.put("entitlement_ids", List.of("something_else"));
        Map<String, Object> staging = TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now, monthLater);
        staging.put("environment", "STAGING");
        Map<String, Object> test = TestWebhooks.event(id(), "TEST", account, now, monthLater);

        assertThat(List.of(send(other), send(staging), send(test))).allSatisfy(result -> assertThat(result.getResponse().getStatus()).isEqualTo(200));
        assertThat(rows("subscription.subscription", account)).isZero();
        assertThat(rows("subscription.webhook_event", account)).isZero();
    }

    @Test
    void theAccountATransferLeftLosesAccess() {
        AccountId from = account();
        AccountId to = account();
        send(TestWebhooks.event(id(), "INITIAL_PURCHASE", from, now.minusSeconds(60), monthLater));

        Map<String, Object> transfer = new java.util.LinkedHashMap<>();
        transfer.put("id", id());
        transfer.put("type", "TRANSFER");
        transfer.put("event_timestamp_ms", now.toEpochMilli());
        transfer.put("transferred_from", List.of(from.value().toString()));
        transfer.put("transferred_to", List.of(to.value().toString()));
        transfer.put("environment", "PRODUCTION");
        transfer.put("store", "APP_STORE");
        assertThat(send(transfer).getResponse().getStatus()).isEqualTo(200);

        assertThat(entitlements.active(from, now)).isFalse();
        // The account it went to gets access with its own next event (ADR-056 #6; K-704 refreshes at once).
        assertThat(entitlements.active(to, now)).isFalse();
    }

    @Test
    void aSignedBodyThatIsNoEventIsRefusedAndATooLongOneIsNotRead() throws Exception {
        for (String body : new String[] {"not json", "[]", "{\"api_version\":\"1.0\"}", "{\"event\":{\"type\":\"RENEWAL\",\"event_timestamp_ms\":1}}",
                "{\"event\":{\"id\":\"e\",\"event_timestamp_ms\":1}}", "{\"event\":{\"id\":\"e\",\"type\":\"RENEWAL\",\"event_timestamp_ms\":\"soon\"}}"}) {
            MvcTestResult result = TestWebhooks.sendRaw(mvc, context, TestWebhooks.utf8(body));
            assertThat(result.getResponse().getStatus()).as(body).isEqualTo(400);
            assertThat(result.getResponse().getContentAsString()).as(body).contains("VALIDATION_FAILED");
        }
        byte[] tooLong = new byte[context.getBean(RevenueCatProperties.class).maxBodyBytes() + 1];
        java.util.Arrays.fill(tooLong, (byte) ' ');
        assertThat(TestWebhooks.sendRaw(mvc, context, tooLong).getResponse().getStatus()).isEqualTo(413);
    }

    @Test
    void twoEventsForOneAccountAtOnceLeaveTheLatest() throws Exception {
        List<AccountId> accounts = new ArrayList<>();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<CompletableFuture<MvcTestResult>> sent = new ArrayList<>();
            for (int i = 0; i < 12; i++) {
                AccountId account = account();
                accounts.add(account);
                Map<String, Object> earlierRefund = TestWebhooks.event(id(), "CANCELLATION", account, now.minusSeconds(60), monthLater);
                earlierRefund.put("cancel_reason", "CUSTOMER_SUPPORT");
                Map<String, Object> laterRenewal = TestWebhooks.event(id(), "RENEWAL", account, now, monthLater);
                sent.add(CompletableFuture.supplyAsync(() -> send(earlierRefund), pool));
                sent.add(CompletableFuture.supplyAsync(() -> send(laterRenewal), pool));
            }
            for (CompletableFuture<MvcTestResult> each : sent) {
                assertThat(each.get().getResponse().getStatus()).isEqualTo(200);
            }
        } finally {
            pool.shutdown();
        }

        assertThat(accounts).allSatisfy(account -> assertThat(entitlements.active(account, now)).isTrue());
    }

    @Test
    void theSubscriptionGoesWithTheAccountAndIsInItsExport() {
        AccountId account = account();
        send(TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now, monthLater));

        @SuppressWarnings("unchecked")
        Map<String, Object> exported = (Map<String, Object>) data.export(account);
        assertThat((Map<String, Object>) exported.get("subscription")).containsEntry("status", "ACTIVE")
                .containsEntry("accessUntil", monthLater.toString());
        assertThat((List<Object>) exported.get("subscriptionEvents")).containsExactly(Map.of("type", "INITIAL_PURCHASE", "at", now.toString()));

        data.on(new app.keel.shared.AccountDeletionRequested(account));

        assertThat(rows("subscription.subscription", account)).isZero();
        assertThat(rows("subscription.webhook_event", account)).isZero();
    }
}
