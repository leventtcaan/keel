package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
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
 * Sessions and sets (K-210, contract /v1/exercises and /v1/workouts): a workout is started, its sets are logged one
 * tap each — load, reps, reps in reserve — and it is finished. Any move in the catalog can be logged, whatever the plan
 * said (pull-ups on a lat-pulldown day). Records the phone made are stored once (clientId, 201 then 200).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class WorkoutLogTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Test
    void theCatalogIsServed() throws Exception {
        List<Map<String, Object>> exercises = list(get(TestSessions.newAccount(), "/v1/exercises"));

        assertThat(exercises).anySatisfy(move -> assertThat(move).containsEntry("id", "lat_pulldown").containsEntry("kind", "COMPOUND")
                .containsEntry("nameKey", "exercises.lat_pulldown.name").containsEntry("alternatives", List.of("pull_up", "close_grip_lat_pulldown"))
                .containsEntry("load", "EXTERNAL").containsEntry("unilateral", false));
    }

    @Test
    void aMovesSetupIsServedAndItsClipsOnlyOnceReviewed() throws Exception {
        // ADR-017: a clip reaches the phone only after it passed the filming checklist; until then the phone shows none.
        List<Map<String, Object>> exercises = list(get(TestSessions.newAccount(), "/v1/exercises"));

        assertThat(exercises).anySatisfy(move -> assertThat(move).containsEntry("id", "leg_press")
                .containsEntry("setupFields", List.of("back_pad", "foot_position")).doesNotContainKey("clips"));
    }

    @Test
    void aWorkoutIsStartedItsSetsLoggedAndItIsFinished() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account, "2026-09-30T15:40:00Z");

        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("bench_press", "WARM_UP", 40, 10, null))).hasStatus(201);
        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("bench_press", "WORKING", 80, 8, 1))).hasStatus(201);
        assertThat(post(account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T16:32:00Z"))).hasStatusOk();

        Map<String, Object> read = map(get(account, "/v1/workouts/" + workout));
        assertThat(read).containsEntry("startedAt", "2026-09-30T15:40:00Z").containsEntry("endedAt", "2026-09-30T16:32:00Z");
        assertThat((List<Map<String, Object>>) read.get("sets")).extracting(s -> s.get("setType"), s -> s.get("reps"))
                .containsExactly(org.assertj.core.groups.Tuple.tuple("WARM_UP", 10), org.assertj.core.groups.Tuple.tuple("WORKING", 8));
    }

    @Test
    void anyMoveInTheCatalogCanBeLoggedAsASwap() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account, "2026-09-30T15:40:00Z");

        // Pull-ups on a lat-pulldown day: bodyweight plus 10 kg added.
        MvcTestResult swapped = post(account, "/v1/workouts/" + workout + "/sets", set("pull_up", "WORKING", 10, 6, 1));

        assertThat(swapped).hasStatus(201);
        assertThat(map(swapped)).containsEntry("exerciseId", "pull_up");
        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("underwater_basket", "WORKING", 1, 1, 1))).hasStatus(400);
    }

    @Test
    void aSetOrWorkoutSentTwiceIsStoredOnce() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> newWorkout = Map.of("clientId", UUID.randomUUID(), "startedAt", "2026-09-30T15:40:00Z");
        MvcTestResult first = post(account, "/v1/workouts", newWorkout);
        assertThat(post(account, "/v1/workouts", newWorkout)).hasStatus(200);
        String workout = (String) map(first).get("id");
        Map<String, Object> set = set("bench_press", "WORKING", 80, 8, 1);

        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set)).hasStatus(201);
        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set)).hasStatus(200);
        assertThat((List<?>) map(get(account, "/v1/workouts/" + workout)).get("sets")).hasSize(1);
    }

    @Test
    void wholeLoadsAreWrittenAsPlainNumbers() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account, "2026-09-30T15:40:00Z");

        MvcTestResult logged = post(account, "/v1/workouts/" + workout + "/sets", set("bench_press", "WORKING", 100, 5, 1));

        assertThat(logged.getResponse().getContentAsString()).contains("\"loadKg\":100").doesNotContain("E+");
    }

    @Test
    void anotherAccountsWorkoutIsNotFound() throws Exception {
        String workout = start(TestSessions.newAccount(), "2026-09-30T15:40:00Z");
        AccountId stranger = TestSessions.newAccount();

        assertThat(get(stranger, "/v1/workouts/" + workout)).hasStatus(404);
        assertThat(post(stranger, "/v1/workouts/" + workout + "/sets", set("bench_press", "WORKING", 80, 8, 1))).hasStatus(404);
    }

    @Test
    void aSetCanBeDeleted() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account, "2026-09-30T15:40:00Z");
        String set = (String) map(post(account, "/v1/workouts/" + workout + "/sets", set("bench_press", "WORKING", 80, 8, 1))).get("id");

        assertThat(mvc.delete().uri("/v1/workouts/" + workout + "/sets/" + set).header("Authorization", bearer(account)).exchange())
                .hasStatus(204);
        assertThat((List<?>) map(get(account, "/v1/workouts/" + workout)).get("sets")).isEmpty();
    }

    @Test
    void workoutsAreListedByTheDaysTheyStarted() throws Exception {
        AccountId account = TestSessions.newAccount();
        start(account, "2026-09-28T15:00:00Z");
        start(account, "2026-09-30T15:00:00Z");

        assertThat(list(get(account, "/v1/workouts?from=2026-09-30&to=2026-09-30"))).hasSize(1);
        assertThat(list(get(account, "/v1/workouts?from=2026-09-28&to=2026-09-30"))).hasSize(2);
    }

    @Test
    void impossibleSetsAreValidationErrors() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account, "2026-09-30T15:40:00Z");
        String sets = "/v1/workouts/" + workout + "/sets";

        assertThat(post(account, sets, set("bench_press", "WORKING", -5, 8, 1))).as("negative load").hasStatus(400);
        assertThat(post(account, sets, set("bench_press", "WORKING", 80, -1, 1))).as("negative reps").hasStatus(400);
        assertThat(post(account, sets, set("bench_press", "WORKING", 80, 8, -1))).as("negative RIR").hasStatus(400);
        assertThat(post(account, sets, set("bench_press", "HEAVY", 80, 8, 1))).as("unknown set type").hasStatus(400);
        assertThat(post(account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T15:00:00Z")))
                .as("finished before it started").hasStatus(400);
        // What the store cannot hold is a 400, never a 500 the offline phone would retry forever (ADR-024 §13).
        assertThat(post(account, sets, set("bench_press", "WORKING", 10_000, 8, 1))).as("load too large").hasStatus(400);
        assertThat(post(account, sets, set("bench_press", "WORKING", 80.005, 8, 1))).as("finer than the store").hasStatus(400);
        assertThat(post(account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "+300000-01-01T00:00:00Z")))
                .as("a time no database holds").hasStatus(400);
        assertThat(get(account, "/v1/workouts?from=2026-01-01&to=+999999999-12-31")).as("a day beyond every calendar").hasStatus(400);
    }

    @Test
    void aRangeLongerThanTheLimitIsAValidationError() throws Exception {
        AccountId account = TestSessions.newAccount();

        assertThat(get(account, "/v1/workouts?from=2025-01-01&to=2026-02-05")).as("400 days").hasStatus(400);
        assertThat(get(account, "/v1/workouts?from=2025-01-01&to=2026-02-04")).as("399 days").hasStatusOk();
    }

    @Test
    void aSetReplayedIntoAnotherWorkoutIsAConflictNotTheOtherWorkoutsSet() throws Exception {
        AccountId account = TestSessions.newAccount();
        String first = start(account, "2026-09-30T15:40:00Z");
        String second = start(account, "2026-10-01T15:40:00Z");
        Map<String, Object> set = set("bench_press", "WORKING", 80, 8, 1);

        assertThat(post(account, "/v1/workouts/" + first + "/sets", set)).hasStatus(201);
        assertThat(post(account, "/v1/workouts/" + second + "/sets", set)).hasStatus(409);
    }

    @Test
    void aSetCannotBeDeletedThroughAnotherWorkout() throws Exception {
        AccountId account = TestSessions.newAccount();
        String first = start(account, "2026-09-30T15:40:00Z");
        String second = start(account, "2026-10-01T15:40:00Z");
        String set = (String) map(post(account, "/v1/workouts/" + first + "/sets", set("bench_press", "WORKING", 80, 8, 1))).get("id");

        assertThat(mvc.delete().uri("/v1/workouts/" + second + "/sets/" + set).header("Authorization", bearer(account)).exchange())
                .hasStatus(404);
    }

    @Test
    void workoutsAreListedByTheUsersLocalDay() throws Exception {
        AccountId account = TestSessions.newAccount();
        mvc.put().uri("/v1/profile").header("Authorization", bearer(account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                        "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC", "schedule", Map.of("trainingDays", List.of("MONDAY"),
                                "checkInDay", "MONDAY", "timeZone", "Europe/Istanbul")))).exchange();
        start(account, "2026-09-29T22:30:00Z"); // 01:30 on the 30th in Istanbul

        assertThat(list(get(account, "/v1/workouts?from=2026-09-30&to=2026-09-30"))).hasSize(1);
        assertThat(list(get(account, "/v1/workouts?from=2026-09-29&to=2026-09-29"))).isEmpty();
    }

    private String start(AccountId account, String startedAt) throws Exception {
        MvcTestResult started = post(account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", startedAt));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    private static Map<String, Object> set(String exercise, String type, double loadKg, int reps, Integer rir) {
        Map<String, Object> set = new java.util.HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", exercise, "setType", type,
                "loadKg", loadKg, "reps", reps));
        if (rir != null) {
            set.put("rir", rir);
        }
        return set;
    }

    private MvcTestResult post(AccountId account, String uri, Object body) {
        return mvc.post().uri(uri).header("Authorization", bearer(account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(body)).exchange();
    }

    private MvcTestResult get(AccountId account, String uri) {
        return mvc.get().uri(uri).header("Authorization", bearer(account)).exchange();
    }

    private String bearer(AccountId account) {
        return TestSessions.bearer(context, account);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> list(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }
}
