package app.keel.privacy;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import app.keel.subscription.TestWebhooks;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.function.IntSupplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * The account's customer at RevenueCat goes with the account (K-704, M8 inventory gap 4, V6). It is a module's deletion of its
 * own, so RevenueCat being down fails only that one — our data is deleted all the same — and the registry resends it
 * (DeletionRetry) until RevenueCat answers.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class RevenueCatCustomerDeletionTests {

    private static final String KEY = "sk_test_deletion_0123456789";
    private static final Duration PATIENCE = Duration.ofSeconds(10);
    private static final RevenueCatRestTests.FakeRevenueCat REVENUECAT;

    static {
        try {
            REVENUECAT = new RevenueCatRestTests.FakeRevenueCat();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @DynamicPropertySource
    static void revenueCat(DynamicPropertyRegistry registry) {
        registry.add("keel.privacy.revenuecat.api-key", () -> KEY);
        registry.add("keel.privacy.revenuecat.base-uri", () -> REVENUECAT.uri() + "/v1/");
    }

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @BeforeEach
    void reset() {
        REVENUECAT.status = 200;
        REVENUECAT.body = "{}";
        REVENUECAT.requests.clear();
    }

    private AccountId subscribed() {
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account);
        TestWebhooks.subscribe(mvc, context, account);
        return account;
    }

    private void delete(AccountId account) {
        assertThat(mvc.delete().uri("/v1/account").header("Authorization", TestSessions.bearer(context, account)).exchange()).hasStatus(202);
    }

    private long deletesFor(AccountId account) {
        return REVENUECAT.requests.stream().filter(request -> request.method().equals("DELETE")
                && request.path().equals("/v1/subscribers/" + account.value()) && ("Bearer " + KEY).equals(request.authorization())).count();
    }

    private int ourSubscriptionRows(AccountId account) {
        return jdbc.sql("select count(*) from subscription.subscription where account_id = :account").param("account", account.value())
                .query(Integer.class).single();
    }

    private int customerDeletionsPending(AccountId account) {
        return jdbc.sql("select count(*) from event_publication where listener_id like '%RevenueCatCustomerDeletion%' and serialized_event like '%' || :id || '%'")
                .param("id", account.value().toString()).query(Integer.class).single();
    }

    @Test
    void deletingTheAccountDeletesItsCustomerAtRevenueCat() throws Exception {
        AccountId account = subscribed();

        delete(account);

        await(() -> (int) deletesFor(account), 1);
        await(() -> ourSubscriptionRows(account), 0);
    }

    @Test
    void revenueCatBeingDownDoesNotBlockOurDeletionAndTheCustomerIsDeletedWhenItIsBack() throws Exception {
        AccountId account = subscribed();
        REVENUECAT.status = 503;

        delete(account);

        // Ours is gone though RevenueCat answered 503: its deletion is a listener of its own.
        await(() -> ourSubscriptionRows(account), 0);
        await(() -> (int) deletesFor(account), 1);
        Thread.sleep(200); // the registry marks the publication failed after the listener throws
        assertThat(customerDeletionsPending(account)).as("the failed call, kept for its retry").isEqualTo(1);

        REVENUECAT.status = 200;
        context.getBean(DeletionRetry.class).retry();

        await(() -> (int) deletesFor(account), 2);
        await(() -> customerDeletionsPending(account), 0);
    }

    private static void await(IntSupplier count, int expected) throws InterruptedException {
        Instant deadline = Instant.now().plus(PATIENCE);
        while (count.getAsInt() != expected && Instant.now().isBefore(deadline)) {
            Thread.sleep(50);
        }
        assertThat(count.getAsInt()).isEqualTo(expected);
    }
}
