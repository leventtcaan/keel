package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * The cardio week turns on the user's own calendar, not the server's (K-959, L3 P13): at a moment that is already Monday
 * in the profile's zone but still Sunday in UTC, and the reverse. Sessions are logged on Saturday 10 Oct, Sunday 11 Oct
 * and Monday 12 Oct 2026: the week of the user's today counts one or two of them, the UTC week the other number.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, CardioWeekZoneTests.Clocks.class})
class CardioWeekZoneTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    /** The application's clock, set by each test. */
    static final class SettableClock extends Clock {

        private volatile Instant now = Instant.now();

        void set(Instant moment) {
            now = moment;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return Clock.fixed(now, zone);
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @TestConfiguration
    static class Clocks {

        @Bean
        @Primary
        SettableClock settableClock() {
            return new SettableClock();
        }
    }

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    SettableClock clock;

    @Test
    void alreadyMondayInAucklandWhileStillSundayInUtc() throws Exception {
        // 13:00 UTC Sunday is 02:00 Monday in Auckland (UTC+13 in October): the week is Monday's, one session in it.
        clock.set(Instant.parse("2026-10-11T13:00:00Z"));
        AccountId account = withThreeSessions("Pacific/Auckland");

        assertThat(doneThisWeek(account)).isEqualTo(1);
        // K-1019: the days come from the same week, and today (Monday 12 Oct there) is the one with a record.
        assertThat(cardio(account).get("loggedDays")).isEqualTo(List.of("2026-10-12"));
        assertThat(((Map<?, ?>) cardio(account).get("loggedToday")).get("day")).isEqualTo("2026-10-12");
    }

    @Test
    void stillSundayInLosAngelesWhileAlreadyMondayInUtc() throws Exception {
        // 03:00 UTC Monday is 20:00 Sunday in Los Angeles: the week that ends that Sunday, two sessions in it.
        clock.set(Instant.parse("2026-10-12T03:00:00Z"));
        AccountId account = withThreeSessions("America/Los_Angeles");

        assertThat(doneThisWeek(account)).isEqualTo(2);
        // The user's today there is Sunday 11 Oct: Saturday and Sunday are the week's days, Monday's session is next week's.
        assertThat(cardio(account).get("loggedDays")).isEqualTo(List.of("2026-10-10", "2026-10-11"));
        assertThat(((Map<?, ?>) cardio(account).get("loggedToday")).get("day")).isEqualTo("2026-10-11");
    }

    private AccountId withThreeSessions(String zone) {
        AccountId account = TestSessions.newAccount();
        assertThat(send("PUT", account, "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "activityLevel", "INACTIVE", "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY", "WEDNESDAY", "FRIDAY"), "checkInDay", "MONDAY", "timeZone", zone)))).hasStatusOk();
        assertThat(send("POST", account, "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY", "WEDNESDAY", "FRIDAY")))).hasStatusOk();
        for (String day : List.of("2026-10-10", "2026-10-11", "2026-10-12")) {
            assertThat(send("POST", account, "/v1/cardio-sessions", Map.of("clientId", UUID.randomUUID(), "day", day, "minutes", 30,
                    "source", "MANUAL"))).hasStatus(201);
        }
        return account;
    }

    private int doneThisWeek(AccountId account) throws Exception {
        return (Integer) cardio(account).get("doneThisWeek");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> cardio(AccountId account) throws Exception {
        MvcTestResult program = send("GET", account, "/v1/program", null);
        assertThat(program).hasStatusOk();
        return (Map<String, Object>) JSON.readValue(program.getResponse().getContentAsString(), Map.class).get("cardio");
    }

    private MvcTestResult send(String method, AccountId account, String uri, Object body) {
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "PUT" -> mvc.put();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        }
        return request.exchange();
    }
}
