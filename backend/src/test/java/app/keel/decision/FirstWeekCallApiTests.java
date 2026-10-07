package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashMap;
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
 * The call that closes the first week over the API (K-962, ADR-077 #4), on a fixed clock: Monday 28 September 2026, 9:00
 * in New York. The account began the Monday before at noon; it trains Tuesday, Thursday and Saturday and checks in on
 * Mondays, so the first week plans Tuesday to Saturday (the signup day is not planned) and today's check-in closes it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, FirstWeekCallApiTests.FixedClock.class})
class FirstWeekCallApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final ZoneId NEW_YORK = ZoneId.of("America/New_York");
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 28);
    private static final Instant NOW = TODAY.atTime(9, 0).atZone(NEW_YORK).toInstant();
    private static final LocalDate TUESDAY = TODAY.minusDays(6);
    private static final LocalDate THURSDAY = TODAY.minusDays(4);
    private static final LocalDate SATURDAY = TODAY.minusDays(2);

    /** The server's clock, fixed: the week does not depend on the day or the hour the tests run. */
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
    void everySessionDoneAndICouldDoMoreAddsADay() throws Exception {
        AccountId account = firstWeekOver("Y1_3");
        session(account, TUESDAY, 12, 0);
        session(account, THURSDAY, 12, 0);
        session(account, SATURDAY, 12, 0);

        assertThat(kinds(account)).containsExactly("WEEK1_FEEL");
        Map<String, Object> call = map(answer(account, List.of(Map.of("kind", "WEEK1_FEEL", "choice", "COULD_DO_MORE"))));

        assertThat(call.get("action")).isEqualTo(Map.of("type", "ADD_TRAINING_DAY", "toDays", 4, "idealDays", 4));
        assertThat(call.get("copyKey")).isEqualTo("decision.add_training_day.first_week_add_day");
        // Nothing is applied: the day is the user's to pick (ADR-077 Ek 1).
        assertThat(call).containsEntry("application", Map.of("state", "NOT_NEEDED")).containsEntry("declinable", false);
    }

    @Test
    void aSessionAtHalfPastElevenAtNightCountsOnItsOwnDay() throws Exception {
        // 23:30 on Thursday in New York is Friday in UTC: counted on Friday, Thursday would have been missed.
        AccountId account = firstWeekOver("Y1_3");
        session(account, TUESDAY, 12, 0);
        session(account, THURSDAY, 23, 30);
        session(account, SATURDAY, 12, 0);

        Map<String, Object> call = map(answer(account, List.of(Map.of("kind", "WEEK1_FEEL", "choice", "ABOUT_RIGHT"))));

        assertThat(call.get("action")).isEqualTo(Map.of("type", "CONTINUE"));
        assertThat(call.get("copyKey")).isEqualTo("decision.continue.first_week_on_track");
    }

    @Test
    void tooMuchKeepsThePlanAndIsSaidBack() throws Exception {
        AccountId account = firstWeekOver("Y1_3");
        session(account, TUESDAY, 12, 0);
        session(account, THURSDAY, 12, 0);
        session(account, SATURDAY, 12, 0);

        Map<String, Object> call = map(answer(account, List.of(Map.of("kind", "WEEK1_FEEL", "choice", "TOO_MUCH"))));

        assertThat(call.get("action")).isEqualTo(Map.of("type", "CONTINUE"));
        assertThat(call.get("copyKey")).isEqualTo("decision.continue.first_week_too_much");
    }

    @Test
    void mostOfTheWeekMissedMovesTheMissedDaysAndAsksNothing() throws Exception {
        AccountId account = firstWeekOver("Y1_3");
        session(account, TUESDAY, 12, 0);

        assertThat(kinds(account)).doesNotContain("WEEK1_FEEL");
        Map<String, Object> call = map(answer(account, List.of()));

        assertThat(call.get("action")).isEqualTo(Map.of("type", "MOVE_MISSED_SESSIONS", "missed", List.of("THURSDAY", "SATURDAY")));
        assertThat(call).containsEntry("declinable", false);
    }

    @Test
    void aSessionLoggedAfterTheWeekDatedInItCounts() throws Exception {
        // K-424 (#452): a session counts in the week it started, whenever it was logged; each one here is entered today.
        AccountId twoOfThree = firstWeekOver("Y1_3");
        session(twoOfThree, TUESDAY, 12, 0);
        session(twoOfThree, THURSDAY, 12, 0);
        assertThat(map(answer(twoOfThree, List.of())).get("action")).isEqualTo(Map.of("type", "MOVE_MISSED_SESSIONS", "missed", List.of("SATURDAY")));

        AccountId all = firstWeekOver("Y1_3");
        session(all, TUESDAY, 12, 0);
        session(all, THURSDAY, 12, 0);
        session(all, SATURDAY, 18, 0);
        assertThat(map(answer(all, List.of())).get("action")).isEqualTo(Map.of("type", "CONTINUE"));
    }

    @Test
    void someoneStartingOutIsNotAskedAndKeepsThePlan() throws Exception {
        AccountId account = firstWeekOver("NEW");
        session(account, TUESDAY, 12, 0);
        session(account, THURSDAY, 12, 0);
        session(account, SATURDAY, 12, 0);

        assertThat(kinds(account)).doesNotContain("WEEK1_FEEL");
        Map<String, Object> call = map(answer(account, List.of()));

        assertThat(call.get("action")).isEqualTo(Map.of("type", "CONTINUE"));
        assertThat(call.get("copyKey")).isEqualTo("decision.continue.first_week_on_track");
    }

    @Test
    void inAnotherWeekTheFeelAnswerIsIgnoredAndNotKept() throws Exception {
        AccountId account = firstWeekOver("Y1_3");
        began(account, TODAY.minusDays(14));

        Map<String, Object> call = map(answer(account, List.of(Map.of("kind", "WEEK1_FEEL", "choice", "COULD_DO_MORE"))));

        assertThat(call.get("action")).isEqualTo(Map.of("type", "NO_DECISION_YET"));
        assertThat(jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single()).doesNotContain("week1Feel").doesNotContain("firstWeek");
    }

    /** A man in New York, Tuesday, Thursday and Saturday, checking in on Mondays; the account begun last Monday at noon. */
    private AccountId firstWeekOver(String experience) {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        Map<String, Object> profile = new HashMap<>(Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC", "experience", experience,
                "schedule", Map.of("trainingDays", List.of("TUESDAY", "THURSDAY", "SATURDAY"), "checkInDay", "MONDAY", "timeZone", NEW_YORK.getId())));
        assertThat(send(account, "PUT", "/v1/profile", profile)).hasStatusOk();
        began(account, TODAY.minusDays(7));
        return account;
    }

    private void began(AccountId account, LocalDate day) {
        jdbc.sql("update identity.account set created_at = :at where id = :id").param("at", day.atTime(12, 0).atZone(NEW_YORK).toOffsetDateTime())
                .param("id", account.value()).update();
    }

    /** A session that day at that time in New York: a workout with a working set (K-431), logged now. */
    private void session(AccountId account, LocalDate day, int hour, int minute) throws Exception {
        Instant started = day.atTime(hour, minute).atZone(NEW_YORK).toInstant();
        MvcTestResult workout = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", started.toString()));
        assertThat(workout.getResponse().getStatus()).isLessThan(300);
        Object id = JSON.readValue(workout.getResponse().getContentAsString(), Map.class).get("id");
        assertThat(send(account, "POST", "/v1/workouts/" + id + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press",
                "setType", "WORKING", "loadKg", 60, "reps", 8, "rir", 2)).getResponse().getStatus()).isLessThan(300);
    }

    @SuppressWarnings("unchecked")
    private List<String> kinds(AccountId account) throws Exception {
        return ((List<Map<String, Object>>) map(send(account, "GET", "/v1/check-ins/current", null)).get("questions")).stream()
                .map(question -> (String) question.get("kind")).toList();
    }

    private MvcTestResult answer(AccountId account, List<Map<String, Object>> answers) {
        return send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "weekOf", TODAY.toString(),
                "answers", answers));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(MvcTestResult result) throws Exception {
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
