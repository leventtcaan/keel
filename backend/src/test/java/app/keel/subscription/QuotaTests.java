package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.consent.ConsentTextVersions;
import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import tools.jackson.databind.json.JsonMapper;
import java.util.Map;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * The daily quota (K-508, ADR-004, ADR-012): a count per account, use and day — the user's own day — up to the limit in
 * data/parameters/quota.yaml; past it the answer is no, and the coach answers in the engine's words instead (no hard
 * stop, nothing bought).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class QuotaTests {

    private static final ZoneId KIRITIMATI = ZoneId.of("Pacific/Kiritimati"); // UTC+14
    private static final ZoneId PAGO_PAGO = ZoneId.of("Pacific/Pago_Pago"); // UTC-11: never the same date as Kiritimati

    @Autowired
    Quota quota;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    private final int messages = QuotaLimits.fromClasspath().perDay(Quota.Use.COACH_MESSAGE);

    @Test
    void theLimitIsTakenToTheLastAndNoMore() {
        AccountId account = TestSessions.newAccount();

        assertThat(IntStream.range(0, messages).mapToObj(n -> quota.take(account, Quota.Use.COACH_MESSAGE).isPresent())).containsOnly(true);
        assertThat(quota.take(account, Quota.Use.COACH_MESSAGE)).isEmpty();
        assertThat(quota.take(account, Quota.Use.COACH_MESSAGE)).as("still no").isEmpty();
        // Another use has its own count; another account its own.
        assertThat(quota.take(account, Quota.Use.PHOTO_ANALYSIS)).isPresent();
        assertThat(quota.take(TestSessions.newAccount(), Quota.Use.COACH_MESSAGE)).isPresent();
        // A no counts nothing: the day stays at the limit.
        assertThat(used(account, LocalDate.now(ZoneOffset.UTC))).isEqualTo(messages);
    }

    @Test
    void aNewDayIsANewCountOnTheUsersCalendar() {
        // The day is the user's: a user in UTC+14 and one in UTC-11 are never on the same date.
        for (ZoneId zone : List.of(KIRITIMATI, PAGO_PAGO)) {
            AccountId account = TestSessions.newAccount();
            withTimeZone(account, zone);
            LocalDate today = LocalDate.now(zone);
            used(account, today.minusDays(1), messages);

            assertThat(quota.take(account, Quota.Use.COACH_MESSAGE)).as(zone + ": yesterday's count is yesterday's").contains(today);
            assertThat(jdbc.sql("select day from subscription.daily_use where account_id = :a and day <> :yesterday")
                    .param("a", account.value()).param("yesterday", today.minusDays(1)).query(LocalDate.class).single()).as(zone.toString()).isEqualTo(today);
        }
    }

    @Test
    void withoutAProfileTheDayIsUtcs() {
        AccountId account = TestSessions.newAccount();
        used(account, LocalDate.now(ZoneOffset.UTC), messages);

        assertThat(quota.take(account, Quota.Use.COACH_MESSAGE)).isEmpty();
    }

    @Test
    void requestsAtTheSameMomentNeverTakeMoreThanTheLimit() throws Exception {
        AccountId account = TestSessions.newAccount();
        Callable<Boolean> take = () -> quota.take(account, Quota.Use.COACH_MESSAGE).isPresent();
        try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
            List<Boolean> taken = pool.invokeAll(IntStream.range(0, messages + 10).mapToObj(n -> take).toList()).stream().map(future -> {
                try {
                    return future.get();
                } catch (Exception e) {
                    throw new IllegalStateException(e);
                }
            }).toList();

            assertThat(taken.stream().filter(Boolean::booleanValue)).hasSize(messages);
            assertThat(used(account, LocalDate.now(ZoneOffset.UTC))).isEqualTo(messages);
        }
    }

    /** A profile on that time zone (behind the health data consent, as every profile). */
    private void withTimeZone(AccountId account, ZoneId zone) {
        JsonMapper json = JsonMapper.builder().build();
        assertThat(mvc.put().uri("/v1/consents/HEALTH_DATA").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("textVersion", ConsentTextVersions.HEALTH_DATA)))
                .exchange()).hasStatusOk();
        assertThat(mvc.put().uri("/v1/profile").header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                        "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                        "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", zone.getId()))))
                .exchange()).hasStatusOk();
    }

    private int used(AccountId account, LocalDate day) {
        return jdbc.sql("select coalesce(sum(used), 0) from subscription.daily_use where account_id = :a and day = :day").param("a", account.value())
                .param("day", day).query(Integer.class).single();
    }

    private void used(AccountId account, LocalDate day, int count) {
        jdbc.sql("insert into subscription.daily_use (account_id, day, use, used) values (:a, :day, 'COACH_MESSAGE', :n)")
                .param("a", account.value()).param("day", day).param("n", count).update();
    }
}
