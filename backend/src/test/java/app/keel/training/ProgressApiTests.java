package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
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
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * The end-of-workout and progress summaries over the API (K-965): two sessions of one program day a week apart — bench
 * 3 × 6-10, squat 3 × 6-10, curl 3 × 8-12 — the second with a bench record, a squat tie that was easier, and the curl's
 * first sets. A heavy warm-up in the first is never a set to beat.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class ProgressApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    Clock clock;

    @Test
    @SuppressWarnings("unchecked")
    void theWorkoutsSummaryHasItsRecordsBaselinesWeightLiftedAndMuscles() throws Exception {
        AccountId account = withAProgram();
        Instant now = clock.instant();
        String first = start(account, now.minus(Duration.ofDays(9)));
        sets(account, first, "bench_press", 1, 100, 20, 2, "WARM_UP");
        sets(account, first, "bench_press", 3, 60, 8, 1, "WORKING");
        sets(account, first, "squat", 3, 100, 8, 1, "WORKING");
        String second = start(account, now.minus(Duration.ofDays(2)));
        sets(account, second, "bench_press", 2, 60, 9, 1, "WORKING");
        sets(account, second, "bench_press", 1, 62.5, 6, 1, "WORKING");
        sets(account, second, "squat", 3, 100, 8, 2, "WORKING");
        sets(account, second, "barbell_curl", 2, 30, 10, 1, "WORKING");

        Map<String, Object> summary = map(send("GET", account, "/v1/workouts/" + second + "/summary"));

        // 2 × 540 + 375 + 3 × 800 + 2 × 300 = 4455 kg against 3 × 480 + 3 × 800 = 3840: +16%.
        assertThat(((Number) summary.get("liftedKg")).doubleValue()).isEqualTo(4455.0);
        assertThat(summary.get("liftedChangePercent")).isEqualTo(16);
        assertThat(summary.get("workingSets")).isEqualTo(8);
        // 60 × 9 beats every earlier bench set (the 100 × 20 warm-up is none); the second 60 × 9 ties it; the squat ties.
        assertThat((List<Map<String, Object>>) summary.get("marks")).containsExactly(
                Map.of("exerciseId", "bench_press", "kind", "RECORD", "loadKg", 60, "reps", 9, "rir", 1),
                Map.of("exerciseId", "barbell_curl", "kind", "BASELINE", "loadKg", 30, "reps", 10, "rir", 1));
        List<Map<String, Object>> muscles = (List<Map<String, Object>>) summary.get("muscles");
        assertThat(muscles).extracting(muscle -> muscle.get("muscle")).containsExactly("biceps", "chest", "quads");
        assertThat(muscles.getFirst()).containsEntry("plannedSets", 3).containsEntry("doneSets", 2).containsEntry("targetSets", 6);
        assertThat(((Number) muscles.get(1).get("doneShare")).doubleValue()).isEqualTo(0.3);

        Map<String, Object> firstSummary = map(send("GET", account, "/v1/workouts/" + first + "/summary"));
        assertThat(firstSummary).doesNotContainKey("liftedChangePercent");
        assertThat((List<Map<String, Object>>) firstSummary.get("marks")).extracting(mark -> mark.get("kind")).containsExactly("BASELINE", "BASELINE");

        assertThat(send("GET", TestSessions.newAccount(), "/v1/workouts/" + second + "/summary")).hasStatus(404);
    }

    @Test
    @SuppressWarnings("unchecked")
    void progressHasEachProgramMoveWithItsBaselineBestEffortAndTheLiftsStronger() throws Exception {
        AccountId account = withAProgram();
        Instant now = clock.instant();
        String first = start(account, now.minus(Duration.ofDays(9)));
        sets(account, first, "bench_press", 3, 60, 8, 1, "WORKING");
        sets(account, first, "squat", 3, 100, 8, 1, "WORKING");
        String second = start(account, now.minus(Duration.ofDays(2)));
        sets(account, second, "bench_press", 3, 60, 9, 1, "WORKING");
        sets(account, second, "squat", 3, 100, 8, 2, "WORKING");

        Map<String, Object> progress = map(send("GET", account, "/v1/training-progress"));

        assertThat(progress).containsEntry("strongerLifts", 1).containsEntry("trackedLifts", 2);
        List<Map<String, Object>> lifts = (List<Map<String, Object>>) progress.get("lifts");
        assertThat(lifts).extracting(lift -> lift.get("exerciseId")).containsExactly("bench_press", "squat");
        assertThat(lifts.getFirst()).containsEntry("stronger", true);
        assertThat((Map<String, Object>) lifts.getFirst().get("best")).containsEntry("reps", 9);
        assertThat((Map<String, Object>) lifts.getFirst().get("baseline")).containsEntry("reps", 8);
        assertThat((List<Object>) lifts.getFirst().get("weeks")).hasSize(2);
        // The squat: the same 100 × 8, now with 2 left.
        assertThat(lifts.get(1)).containsEntry("stronger", false);
        assertThat((Map<String, Object>) lifts.get(1).get("effort")).containsEntry("kind", "EASIER").containsEntry("repsLeft", 2)
                .containsEntry("repsLeftBefore", 1).containsEntry("reps", 8);
        // Planned from the program whatever the day; the curl is planned though not yet done.
        assertThat((List<Map<String, Object>>) progress.get("muscles")).filteredOn(muscle -> "biceps".equals(muscle.get("muscle")))
                .singleElement().satisfies(biceps -> assertThat(biceps).containsEntry("plannedSets", 3));
    }

    @Test
    void withoutAProgramThereAreNoLifts() throws Exception {
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", profile());

        assertThat(map(send("GET", account, "/v1/training-progress"))).containsEntry("lifts", List.of()).containsEntry("trackedLifts", 0);
    }

    private AccountId withAProgram() {
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", profile());
        assertThat(send("PUT", account, "/v1/program", Map.of("days", List.of(Map.of("name", "Full body", "weekday", "MONDAY", "exercises",
                List.of(own("bench_press", 6, 10), own("squat", 6, 10), own("barbell_curl", 8, 12))))))).hasStatusOk();
        return account;
    }

    private static Map<String, Object> profile() {
        return Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996, "programChoice", "BUILD_ONE_FOR_ME",
                "units", "METRIC", "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC"));
    }

    private static Map<String, Object> own(String exercise, int min, int max) {
        return Map.of("exerciseId", exercise, "sets", 3, "reps", Map.of("min", min, "max", max));
    }

    @SuppressWarnings("unchecked")
    private String start(AccountId account, Instant at) throws Exception {
        Map<String, Object> day = ((List<Map<String, Object>>) map(send("GET", account, "/v1/program")).get("days")).getFirst();
        MvcTestResult started = send("POST", account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", at.toString(),
                "programDayId", day.get("id")));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    private void sets(AccountId account, String workout, String exercise, int count, double kg, int reps, int rir, String type) {
        for (int i = 0; i < count; i++) {
            Map<String, Object> body = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", exercise, "setType", type, "loadKg", kg,
                    "reps", reps, "rir", rir, "side", "BOTH"));
            assertThat(send("POST", account, "/v1/workouts/" + workout + "/sets", body)).hasStatus(201);
        }
    }

    private MvcTestResult send(String method, AccountId account, String uri) {
        return send(method, account, uri, null);
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
