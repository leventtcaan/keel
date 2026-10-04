package app.keel.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;
import org.springframework.scheduling.config.TaskExecutionOutcome;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import tools.jackson.databind.json.JsonMapper;

/**
 * A refresh token family goes the night after its last token expires (K-810, GDPR Art. 5(1)(e)): then nobody can use it,
 * and it is data kept for no purpose. Until then every token of it stays, revoked or expired: a copy of an old one coming
 * back is how a stolen token is caught, and the whole family stops working (K-203). The night as the scheduler runs it
 * logs a failure without its message (V3).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, RefreshTokenCleanupTests.Broken.class})
@ExtendWith(OutputCaptureExtension.class)
class RefreshTokenCleanupTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    // Long before any other test's tokens (they expire weeks from now): the cut here reaches only this test's own.
    private static final Instant NIGHT = Instant.parse("2020-06-15T03:00:00Z");
    static final String SECRET = "weigh-in 82.4 kg";
    private static final Duration PATIENCE = Duration.ofSeconds(10);

    @Autowired
    @Qualifier("refreshTokenCleanup")
    RefreshTokenCleanup cleanup;

    @Autowired
    @Qualifier("brokenTokenCleanup")
    RefreshTokenCleanup broken;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    MockMvcTester mvc;

    @Autowired
    RefreshTokens tokens;

    @Autowired
    ScheduledTaskHolder scheduler;

    @Autowired
    Environment environment;

    @Autowired
    ApplicationContext context;

    @Test
    void anExpiredTokenGoesAndAnUnexpiredOneStaysRevokedOrNot() {
        AccountId account = account();
        String live = token(account, NIGHT.plusSeconds(60), null);
        String revoked = token(account, NIGHT.plusSeconds(60), NIGHT.minusSeconds(3600));
        String expired = token(account, NIGHT.minusSeconds(1), null);
        String expiredAndRevoked = token(account, NIGHT.minusSeconds(1), NIGHT.minusSeconds(3600));

        cleanup.cleanUp(NIGHT);

        assertThat(hashes(account)).containsExactlyInAnyOrder(live, revoked).doesNotContain(expired, expiredAndRevoked);
    }

    @Test
    void aRevokedTokenKeptThroughTheNightStillCatchesAStolenCopy() throws Exception {
        AccountId account = account();
        String stolen = tokens.start(account);
        String rotated = tokens.rotate(stolen).refreshToken(); // the phone renewed: the first token is revoked, not expired

        cleanup.cleanUp(Instant.now());

        assertThat(refresh(stolen)).as("the copy").isEqualTo(401);
        assertThat(refresh(rotated)).as("the family stopped working").isEqualTo(401);
    }

    @Test
    void anExpiredTokenOfAFamilyStillInUseStaysToCatchAStolenCopy() throws Exception {
        // Each renewal gives the new token its own 60 days, so a family's old tokens expire while its newest still works. A
        // thief who renewed first holds the live one; the phone coming back with the old copy, weeks later, is the catch.
        AccountId account = account();
        String stolen = tokens.start(account);
        String thiefs = tokens.rotate(stolen).refreshToken();
        jdbc.sql("update identity.refresh_token set expires_at = now() - interval '1 day' where account_id = :account and revoked_at is not null")
                .param("account", account.value()).update();

        cleanup.cleanUp(Instant.now());

        assertThat(refresh(stolen)).as("the old copy").isEqualTo(401);
        assertThat(refresh(thiefs)).as("the family stopped working").isEqualTo(401);
    }

    @Test
    void aFamilyGoesWholeOnceEveryTokenOfItExpired() {
        AccountId account = account();
        UUID done = UUID.randomUUID();
        UUID inUse = UUID.randomUUID();
        String doneOld = token(account, done, NIGHT.minusSeconds(7200), NIGHT.minusSeconds(3600));
        String doneLast = token(account, done, NIGHT.minusSeconds(1), null);
        String inUseOld = token(account, inUse, NIGHT.minusSeconds(7200), NIGHT.minusSeconds(3600));
        String inUseLast = token(account, inUse, NIGHT.plusSeconds(60), null);

        cleanup.cleanUp(NIGHT);

        assertThat(hashes(account)).containsExactlyInAnyOrder(inUseOld, inUseLast).doesNotContain(doneOld, doneLast);
    }

    @Test
    void itRunsOnceADay() {
        String cron = environment.getProperty("keel.session.expired-cleanup");
        ZoneId zone = ZoneId.of(environment.getProperty("keel.session.expired-cleanup-zone"));

        assertThat(nightlyTasks()).isNotEmpty().allSatisfy(task -> assertThat(task.getExpression()).isEqualTo(cron));
        ZonedDateTime run = CronExpression.parse(cron).next(ZonedDateTime.of(2026, 10, 5, 0, 0, 0, 0, zone));
        assertThat(CronExpression.parse(cron).next(run)).isEqualTo(run.plusDays(1));
    }

    @Test
    void theSchedulersNightDeletesAndLogsAFailureWithoutItsMessage(CapturedOutput log) {
        // The failure's message does hold the value, so its absence from the log below means something.
        assertThatThrownBy(() -> broken.cleanUp(NIGHT)).hasStackTraceContaining(SECRET);
        AccountId account = account();
        String expired = token(account, Instant.now().minusSeconds(60), null);
        String live = token(account, Instant.now().plusSeconds(3600), null);
        String revoked = token(account, Instant.now().plusSeconds(3600), Instant.now().minusSeconds(60));

        // As the scheduler runs them — the real night and the broken one: each returns at once (run as a listener is,
        // through BackgroundFailures), so nothing reaches the scheduler's own handler, which would log the message.
        for (CronTask task : nightlyTasks()) {
            assertThatCode(task.getRunnable()::run).doesNotThrowAnyException();
            assertThat(task.getLastExecutionOutcome().status()).isEqualTo(TaskExecutionOutcome.Status.SUCCESS);
        }

        String line = "task=" + RefreshTokenCleanup.class.getName() + "#nightly";
        await(() -> !hashes(account).contains(expired) && log.getAll().contains(line));
        assertThat(hashes(account)).as("the night as the scheduler runs it cuts at now, no later").containsExactlyInAnyOrder(live, revoked);
        assertThat(log).contains("failure").contains(line).doesNotContain(SECRET);
    }

    private List<CronTask> nightlyTasks() {
        return scheduler.getScheduledTasks().stream().map(ScheduledTask::getTask).filter(CronTask.class::isInstance).map(CronTask.class::cast)
                .filter(task -> task.toString().equals(RefreshTokenCleanup.class.getName() + ".nightly")).toList();
    }

    /** An account that exists: its token rows need it. */
    private AccountId account() {
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account);
        return account;
    }

    /** A stored token row, alone in its family, as the cleanup sees it; its hash stands for it. */
    private String token(AccountId account, Instant expiresAt, Instant revokedAt) {
        return token(account, UUID.randomUUID(), expiresAt, revokedAt);
    }

    private String token(AccountId account, UUID family, Instant expiresAt, Instant revokedAt) {
        String hash = UUID.randomUUID().toString();
        jdbc.sql("""
                insert into identity.refresh_token (id, account_id, family_id, token_hash, expires_at, created_at, revoked_at)
                values (gen_random_uuid(), :account, :family, :hash, :expires, :expires, :revoked)""")
                .param("account", account.value()).param("family", family).param("hash", hash).param("expires", expiresAt.atOffset(ZoneOffset.UTC))
                .param("revoked", revokedAt == null ? null : revokedAt.atOffset(ZoneOffset.UTC)).update();
        return hash;
    }

    private List<String> hashes(AccountId account) {
        return jdbc.sql("select token_hash from identity.refresh_token where account_id = :account").param("account", account.value())
                .query(String.class).list();
    }

    private int refresh(String token) throws Exception {
        return mvc.post().uri("/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("refreshToken", token))).exchange().getResponse().getStatus();
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
        RefreshTokenCleanup brokenTokenCleanup() {
            return new RefreshTokenCleanup(JdbcClient.create(new DriverManagerDataSource("jdbc:keel-none:" + SECRET)), Clock.systemUTC());
        }
    }
}
