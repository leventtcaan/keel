package app.keel.privacy;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.IntSupplier;
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
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * A module whose deletion fails is tried again (K-214 review, V6): the user was told 202, so a lost deletion would be a
 * broken promise nobody sees. The failure is logged through SafeLog — which listener, what type, where — never its
 * message (V3).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, DeletionRetryTests.FailsOnce.class})
@ExtendWith(OutputCaptureExtension.class)
class DeletionRetryTests {

    private static final Duration PATIENCE = Duration.ofSeconds(10);
    /** What a failure's message could hold (a value from the request); it must not reach the log. */
    static final String SECRET = "weigh-in 82.4 kg";

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    FlakyDeletion flaky;

    @Test
    void aFailedDeletionIsTriedAgainAndLoggedWithoutItsMessage(CapturedOutput log) throws Exception {
        AccountId account = TestSessions.newAccount();

        assertThat(mvc.delete().uri("/v1/account").header("Authorization", TestSessions.bearer(context, account)).exchange()).hasStatus(202);
        await(() -> flaky.calls(), 1);
        Thread.sleep(200); // the registry marks the publication failed after the listener throws

        context.getBean(DeletionRetry.class).retry();

        await(() -> flaky.calls(), 2);
        assertThat(log).contains("failure").contains("task=" + FlakyDeletion.class.getName() + "#on").doesNotContain(SECRET);
    }

    private static void await(IntSupplier calls, int expected) throws InterruptedException {
        Instant deadline = Instant.now().plus(PATIENCE);
        while (calls.getAsInt() < expected && Instant.now().isBefore(deadline)) {
            Thread.sleep(50);
        }
        assertThat(calls.getAsInt()).as("deletion attempts").isEqualTo(expected);
    }

    /** A module's deletion that fails the first time, as a lost connection would. */
    static class FlakyDeletion {

        // Read through a method: the bean is a proxy (the registry wraps listeners), and a proxy's fields are empty.
        private final AtomicInteger calls = new AtomicInteger();

        int calls() {
            return calls.get();
        }

        @ApplicationModuleListener
        void on(AccountDeletionRequested deletion) {
            if (calls.incrementAndGet() == 1) {
                throw new IllegalStateException(SECRET);
            }
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class FailsOnce {

        @Bean
        FlakyDeletion flakyDeletion() {
            return new FlakyDeletion();
        }
    }
}
