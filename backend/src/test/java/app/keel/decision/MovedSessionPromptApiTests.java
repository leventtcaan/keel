package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
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
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * The missed-session question (K-512, T-4) reads a session moved in its week on the day it was moved to (K-964), over the
 * API, on a fixed clock: Tuesday 6 October 2026, noon UTC. Kept apart from PromptsApiTests, whose real clock may fall on a
 * Monday, where no session of the day before can be moved into today's week.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, MovedSessionPromptApiTests.FixedClock.class})
class MovedSessionPromptApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final LocalDate TUESDAY = LocalDate.of(2026, 10, 6);
    private static final LocalDate MONDAY = TUESDAY.minusDays(1);
    private static final Instant NOW = TUESDAY.atTime(12, 0).toInstant(ZoneOffset.UTC);

    /** The server's clock, fixed: today is a Tuesday whenever the tests run. */
    @TestConfiguration
    static class FixedClock {
        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    @SuppressWarnings("unchecked")
    void mondaysSessionMovedToTuesdayIsNotMissedOnMonday() throws Exception {
        // A program on Monday and Thursday, made long ago; the last session Monday 28 September. By Tuesday, Thursday 1 and
        // Monday 5 have passed: two planned days, asked about. Monday's session moved to Tuesday: only Thursday has.
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        assertThat(send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY", "THURSDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")))).hasStatusOk();
        Map<String, Object> program = read(send(account, "PUT", "/v1/program", Map.of("days", List.of(day("MONDAY"), day("THURSDAY")))));
        jdbc.sql("with made as (update training.program set created_at = :long where account_id = :a returning created_at) "
                + "update training.program_history set effective_from = (select created_at from made) where account_id = :a")
                .param("long", NOW.minusSeconds(60L * 24 * 3600).atOffset(ZoneOffset.UTC)).param("a", account.value()).update();
        jdbc.sql("update profile.profile set training_days_since = :long where account_id = :a")
                .param("long", NOW.minusSeconds(60L * 24 * 3600).atOffset(ZoneOffset.UTC)).param("a", account.value()).update();
        session(account, MONDAY.minusWeeks(1));
        assertThat(rules(account)).as("on the weekdays alone").contains("sessions_missed");

        Object monday = ((List<Map<String, Object>>) program.get("days")).getFirst().get("id");
        jdbc.sql("""
                insert into training.session_change (account_id, program_day_id, week_of, on_date, skipped, short_version, swaps)
                values (:a, :day, :monday, :on, false, false, '{}'::jsonb)""").param("a", account.value())
                .param("day", UUID.fromString((String) monday)).param("monday", MONDAY).param("on", TUESDAY).update();

        assertThat(rules(account)).doesNotContain("sessions_missed");
    }

    private static Map<String, Object> day(String weekday) {
        return Map.of("name", "Full body " + weekday, "weekday", weekday, "exercises",
                List.of(Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 6, "max", 10))));
    }

    /** A session at noon that day: a workout with a working set (K-431). */
    private void session(AccountId account, LocalDate day) throws Exception {
        MvcTestResult workout = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt",
                day.atTime(12, 0).toInstant(ZoneOffset.UTC).toString()));
        assertThat(workout.getResponse().getStatus()).isLessThan(300);
        Object id = JSON.readValue(workout.getResponse().getContentAsString(), Map.class).get("id");
        assertThat(send(account, "POST", "/v1/workouts/" + id + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press",
                "setType", "WORKING", "loadKg", 60, "reps", 8, "rir", 2)).getResponse().getStatus()).isLessThan(300);
    }

    @SuppressWarnings("unchecked")
    private List<Object> rules(AccountId account) throws Exception {
        MvcTestResult result = send(account, "GET", "/v1/prompts", null);
        assertThat(result).hasStatusOk();
        return ((List<Map<String, Object>>) JSON.readValue(result.getResponse().getContentAsString(), List.class)).stream()
                .map(prompt -> prompt.get("rule")).toList();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
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
