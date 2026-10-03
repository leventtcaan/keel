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
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.BooleanSupplier;
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
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;
import org.springframework.scheduling.config.TaskExecutionOutcome;
import org.springframework.scheduling.support.CronExpression;

/**
 * Yesterday's counts are deleted each night (K-532, ADR-043 #77): only today's is ever read, so an older one is data kept
 * for no purpose. The cut is QuotaCleanup.oldestKept (QuotaCleanupDayTests); here the night's delete, what it leaves to
 * the export, its schedule, and the night as the scheduler runs it — a failure logged through BackgroundFailures
 * without the failure's message (V3).
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
    private static final ZoneId KIRITIMATI = ZoneId.of("Pacific/Kiritimati"); // UTC+14, the furthest ahead
    private static final ZoneId BAKER_ISLAND = ZoneId.of("Etc/GMT+12"); // UTC-12, the furthest behind

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
    void itRunsOnceADayWhenTheCutIsTightest() {
        String cron = environment.getProperty("keel.subscription.quota-cleanup");
        ZoneId zone = ZoneId.of(environment.getProperty("keel.subscription.quota-cleanup-zone"));

        assertThat(nightlyTasks()).isNotEmpty().allSatisfy(task -> assertThat(task.getExpression()).isEqualTo(cron));
        ZonedDateTime run = CronExpression.parse(cron).next(ZonedDateTime.of(2026, 10, 3, 0, 0, 0, 0, zone));
        assertThat(CronExpression.parse(cron).next(run)).isEqualTo(run.plusDays(1));
        // At the hour it runs, the day before yesterday goes from -12:00 (the real zone furthest behind) to +05:30 — a
        // run before 18:00 UTC would keep it a day longer for most users (Europe, Africa, India).
        for (ZoneId user : List.of(BAKER_ISLAND, ZoneOffset.UTC, ZoneId.of("Asia/Kolkata"))) {
            assertThat(LocalDate.ofInstant(run.toInstant(), user).minusDays(2)).as(user.getId()).isBefore(QuotaCleanup.oldestKept(run.toInstant()));
        }
    }

    @Test
    void theSchedulersNightKeepsEveryZonesTodayAndYesterdayAndLogsAFailureWithoutItsMessage(CapturedOutput log) {
        // The failure's message does hold the value, so its absence from the log below means something.
        assertThatThrownBy(() -> broken.cleanUp(NIGHT)).hasStackTraceContaining(SECRET);
        AccountId kept = TestSessions.newAccount();
        for (ZoneId zone : List.of(KIRITIMATI, BAKER_ISLAND)) {
            used(kept, Quota.Use.COACH_MESSAGE, LocalDate.now(zone));
            used(kept, Quota.Use.PHOTO_ANALYSIS, LocalDate.now(zone).minusDays(1));
        }
        List<LocalDate> before = days(kept);
        AccountId old = TestSessions.newAccount();
        used(old, Quota.Use.COACH_MESSAGE, LocalDate.now(ZoneOffset.UTC).minusDays(4));

        // As the scheduler runs them — the real night and the broken one: each returns at once (run as a listener is,
        // through BackgroundFailures), so nothing reaches the scheduler's own handler, which would log the message.
        for (CronTask task : nightlyTasks()) {
            assertThatCode(task.getRunnable()::run).doesNotThrowAnyException();
            assertThat(task.getLastExecutionOutcome().status()).isEqualTo(TaskExecutionOutcome.Status.SUCCESS);
        }

        String line = "task=" + QuotaCleanup.class.getName() + "#nightly";
        await(() -> days(old).isEmpty() && log.getAll().contains(line));
        assertThat(days(old)).as("the day four days back is gone").isEmpty();
        assertThat(days(kept)).as("today and yesterday at +14:00 and -12:00").isEqualTo(before);
        assertThat(log).contains("failure").contains(line).doesNotContain(SECRET);
    }

    private List<CronTask> nightlyTasks() {
        return scheduler.getScheduledTasks().stream().map(ScheduledTask::getTask).filter(CronTask.class::isInstance).map(CronTask.class::cast)
                .filter(task -> task.toString().equals(QuotaCleanup.class.getName() + ".nightly")).toList();
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

    private void used(AccountId account, Quota.Use use, LocalDate day) {
        jdbc.sql("insert into subscription.daily_use (account_id, day, use, used) values (:a, :day, :use, 3)")
                .param("a", account.value()).param("day", day).param("use", use.name()).update();
    }

    private List<LocalDate> days(AccountId account, Quota.Use use) {
        return jdbc.sql("select day from subscription.daily_use where account_id = :a and use = :use order by day")
                .param("a", account.value()).param("use", use.name()).query(LocalDate.class).list();
    }

    private List<LocalDate> days(AccountId account) {
        return jdbc.sql("select day from subscription.daily_use where account_id = :a order by day, use").param("a", account.value())
                .query(LocalDate.class).list();
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
