package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;

/**
 * Yesterday's counts are deleted each night (K-532, ADR-043 #77): only today's is ever read, so an older one is data kept
 * for no purpose. The cut is QuotaCleanup.oldestKept (QuotaCleanupDayTests); here the night's delete, what it leaves to
 * the export, its schedule, and its failure — logged through BackgroundFailures without the failure's message (V3).
 */
@SpringBootTest
@Import({PostgresTestConfiguration.class, QuotaCleanupTests.Broken.class})
@ExtendWith(OutputCaptureExtension.class)
class QuotaCleanupTests {

    // Long before any other test's rows (they are on today's date): the cut here reaches only this test's own.
    private static final Instant NIGHT = Instant.parse("2020-06-15T12:00:00Z");
    // At -18:00 that night is 14 June 18:00, so 13 June is the earliest yesterday anywhere and the oldest day kept.
    private static final LocalDate OLDEST_KEPT = LocalDate.parse("2020-06-13");
    /** What a failure's message could hold; it must not reach the log. */
    static final String SECRET = "weigh-in 82.4 kg";
    private static final Duration PATIENCE = Duration.ofSeconds(10);

    @Autowired
    @Qualifier("quotaCleanup")
    QuotaCleanup cleanup;

    @Autowired
    @Qualifier("brokenCleanup")
    QuotaCleanup broken;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    SubscriptionAccountData data;

    @Autowired
    ScheduledTaskHolder scheduler;

    @Autowired
    Environment environment;

    @Test
    void daysBeforeTheOldestKeptGoForEveryAccountAndUse() {
        AccountId one = TestSessions.newAccount();
        AccountId other = TestSessions.newAccount();
        for (AccountId account : List.of(one, other)) {
            for (Quota.Use use : Quota.Use.values()) {
                for (int back = 0; back <= 5; back++) {
                    used(account, use, OLDEST_KEPT.plusDays(3).minusDays(back));
                }
            }
        }

        cleanup.cleanUp(NIGHT);

        for (AccountId account : List.of(one, other)) {
            for (Quota.Use use : Quota.Use.values()) {
                assertThat(days(account, use)).as(use.name()).containsExactly(OLDEST_KEPT, OLDEST_KEPT.plusDays(1),
                        OLDEST_KEPT.plusDays(2), OLDEST_KEPT.plusDays(3));
            }
        }
    }

    @Test
    void theExportShowsWhatIsKept() {
        AccountId account = TestSessions.newAccount();
        used(account, Quota.Use.COACH_MESSAGE, OLDEST_KEPT.minusDays(1));
        used(account, Quota.Use.COACH_MESSAGE, OLDEST_KEPT);

        cleanup.cleanUp(NIGHT);

        assertThat(data.export(account)).isEqualTo(Map.of("dailyUses",
                List.of(Map.of("day", OLDEST_KEPT.toString(), "use", "COACH_MESSAGE", "used", 3))));
    }

    @Test
    void itRunsEveryNight() {
        String cron = environment.getProperty("keel.subscription.quota-cleanup");

        assertThat(cron).isNotBlank();
        assertThat(scheduler.getScheduledTasks()).anySatisfy(task -> assertThat(task.getTask()).isInstanceOfSatisfying(CronTask.class,
                cronTask -> {
                    assertThat(cronTask.toString()).isEqualTo(QuotaCleanup.class.getName() + ".nightly");
                    assertThat(cronTask.getExpression()).isEqualTo(cron);
                }));
    }

    @Test
    void aFailedNightIsLoggedWithoutItsMessage(CapturedOutput log) throws InterruptedException {
        broken.nightly();

        String line = "task=" + QuotaCleanup.class.getName() + "#nightly";
        Instant deadline = Instant.now().plus(PATIENCE);
        while (!log.getAll().contains(line) && Instant.now().isBefore(deadline)) {
            Thread.sleep(50);
        }
        assertThat(log).contains("failure").contains(line).doesNotContain(SECRET);
    }

    private void used(AccountId account, Quota.Use use, LocalDate day) {
        jdbc.sql("insert into subscription.daily_use (account_id, day, use, used) values (:a, :day, :use, 3)")
                .param("a", account.value()).param("day", day).param("use", use.name()).update();
    }

    private List<LocalDate> days(AccountId account, Quota.Use use) {
        return jdbc.sql("select day from subscription.daily_use where account_id = :a and use = :use order by day")
                .param("a", account.value()).param("use", use.name()).query(LocalDate.class).list();
    }

    /** A second cleanup whose database cannot be reached, with a value in the failure's message. */
    @TestConfiguration(proxyBeanMethods = false)
    static class Broken {

        @Bean
        QuotaCleanup brokenCleanup() {
            return new QuotaCleanup(JdbcClient.create(new DriverManagerDataSource("jdbc:keel-none:" + SECRET)), Clock.systemUTC());
        }
    }
}
