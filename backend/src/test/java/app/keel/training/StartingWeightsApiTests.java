package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
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
 * Starting weights (ADR-072 #5, contract /v1/program/starting-weights): the load an experienced user lifts about 8 times
 * (onboarding.json › starting_weight_reps) is its move's first target, from the bottom of the range, on every day whose
 * range starts at 8 or under, rounded to the gym in use (ADR-032). A move or a day without one has no target; none is
 * derived. Own program: Monday bench 6-10, squat 6-10, lateral raise 12-15; Thursday bench 10-12, one-arm row 8-12.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class StartingWeightsApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String URI = "/v1/program/starting-weights";

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Test
    void eachWeightGivenIsItsMovesFirstTargetFromTheBottomOfTheRangeWhereAnEightRepLoadFits() throws Exception {
        // Bench is planned twice: 6-10 takes the load lifted about 8 times; 10-12 does not (too heavy for 10 reps) and finds
        // its load in the first session. The row's 8-12 starts at 8: it takes it.
        AccountId account = withAProgram();

        MvcTestResult answer = send("PUT", account, URI, weights(Map.of("exerciseId", "bench_press", "kg", 80),
                Map.of("exerciseId", "one_arm_dumbbell_row", "kg", 24)));

        assertThat(answer).hasStatusOk();
        assertThat(targets(map(answer))).isEqualTo(targets(map(send("GET", account, "/v1/program", null))));
        assertThat(targets(map(answer))).containsExactly(
                List.of("bench_press", kg(80), 6), List.of("squat"), List.of("lateral_raise"),
                List.of("bench_press"), List.of("one_arm_dumbbell_row", kg(24), 8));
    }

    @Test
    void theWeightIsTheNearestLoadTheGymInUseMakes() throws Exception {
        AccountId account = withAProgram();
        send("PUT", account, "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Downtown", "current", true, "barKg", 20,
                "platesKg", List.of(10, 5, 2.5), "dumbbellsKg", List.of(18, 20, 22), "machines", List.of()));

        MvcTestResult answer = send("PUT", account, URI, weights(Map.of("exerciseId", "squat", "kg", 101),
                Map.of("exerciseId", "one_arm_dumbbell_row", "kg", 21.5)));

        assertThat(answer).hasStatusOk();
        assertThat(targets(map(answer))).containsExactly(List.of("bench_press"), List.of("squat", kg(100), 6), List.of("lateral_raise"),
                List.of("bench_press"), List.of("one_arm_dumbbell_row", kg(22), 8));
    }

    @Test
    void theWeightsGivenReplaceTheOnesBefore() throws Exception {
        // The user went back in the onboarding and skipped the squat: its starting weight is gone, not kept.
        AccountId account = withAProgram();
        send("PUT", account, URI, weights(Map.of("exerciseId", "bench_press", "kg", 80), Map.of("exerciseId", "squat", "kg", 100)));

        send("PUT", account, URI, weights(Map.of("exerciseId", "bench_press", "kg", 70)));

        assertThat(targets(map(send("GET", account, "/v1/program", null)))).containsExactly(List.of("bench_press", kg(70), 6), List.of("squat"),
                List.of("lateral_raise"), List.of("bench_press"), List.of("one_arm_dumbbell_row"));
        assertThat(send("PUT", account, URI, weights())).hasStatusOk();
        assertThat(targets(map(send("GET", account, "/v1/program", null)))).allSatisfy(move -> assertThat(move).hasSize(1));
    }

    @Test
    void aTargetASessionSetIsNeverChangedByAStartingWeight() throws Exception {
        AccountId account = withAProgram();
        assertThat(send("PUT", account, URI, weights(Map.of("exerciseId", "squat", "kg", 100)))).hasStatusOk();
        assertThat(targets(map(send("GET", account, "/v1/program", null))).get(1)).isEqualTo(List.of("squat", kg(100), 6));
        String workout = start(account);
        for (int i = 0; i < 3; i++) {
            assertThat(send("POST", account, "/v1/workouts/" + workout + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", "squat",
                    "setType", "WORKING", "loadKg", 90, "reps", 7, "rir", 1, "side", "BOTH"))).hasStatus(201);
        }
        assertThat(send("POST", account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", Instant.now().toString(),
                "uncleanExerciseIds", List.of()))).hasStatusOk();
        List<Object> fromTheSession = targets(map(send("GET", account, "/v1/program", null))).get(1);

        send("PUT", account, URI, weights(Map.of("exerciseId", "squat", "kg", 120)));

        assertThat(fromTheSession).isEqualTo(List.of("squat", kg(90), 8));
        assertThat(targets(map(send("GET", account, "/v1/program", null))).get(1)).isEqualTo(fromTheSession);
    }

    @Test
    void aFirstSessionWithoutTheMoveKeepsItsStartingWeight() throws Exception {
        // The squat skipped on the day: its target is still the load the user gave, for the next session that has it.
        AccountId account = withAProgram();
        assertThat(send("PUT", account, URI, weights(Map.of("exerciseId", "squat", "kg", 100)))).hasStatusOk();
        String workout = start(account);
        assertThat(send("POST", account, "/v1/workouts/" + workout + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press",
                "setType", "WORKING", "loadKg", 60, "reps", 8, "rir", 1, "side", "BOTH"))).hasStatus(201);

        assertThat(send("POST", account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", Instant.now().toString(),
                "uncleanExerciseIds", List.of()))).hasStatusOk();

        assertThat(targets(map(send("GET", account, "/v1/program", null))).get(1)).isEqualTo(List.of("squat", kg(100), 6));
    }

    @Test
    void aNewProgramStartsWithoutTheStartingWeightsOfTheOldOne() throws Exception {
        AccountId account = withAProgram();
        assertThat(send("PUT", account, URI, weights(Map.of("exerciseId", "squat", "kg", 100)))).hasStatusOk();

        MvcTestResult generated = send("POST", account, "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY", "WEDNESDAY", "FRIDAY")));

        assertThat(generated).hasStatusOk();
        assertThat(targets(map(generated))).isNotEmpty().allSatisfy(move -> assertThat(move).hasSize(1));
    }

    @Test
    void aMoveNotInTheProgramTwiceUntrackedOrAnImpossibleLoadIsRefused() {
        // An isolation move has no target (the engine does not progress its load), so it gets no starting weight either.
        AccountId account = withAProgram();
        List<Map<String, Object>> bodies = List.of(weights(Map.of("exerciseId", "deadlift_of_the_moon", "kg", 80)),
                weights(Map.of("exerciseId", "overhead_press", "kg", 40)),
                weights(Map.of("exerciseId", "lateral_raise", "kg", 10)),
                weights(Map.of("exerciseId", "squat", "kg", 100), Map.of("exerciseId", "squat", "kg", 90)),
                weights(Map.of("exerciseId", "squat", "kg", 0)), weights(Map.of("exerciseId", "squat", "kg", -5)),
                weights(Map.of("exerciseId", "squat", "kg", 1000.5)), weights(Map.of("exerciseId", "squat", "kg", 100.125)),
                weights(Map.of("exerciseId", "squat")), Map.of());
        for (Map<String, Object> body : bodies) {
            assertThat(send("PUT", account, URI, body)).as(body.toString()).hasStatus(400).bodyJson().extractingPath("$.code")
                    .isEqualTo("VALIDATION_FAILED");
        }
    }

    @Test
    void withoutAProgramThereIsNothingToSetATargetIn() {
        assertThat(send("PUT", TestSessions.newAccount(), URI, weights(Map.of("exerciseId", "squat", "kg", 100)))).hasStatus(404);
    }

    private AccountId withAProgram() {
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", Map.of("goal", "BUILD_MUSCLE", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BRING_MY_OWN", "units", "METRIC", "experience", "Y1_3",
                "schedule", Map.of("trainingDays", List.of("MONDAY", "THURSDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        assertThat(send("PUT", account, "/v1/program", Map.of("days", List.of(
                Map.of("name", "A", "weekday", "MONDAY", "exercises", List.of(own("bench_press", 6, 10), own("squat", 6, 10),
                        own("lateral_raise", 12, 15))),
                Map.of("name", "B", "weekday", "THURSDAY", "exercises", List.of(own("bench_press", 10, 12), own("one_arm_dumbbell_row", 8, 12)))))))
                .hasStatusOk();
        return account;
    }

    private static Map<String, Object> own(String exercise, int min, int max) {
        return Map.of("exerciseId", exercise, "sets", 3, "reps", Map.of("min", min, "max", max));
    }

    @SafeVarargs
    private static Map<String, Object> weights(Map<String, Object>... weights) {
        return Map.of("weights", List.of(weights));
    }

    @SuppressWarnings("unchecked")
    private String start(AccountId account) throws Exception {
        Map<String, Object> monday = ((List<Map<String, Object>>) map(send("GET", account, "/v1/program", null)).get("days")).getFirst();
        MvcTestResult started = send("POST", account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(),
                "startedAt", Instant.now().minusSeconds(3600).toString(), "programDayId", monday.get("id")));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    /** Each planned move in program order: its id, and its next load (plain) and reps when it has a target. */
    @SuppressWarnings("unchecked")
    private static List<List<Object>> targets(Map<String, Object> program) {
        List<List<Object>> moves = new ArrayList<>();
        for (Map<String, Object> day : (List<Map<String, Object>>) program.get("days")) {
            for (Map<String, Object> planned : (List<Map<String, Object>>) day.get("exercises")) {
                moves.add(planned.containsKey("nextLoadKg")
                        ? List.of(planned.get("exerciseId"), kg(planned.get("nextLoadKg")), planned.get("nextReps"))
                        : List.of(planned.get("exerciseId")));
            }
        }
        return moves;
    }

    private static BigDecimal kg(Object kg) {
        return new BigDecimal(kg.toString()).stripTrailingZeros();
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
