package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.engine.TrainingStatus;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
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
 * Where training stands, read from the set log since the program was made (K-221): three sessions of a compound lift at
 * the same load and reps are two stalled sessions; no program, no status.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class TrainingStatusApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    ExerciseCatalog catalog;

    @Autowired
    TrainingStatusReader reader;

    @Test
    void threeSessionsAtTheSameLoadAndRepsAreTwoStalled() throws Exception {
        AccountId account = withAProgramMadeDaysAgo(30);
        for (int daysAgo : new int[] {15, 8, 1}) {
            workout(account, daysAgo, "bench_press", 80, 8);
        }

        TrainingStatus status = reader.status(account, LocalDate.now(ZoneOffset.UTC), ZoneOffset.UTC, DayOfWeek.MONDAY).orElseThrow();

        assertThat(status.stalledSessions()).isEqualTo(2);
        assertThat(status.loadsBelowLastWeek()).isFalse();
        assertThat(status.weeksLoadHeld()).isZero();
        assertThat(reader.status(TestSessions.newAccount(), LocalDate.now(ZoneOffset.UTC), ZoneOffset.UTC, DayOfWeek.MONDAY)).as("no program").isEmpty();
    }

    @Test
    void onlyCompoundLiftsAfterTheProgramWasMadeCount() throws Exception {
        // Squat goes up each session; the curl (isolation, not load-tracked) stalls for four; bench's session before the
        // program is not read: nothing stalled.
        AccountId account = withAProgramMadeDaysAgo(10);
        workout(account, 20, "bench_press", 80, 8);
        workout(account, 8, "bench_press", 80, 8);
        workout(account, 1, "bench_press", 80, 9);
        int load = 100;
        for (int daysAgo : new int[] {9, 6, 3, 1}) {
            workout(account, daysAgo, "squat", load, 5);
            workout(account, daysAgo, "barbell_curl", 30, 10);
            load += 5;
        }

        assertThat(reader.status(account, LocalDate.now(ZoneOffset.UTC), ZoneOffset.UTC, DayOfWeek.MONDAY).orElseThrow().stalledSessions()).isZero();
    }

    @Test
    void aStalledLiftMakesTheCheckInHoldTheLoad() throws Exception {
        // End to end (K-110 first rung): plateau_sessions stalled sessions of bench in the set log → the week's call is
        // STOP_LOAD_INCREASE, and the Snapshot kept with it holds where training stood.
        AccountId account = withAProgramMadeDaysAgo(40);
        send("PUT", account, "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        for (int daysAgo : new int[] {29, 22, 15, 8, 1}) {
            workout(account, daysAgo, "bench_press", 80, 8);
        }

        MvcTestResult call = send("POST", account, "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "weekOf",
                LocalDate.now(ZoneOffset.UTC).with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString(), "answers", List.of()));

        assertThat(call).hasStatusOk();
        assertThat((Map<String, Object>) map(call).get("action")).containsEntry("type", "STOP_LOAD_INCREASE");
        String snapshot = jdbc.sql("select snapshot->'training'->>'stalledSessions' from decision.weekly_call where account_id = :a")
                .param("a", account.value()).query(String.class).single();
        assertThat(snapshot).isEqualTo("4");
    }

    @Test
    void aWeekWithOnlyWorkoutsWithoutAWorkingSetIsAWeekThePlanWasMissed() throws Exception {
        // K-431 (ADR-037 #39): the missed-plan weeks the deload ladder reads (K-110, overtraining_missed_plan_weeks) count
        // the sessions done the same way as consistency — a workout opened and left, or only warmed up in, is none.
        AccountId account = withAProgramMadeDaysAgo(40);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate thisWeek = today.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        workoutOn(account, thisWeek.minusWeeks(3), "WORKING");
        workoutOn(account, thisWeek.minusWeeks(2), null);
        workoutOn(account, thisWeek.minusWeeks(1), "WARM_UP");

        assertThat(reader.status(account, today, ZoneOffset.UTC, DayOfWeek.MONDAY).orElseThrow().weeksPlanMissed()).isEqualTo(2);

        workoutOn(account, thisWeek.minusWeeks(1), "FAILURE");

        assertThat(reader.status(account, today, ZoneOffset.UTC, DayOfWeek.MONDAY).orElseThrow().weeksPlanMissed()).isZero();
    }

    @Test
    void withNoWorkoutWithAWorkingSetNothingIsCountedMissed() throws Exception {
        // Not logging is not failing to train (U3, U7): only empty workouts, so no first workout to count from.
        AccountId account = withAProgramMadeDaysAgo(40);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate thisWeek = today.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        workoutOn(account, thisWeek.minusWeeks(3), null);
        workoutOn(account, thisWeek.minusWeeks(2), "WARM_UP");

        assertThat(reader.status(account, today, ZoneOffset.UTC, DayOfWeek.MONDAY).orElseThrow().weeksPlanMissed()).isZero();
    }

    /** A workout at 10:00 UTC on that day, with one bench set of this type — or none. */
    private void workoutOn(AccountId account, LocalDate day, String setType) throws Exception {
        String workout = (String) map(send("POST", account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt",
                day.atTime(10, 0).toInstant(ZoneOffset.UTC).toString()))).get("id");
        if (setType != null) {
            Map<String, Object> set = new java.util.HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press",
                    "setType", setType, "loadKg", 60, "reps", 8, "side", "BOTH"));
            if (!"FAILURE".equals(setType)) {
                set.put("rir", 2);
            }
            assertThat(send("POST", account, "/v1/workouts/" + workout + "/sets", set)).hasStatus(201);
        }
    }

    /** A man on UTC training on Mondays, with his own one-day program of bench, squat and curls made that many days ago. */
    private AccountId withAProgramMadeDaysAgo(int days) {
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        send("PUT", account, "/v1/program", Map.of("days", List.of(Map.of("name", "Full body", "weekday", "MONDAY", "exercises", List.of(
                Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 6, "max", 10)),
                Map.of("exerciseId", "squat", "sets", 3, "reps", Map.of("min", 3, "max", 6)),
                Map.of("exerciseId", "barbell_curl", "sets", 3, "reps", Map.of("min", 10, "max", 15)))))));
        jdbc.sql("with made as (update training.program set created_at = now() - make_interval(days => :days) where account_id = :a returning created_at) "
                + "update training.program_history set effective_from = (select created_at from made) where account_id = :a").param("days", days)
                .param("a", account.value()).update();
        return account;
    }

    /** One workout that many days ago with one working set of the move. */
    private void workout(AccountId account, int daysAgo, String move, double kg, int reps) throws Exception {
        String workout = (String) map(send("POST", account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt",
                Instant.now().minus(daysAgo, ChronoUnit.DAYS).toString()))).get("id");
        assertThat(send("POST", account, "/v1/workouts/" + workout + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", move,
                "setType", "WORKING", "loadKg", kg, "reps", reps, "rir", 1, "side", "BOTH"))).hasStatus(201);
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

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
