package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.BooleanSupplier;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;
import org.springframework.scheduling.config.TaskExecutionOutcome;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * Applied RevenueCat events go after the retention (K-814, GDPR Art. 5(1)(e)). An event is kept only so a second delivery
 * of it is not applied twice; RevenueCat's retries end within hours, and an older event that comes back after its record
 * is gone cannot move the state back (SubscriptionState.next, ADR-056 Ek 2). The night as the scheduler runs it logs a
 * failure without its message (V3).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, WebhookEventCleanupTests.Broken.class})
@ExtendWith(OutputCaptureExtension.class)
class WebhookEventCleanupTests {

    // Long before any other test's events (they are at the clock's now): the cut here reaches only this test's own.
    private static final Instant NIGHT = Instant.parse("2020-06-15T04:00:00Z");
    static final String SECRET = "weigh-in 82.4 kg";
    private static final Duration PATIENCE = Duration.ofSeconds(10);

    @Autowired
    @Qualifier("webhookEventCleanup")
    WebhookEventCleanup cleanup;

    @Autowired
    @Qualifier("brokenEventCleanup")
    WebhookEventCleanup broken;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    ScheduledTaskHolder scheduler;

    @Autowired
    Environment environment;

    @Test
    void anEventOlderThanTheRetentionGoesANewerOneStays() {
        Duration retention = environment.getProperty("keel.subscription.event-retention", Duration.class);
        AccountId account = account();
        String old = event(account, NIGHT.minus(retention).minusSeconds(1));
        String kept = event(account, NIGHT.minus(retention).plusSeconds(1));

        cleanup.cleanUp(NIGHT);

        assertThat(events(account)).containsExactly(kept).doesNotContain(old);
    }

    @Test
    void aPurgedEventDeliveredAgainDoesNotTakeTheStateBack() {
        AccountId account = account();
        Instant now = Instant.now();
        Map<String, Object> first = TestWebhooks.event("evt-" + UUID.randomUUID(), "INITIAL_PURCHASE", account, now.minus(Duration.ofDays(70)),
                now.minus(Duration.ofDays(63)));
        Map<String, Object> renewal = TestWebhooks.event("evt-" + UUID.randomUUID(), "RENEWAL", account, now.minus(Duration.ofDays(40)),
                now.plus(Duration.ofDays(5)));
        assertThat(TestWebhooks.send(mvc, context, first).getResponse().getStatus()).isEqualTo(200);
        assertThat(TestWebhooks.send(mvc, context, renewal).getResponse().getStatus()).isEqualTo(200);
        Map<String, Object> state = state(account);

        cleanup.cleanUp(now);
        assertThat(events(account)).as("both older than the retention").isEmpty();
        assertThat(TestWebhooks.send(mvc, context, first).getResponse().getStatus()).isEqualTo(200);

        assertThat(events(account)).as("weighed again, not ignored as known").containsExactly((String) first.get("id"));
        assertThat(state(account)).isEqualTo(state);
    }

    @Test
    void itRunsOnceADay() {
        String cron = environment.getProperty("keel.subscription.event-cleanup");
        ZoneId zone = ZoneId.of(environment.getProperty("keel.subscription.event-cleanup-zone"));

        assertThat(nightlyTasks()).isNotEmpty().allSatisfy(task -> assertThat(task.getExpression()).isEqualTo(cron));
        ZonedDateTime run = CronExpression.parse(cron).next(ZonedDateTime.of(2026, 10, 5, 0, 0, 0, 0, zone));
        assertThat(CronExpression.parse(cron).next(run)).isEqualTo(run.plusDays(1));
    }

    @Test
    void theSchedulersNightCutsAtNowAndLogsAFailureWithoutItsMessage(CapturedOutput log) {
        // The failure's message does hold the value, so its absence from the log below means something.
        assertThatThrownBy(() -> broken.cleanUp(NIGHT)).hasStackTraceContaining(SECRET);
        Duration retention = environment.getProperty("keel.subscription.event-retention", Duration.class);
        AccountId account = account();
        String old = event(account, Instant.now().minus(retention).minusSeconds(60));
        String recent = event(account, Instant.now().minus(retention).plusSeconds(3600));

        // As the scheduler runs them — the real night and the broken one: each returns at once (run as a listener is,
        // through BackgroundFailures), so nothing reaches the scheduler's own handler, which would log the message.
        for (CronTask task : nightlyTasks()) {
            assertThatCode(task.getRunnable()::run).doesNotThrowAnyException();
            assertThat(task.getLastExecutionOutcome().status()).isEqualTo(TaskExecutionOutcome.Status.SUCCESS);
        }

        String line = "task=" + WebhookEventCleanup.class.getName() + "#nightly";
        await(() -> !events(account).contains(old) && log.getAll().contains(line));
        assertThat(events(account)).containsExactly(recent);
        assertThat(log).contains("failure").contains(line).doesNotContain(SECRET);
    }

    private List<CronTask> nightlyTasks() {
        return scheduler.getScheduledTasks().stream().map(ScheduledTask::getTask).filter(CronTask.class::isInstance).map(CronTask.class::cast)
                .filter(task -> task.toString().equals(WebhookEventCleanup.class.getName() + ".nightly")).toList();
    }

    private AccountId account() {
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account);
        return account;
    }

    private String event(AccountId account, Instant at) {
        String id = "evt-" + UUID.randomUUID();
        jdbc.sql("insert into subscription.webhook_event (event_id, account_id, type, event_at) values (:id, :account, 'RENEWAL', :at)")
                .param("id", id).param("account", account.value()).param("at", at.atOffset(ZoneOffset.UTC)).update();
        return id;
    }

    private List<String> events(AccountId account) {
        return jdbc.sql("select event_id from subscription.webhook_event where account_id = :account order by event_at")
                .param("account", account.value()).query(String.class).list();
    }

    private Map<String, Object> state(AccountId account) {
        return jdbc.sql("select status, access_until, last_event_at from subscription.subscription where account_id = :account")
                .param("account", account.value()).query().singleRow();
    }

    private static void await(BooleanSupplier done) {
        Instant deadline = Instant.now().plus(PATIENCE);
        while (!done.getAsBoolean() && Instant.now().isBefore(deadline)) {
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    /** A second cleanup whose database cannot be reached, with a value in the failure's message. */
    @TestConfiguration(proxyBeanMethods = false)
    static class Broken {

        @Bean
        WebhookEventCleanup brokenEventCleanup(Environment environment) {
            return new WebhookEventCleanup(JdbcClient.create(new DriverManagerDataSource("jdbc:keel-none:" + SECRET)), Clock.systemUTC(),
                    environment.getProperty("keel.subscription.event-retention", Duration.class));
        }
    }
}
