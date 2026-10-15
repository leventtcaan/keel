package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.awaitility.Awaitility.await;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.shared.RevenueCatSubscribers;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * After a webhook, the account's entitlement is read again from RevenueCat's REST API (K-704, ADR-056 Ek 3), as its webhook
 * docs recommend, but after the webhook has been answered and on another thread. The answer is weighed by its moment and only
 * ever extends access (ending access comes from webhooks); a TRANSFER's receiver gets what it received without waiting for
 * another event; RevenueCat not answering, or no key being set, leaves the webhook's own result and a 200.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, RevenueCatRefreshTests.Stub.class})
@ExtendWith(OutputCaptureExtension.class)
class RevenueCatRefreshTests {

    private static final Duration PATIENCE = Duration.ofSeconds(15);
    /** For what must NOT happen: the refresh is asynchronous, so a quiet moment is given before looking. */
    private static final long QUIET_MS = 400;

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    Entitlements entitlements;

    @Autowired
    Subscriptions subscriptions;

    @Autowired
    RevenueCatRefresh refresh;

    @Autowired
    StubRevenueCat revenueCat;

    private final Instant now = Instant.now().truncatedTo(ChronoUnit.MILLIS);
    private final Instant monthLater = now.plus(Duration.ofDays(30));

    @BeforeEach
    void reset() {
        revenueCat.answers.clear();
        revenueCat.asked.clear();
        revenueCat.failure = null;
        revenueCat.configured = true;
        revenueCat.gate = null;
    }

    private AccountId account() {
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account);
        return account;
    }

    private MvcTestResult send(Map<String, Object> event) {
        return TestWebhooks.send(mvc, context, event);
    }

    private static String id() {
        return "evt-" + UUID.randomUUID();
    }

    private Optional<SubscriptionState> kept(AccountId account) {
        return subscriptions.kept(account);
    }

    private static void quiet() throws InterruptedException {
        Thread.sleep(QUIET_MS);
    }

    @Test
    void afterAWebhookTheEntitlementIsRefreshedFromRestAndRestsLaterEndIsTheAccessEnd() {
        AccountId account = account();
        Instant renewedTo = monthLater.plus(Duration.ofDays(7));
        revenueCat.answers.put(account, RevenueCatAnswers.entitled(now.plusSeconds(1), renewedTo));

        MvcTestResult sent = send(TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now, monthLater));

        assertThat(sent.getResponse().getStatus()).isEqualTo(200);
        await().atMost(PATIENCE).untilAsserted(() -> assertThat(kept(account)).hasValueSatisfying(state -> {
            assertThat(state.accessUntil()).isEqualTo(renewedTo);
            assertThat(state.lastEventAt()).isEqualTo(now.plusSeconds(1));
        }));
        assertThat(revenueCat.asked).containsExactly(account);
        assertThat(entitlements.active(account, monthLater.plus(Duration.ofDays(3)))).isTrue();
    }

    @Test
    void theWebhookIsAnsweredWithoutWaitingForASlowRestAndTheRefreshLandsLater() {
        AccountId account = account();
        Instant renewedTo = monthLater.plus(Duration.ofDays(7));
        revenueCat.answers.put(account, RevenueCatAnswers.entitled(now.plusSeconds(1), renewedTo));
        CountDownLatch gate = new CountDownLatch(1);
        revenueCat.gate = gate; // REST answers only when the test lets it

        // A 200 comes back while the REST ask is still stuck: were it waited for, this would hang and time out.
        MvcTestResult sent = org.junit.jupiter.api.Assertions.assertTimeoutPreemptively(Duration.ofSeconds(5),
                () -> send(TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now, monthLater)));

        assertThat(sent.getResponse().getStatus()).isEqualTo(200);
        assertThat(kept(account)).hasValueSatisfying(state -> assertThat(state.accessUntil()).as("the webhook's result so far").isEqualTo(monthLater));
        await().atMost(PATIENCE).untilAsserted(() -> assertThat(revenueCat.asked).containsExactly(account));

        gate.countDown();

        await().atMost(PATIENCE).untilAsserted(() -> assertThat(kept(account)).hasValueSatisfying(state -> assertThat(state.accessUntil()).isEqualTo(renewedTo)));
    }

    @Test
    void aTransferNamingManyReceiversAsksOnlyTheFirstFew() throws Exception {
        AccountId from = account();
        List<AccountId> receivers = java.util.stream.IntStream.range(0, 14).mapToObj(i -> account()).toList();
        Map<String, Object> transfer = TestWebhooks.event(id(), "TRANSFER", from, now, null);
        transfer.remove("app_user_id");
        transfer.remove("entitlement_ids");
        transfer.put("transferred_from", List.of(from.value().toString()));
        transfer.put("transferred_to", receivers.stream().map(a -> a.value().toString()).toList());

        assertThat(send(transfer).getResponse().getStatus()).isEqualTo(200);

        await().atMost(PATIENCE).untilAsserted(() -> assertThat(revenueCat.asked).hasSize(10));
        quiet();
        assertThat(revenueCat.asked).as("the configured cap, in order").containsExactlyElementsOf(receivers.subList(0, 10));
    }

    @Test
    void anAnswerOlderThanTheEventsStateNeverTakesItBack() throws Exception {
        AccountId account = account();
        // RevenueCat's answer was made a minute before this event happened (a slow reply, a replica behind): it says "ended".
        revenueCat.answers.put(account, RevenueCatAnswers.entitled(now.minusSeconds(60), now.minus(Duration.ofDays(1))));

        send(TestWebhooks.event(id(), "RENEWAL", account, now, monthLater));

        await().atMost(PATIENCE).untilAsserted(() -> assertThat(revenueCat.asked).containsExactly(account));
        quiet();
        assertThat(kept(account)).hasValueSatisfying(state -> {
            assertThat(state.accessUntil()).isEqualTo(monthLater);
            assertThat(state.lastEventAt()).isEqualTo(now);
        });
        assertThat(entitlements.active(account, now)).isTrue();
    }

    @Test
    void aNewerAnswerThatSaysEndedNeverShortensAccessAJustReceivedRenewalGave() throws Exception {
        AccountId account = account();
        // The answer is stamped after the renewal but lags it (RevenueCat promises no consistency): ending access is the webhooks' alone.
        revenueCat.answers.put(account, RevenueCatAnswers.entitled(now.plusSeconds(1), now.minusSeconds(1)));

        send(TestWebhooks.event(id(), "RENEWAL", account, now, monthLater));

        await().atMost(PATIENCE).untilAsserted(() -> assertThat(revenueCat.asked).containsExactly(account));
        quiet();
        assertThat(entitlements.active(account, now.plusSeconds(2))).as("a paying user is not locked out").isTrue();
        assertThat(kept(account)).hasValueSatisfying(state -> {
            assertThat(state.accessUntil()).isEqualTo(monthLater);
            assertThat(state.status()).isEqualTo(SubscriptionState.Status.ACTIVE);
        });
    }

    @Test
    void anEventThatComesAfterTheAnswerWasMadeStillWins() throws Exception {
        AccountId account = account();
        // The answer (made at now+10s) is applied; then an event from after it, as a slow webhook would arrive.
        revenueCat.answers.put(account, RevenueCatAnswers.entitled(now.plusSeconds(10), monthLater));
        send(TestWebhooks.event(id(), "RENEWAL", account, now, monthLater));
        await().atMost(PATIENCE).untilAsserted(() -> assertThat(kept(account)).hasValueSatisfying(state -> assertThat(state.lastEventAt()).isEqualTo(now.plusSeconds(10))));
        Map<String, Object> refund = TestWebhooks.event(id(), "CANCELLATION", account, now.plusSeconds(20), monthLater);
        refund.put("cancel_reason", "CUSTOMER_SUPPORT");
        revenueCat.answers.put(account, RevenueCatAnswers.entitled(now.plusSeconds(5), monthLater)); // older than the refund: ignored

        send(refund);

        quiet();
        assertThat(entitlements.active(account, now.plusSeconds(30))).isFalse();
        assertThat(kept(account)).hasValueSatisfying(state -> assertThat(state.status()).isEqualTo(SubscriptionState.Status.REFUNDED));
    }

    @Test
    void aTransfersReceiverGetsItsAccessAtOnceFromRestAndTheAccountItLeftLosesIt() {
        AccountId from = account();
        AccountId to = account();
        send(TestWebhooks.event(id(), "INITIAL_PURCHASE", from, now.minusSeconds(100), monthLater));
        revenueCat.answers.put(to, RevenueCatAnswers.entitled(now.plusSeconds(1), monthLater));
        await().atMost(PATIENCE).untilAsserted(() -> assertThat(revenueCat.asked).contains(from));
        revenueCat.asked.clear();
        Map<String, Object> transfer = TestWebhooks.event(id(), "TRANSFER", from, now, null);
        transfer.remove("app_user_id");
        transfer.remove("entitlement_ids");
        transfer.put("transferred_from", List.of(from.value().toString(), "$RCAnonymousID:abc"));
        transfer.put("transferred_to", List.of(to.value().toString()));

        MvcTestResult sent = send(transfer);

        assertThat(sent.getResponse().getStatus()).isEqualTo(200);
        assertThat(entitlements.active(from, now)).as("the account it left, at once from the event").isFalse();
        await().atMost(PATIENCE).untilAsserted(() -> assertThat(entitlements.active(to, now)).as("the receiver, without another event").isTrue());
        assertThat(revenueCat.asked).as("only the receiver is asked").containsExactly(to);
    }

    @Test
    void aTransferReceiverThatIsNotOursIsNotAskedAbout() throws Exception {
        AccountId from = account();
        Map<String, Object> transfer = TestWebhooks.event(id(), "TRANSFER", from, now, null);
        transfer.put("transferred_from", List.of(from.value().toString()));
        transfer.put("transferred_to", List.of("$RCAnonymousID:abc", UUID.randomUUID().toString(), "1-1-1-1-1"));

        assertThat(send(transfer).getResponse().getStatus()).isEqualTo(200);

        quiet();
        assertThat(revenueCat.asked).isEmpty();
    }

    @Test
    void anEventThatSaysNothingAboutTheEntitlementAsksNothing() throws Exception {
        AccountId account = account();
        Map<String, Object> otherProduct = TestWebhooks.event(id(), "RENEWAL", account, now, monthLater);
        otherProduct.put("entitlement_ids", List.of("another"));
        Map<String, Object> test = TestWebhooks.event(id(), "TEST", account, now, monthLater);
        Map<String, Object> noEnvironment = TestWebhooks.event(id(), "RENEWAL", account, now, monthLater);
        noEnvironment.remove("environment");

        for (Map<String, Object> event : List.of(otherProduct, test, noEnvironment)) {
            assertThat(send(event).getResponse().getStatus()).isEqualTo(200);
        }

        quiet();
        assertThat(revenueCat.asked).isEmpty();
        assertThat(kept(account)).isEmpty();
    }

    @Test
    void anAccountThatIsNotOursIsNotAskedAbout() throws Exception {
        send(TestWebhooks.event(id(), "RENEWAL", new AccountId(UUID.randomUUID()), now, monthLater));

        quiet();
        assertThat(revenueCat.asked).isEmpty();
    }

    @Test
    void restBeingDownLeavesTheWebhooksResultAnd200AndLogsTheFailureWithoutItsMessage(CapturedOutput log) {
        AccountId account = account();
        revenueCat.failure = new ApiException(ErrorCode.SERVICE_UNAVAILABLE, new IllegalStateException("sk_secret_in_a_message"));

        MvcTestResult sent = send(TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now, monthLater));

        assertThat(sent.getResponse().getStatus()).as("RevenueCat must not retry an event that was applied").isEqualTo(200);
        assertThat(kept(account)).hasValueSatisfying(state -> assertThat(state.accessUntil()).isEqualTo(monthLater));
        await().atMost(PATIENCE).untilAsserted(() -> assertThat(log.getAll()).contains("failure")
                .contains("task=" + RevenueCatRefresh.class.getName() + "#refresh").doesNotContain("sk_secret_in_a_message"));
        assertThat(kept(account)).hasValueSatisfying(state -> assertThat(state.accessUntil()).isEqualTo(monthLater));
    }

    @Test
    void anAnswerThatIsNotUsableLeavesTheWebhooksResultToo() throws Exception {
        AccountId account = account();
        revenueCat.answers.put(account, "{\"subscriber\": {}}"); // no moment: its place in the order is unknown

        assertThat(send(TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now, monthLater)).getResponse().getStatus()).isEqualTo(200);

        await().atMost(PATIENCE).untilAsserted(() -> assertThat(revenueCat.asked).containsExactly(account));
        quiet();
        assertThat(kept(account)).hasValueSatisfying(state -> assertThat(state.accessUntil()).isEqualTo(monthLater));
    }

    @Test
    void withNoKeyTheWebhookAloneKeepsTheEntitlementAsBefore() throws Exception {
        AccountId account = account();
        revenueCat.configured = false;

        assertThat(send(TestWebhooks.event(id(), "INITIAL_PURCHASE", account, now, monthLater)).getResponse().getStatus()).isEqualTo(200);

        quiet();
        assertThat(kept(account)).hasValueSatisfying(state -> {
            assertThat(state.accessUntil()).isEqualTo(monthLater);
            assertThat(state.lastEventAt()).isEqualTo(now);
        });
    }

    @Test
    void anAnswerForAnAccountThatWasDeletedKeepsNothing() {
        AccountId gone = new AccountId(UUID.randomUUID());
        revenueCat.answers.put(gone, RevenueCatAnswers.entitled(now, monthLater));

        refresh.refresh(gone);

        assertThat(kept(gone)).isEmpty();
        assertThat(jdbc.sql("select count(*) from subscription.subscription where account_id = :account").param("account", gone.value())
                .query(Integer.class).single()).isZero();
    }

    @Test
    void anAccountWithNoSubscriptionAndAnAnswerWithNoEntitlementKeepsNothing() {
        AccountId account = account();
        revenueCat.answers.put(account, "{\"request_date_ms\": " + now.toEpochMilli() + ", \"subscriber\": {\"entitlements\": {}, \"subscriptions\": {}}}");

        refresh.refresh(account);

        assertThat(kept(account)).isEmpty();
    }

    @Test
    void theRefreshItselfNeverThrowsWhateverRestDoes() {
        AccountId account = account();
        revenueCat.failure = new IllegalStateException("anything");

        assertThat(catchThrowable(() -> refresh.refresh(account))).isNull();
        assertThatCode(() -> refresh.afterWebhook(List.of(account))).doesNotThrowAnyException();
    }

    /** RevenueCat's REST API, answering what a test sets for an account, and noting who it was asked about. */
    static final class StubRevenueCat implements RevenueCatSubscribers {

        final Map<AccountId, String> answers = new ConcurrentHashMap<>();
        final List<AccountId> asked = new CopyOnWriteArrayList<>();
        volatile RuntimeException failure;
        volatile boolean configured = true;
        /** When set, an ask is noted and then waits here: a REST API that is slow to answer. */
        volatile CountDownLatch gate;

        @Override
        public Optional<String> fetch(AccountId account) {
            if (!configured) {
                return Optional.empty();
            }
            asked.add(account);
            CountDownLatch waiting = gate;
            if (waiting != null) {
                try {
                    waiting.await();
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                }
            }
            if (failure != null) {
                throw failure;
            }
            return Optional.ofNullable(answers.get(account));
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Stub {

        @Bean
        @Primary
        StubRevenueCat stubRevenueCat() {
            return new StubRevenueCat();
        }
    }
}
