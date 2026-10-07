package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * The call that closes the first week over the API (K-962, ADR-077 #4): the check-in day after the account's first day
 * reads the sessions planned and done since, and asks "How did week 1 feel?" only where the answer could add a day. The
 * account began seven days ago and checks in today; it trains six, four and two days ago.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class FirstWeekCallApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    void everySessionDoneAndICouldDoMoreAddsADay() throws Exception {
        AccountId account = firstWeekOver("Y1_3");
        for (int daysAgo : new int[] {6, 4, 2}) {
            session(account, today().minusDays(daysAgo));
        }

        assertThat(kinds(account)).containsExactly("WEEK1_FEEL");
        Map<String, Object> call = map(answer(account, List.of(Map.of("kind", "WEEK1_FEEL", "choice", "COULD_DO_MORE"))));

        assertThat(call.get("action")).isEqualTo(Map.of("type", "ADD_TRAINING_DAY", "toDays", 4));
        assertThat(call.get("copyKey")).isEqualTo("decision.add_training_day.first_week_add_day");
        assertThat(call.get("application")).isEqualTo(Map.of("state", "NOT_NEEDED"));
    }

    @Test
    void mostOfTheWeekMissedMovesTheMissedDaysAndAsksNothing() throws Exception {
        AccountId account = firstWeekOver("Y1_3");
        session(account, today().minusDays(6));

        assertThat(kinds(account)).doesNotContain("WEEK1_FEEL");
        Map<String, Object> call = map(answer(account, List.of()));

        assertThat(call.get("action")).isEqualTo(Map.of("type", "MOVE_MISSED_SESSIONS", "missed",
                List.of(today().minusDays(4).getDayOfWeek().name(), today().minusDays(2).getDayOfWeek().name())));
    }

    @Test
    void someoneStartingOutIsNotAskedAndKeepsThePlan() throws Exception {
        AccountId account = firstWeekOver("NEW");
        for (int daysAgo : new int[] {6, 4, 2}) {
            session(account, today().minusDays(daysAgo));
        }

        assertThat(kinds(account)).doesNotContain("WEEK1_FEEL");
        Map<String, Object> call = map(answer(account, List.of()));

        assertThat(call.get("action")).isEqualTo(Map.of("type", "CONTINUE"));
        assertThat(call.get("copyKey")).isEqualTo("decision.continue.first_week_on_track");
    }

    @Test
    void anyOtherWeekIsNotTheFirstWeeksCall() throws Exception {
        AccountId account = firstWeekOver("Y1_3");
        began(account, today().minusDays(14));

        assertThat(map(answer(account, List.of())).get("action")).isEqualTo(Map.of("type", "NO_DECISION_YET"));
    }

    /** A man on UTC checking in on today's weekday, training six, four and two days ago, the account begun seven days ago. */
    private AccountId firstWeekOver(String experience) {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        Map<String, Object> profile = new HashMap<>(Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC", "experience", experience,
                "schedule", Map.of("trainingDays", List.of(weekday(6), weekday(4), weekday(2)), "checkInDay", weekday(0), "timeZone", "UTC")));
        assertThat(send(account, "PUT", "/v1/profile", profile)).hasStatusOk();
        began(account, today().minusDays(7));
        return account;
    }

    private static String weekday(int daysAgo) {
        return today().minusDays(daysAgo).getDayOfWeek().name();
    }

    private void began(AccountId account, LocalDate day) {
        jdbc.sql("update identity.account set created_at = :at where id = :id").param("at", day.atTime(12, 0).atOffset(ZoneOffset.UTC))
                .param("id", account.value()).update();
    }

    /** A session that day: a workout with a working set (K-431), at noon. */
    private void session(AccountId account, LocalDate day) throws Exception {
        Instant noon = day.atTime(12, 0).toInstant(ZoneOffset.UTC);
        MvcTestResult workout = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", noon.toString()));
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
        return send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "weekOf", today().toString(),
                "answers", answers));
    }

    private static LocalDate today() {
        return LocalDate.now(ZoneOffset.UTC);
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
