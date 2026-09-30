package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Sex;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
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
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * Finishing a workout of a program day sets each planned move's next load and reps (K-217, K-109): every planned set at
 * the top of the range adds the region's load step; unclean form holds them (G6 K-31); a hold of the deload ladder is
 * applied when the program is read (K-110). One day, own program: bench 3 × 6-10, squat 3 × 6-10, bench again
 * 3 × 10-12, one-arm row 3 × 8-12.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class SessionProgressApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Instant MONDAY_EVENING = Instant.parse("2026-09-28T17:00:00Z");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    ParameterSet parameters;

    @Autowired
    TrainingCalls calls;

    @Test
    void everyPlannedSetAtTheTopAddsTheRegionsStepFromTheBottomOfTheRange() throws Exception {
        AccountId account = withAProgram();
        String workout = start(account, MONDAY_EVENING);
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");
        sets(account, workout, "squat", 3, 100, 10, "BOTH");

        assertThat(finish(account, workout, List.of())).hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(new BigDecimal("60").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG)), 6));
        assertThat(next(account, 1)).isEqualTo(target(new BigDecimal("100").add(step(ParameterKey.LOAD_INCREMENT_LOWER_KG)), 6));
    }

    @Test
    void addingRepsReadsTheSetsBackAndAnUnsetRirIsThePlannedOne() throws Exception {
        AccountId account = withAProgram();
        String workout = start(account, MONDAY_EVENING);
        set(account, workout, "bench_press", 60, 8, 1, "BOTH");
        set(account, workout, "bench_press", 60, 9, null, "BOTH");
        set(account, workout, "bench_press", 60, 9, 1, "BOTH");

        finish(account, workout, List.of());

        assertThat(next(account, 0)).isEqualTo(target(60, 9));
    }

    @Test
    void aLighterLastSetOrAWarmUpAtTheTopDoesNotCountAsAPlannedSet() throws Exception {
        // Two at 60 × 10 and the third at 57.5: not every planned set at the top — the load is repeated at the top.
        AccountId account = withAProgram();
        String workout = start(account, MONDAY_EVENING);
        set(account, workout, "bench_press", 60, 3, null, "BOTH", "WARM_UP");
        sets(account, workout, "bench_press", 2, 60, 10, "BOTH");
        set(account, workout, "bench_press", 57.5, 10, 1, "BOTH");

        finish(account, workout, List.of());

        assertThat(next(account, 0)).isEqualTo(target(60, 10));
    }

    @Test
    void uncleanFormHoldsTheLoadAndTheReps() throws Exception {
        AccountId account = withAProgram();
        String workout = start(account, MONDAY_EVENING);
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");

        assertThat(finish(account, workout, List.of("bench_press"))).hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(60, 10));
    }

    @Test
    void aHoldBegunAfterTheWorkoutStillHoldsTheNextSession() throws Exception {
        // Sunday's workout added load; Monday's check-in holds it (K-110): the program shows the last load at the top.
        AccountId account = withAProgram();
        String workout = start(account, MONDAY_EVENING.minusSeconds(86_400));
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");
        finish(account, workout, List.of());
        assertThat(next(account, 0).getFirst()).isEqualTo(kg(new BigDecimal("60").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG))));

        calls.holdLoad(account, UUID.randomUUID(), LocalDate.now(ZoneOffset.UTC).minusDays(1));

        assertThat(next(account, 0)).isEqualTo(target(60, 10));
    }

    @Test
    void theSameMoveTwiceInADayKeepsATargetEach() throws Exception {
        // 3 × 100 × 10 on bench: the 6-10 row adds load; the 10-12 row (the same sets, at its bottom) adds a rep.
        AccountId account = withAProgram();
        String workout = start(account, MONDAY_EVENING);
        sets(account, workout, "bench_press", 3, 100, 10, "BOTH");

        finish(account, workout, List.of());

        assertThat(next(account, 0)).isEqualTo(target(new BigDecimal("100").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG)), 6));
        assertThat(next(account, 2)).isEqualTo(target(100, 11));
    }

    @Test
    void aOneSidedMoveFollowsItsWeakerSide() throws Exception {
        // Left 3 × 20 × 12 (top), right 3 × 17.5 × 10: the right arm decides — 17.5 for 11, not 22.5 for both.
        AccountId account = withAProgram();
        String workout = start(account, MONDAY_EVENING);
        sets(account, workout, "one_arm_dumbbell_row", 3, 20, 12, "LEFT");
        sets(account, workout, "one_arm_dumbbell_row", 3, 17.5, 10, "RIGHT");

        finish(account, workout, List.of());

        assertThat(next(account, 3)).isEqualTo(target(17.5, 11));
    }

    @Test
    void anOlderWorkoutFinishedLateDoesNotRollTheTargetBack() throws Exception {
        AccountId account = withAProgram();
        String older = start(account, MONDAY_EVENING.minusSeconds(7 * 86_400));
        sets(account, older, "bench_press", 3, 55, 10, "BOTH");
        String newer = start(account, MONDAY_EVENING);
        sets(account, newer, "bench_press", 3, 60, 10, "BOTH");
        finish(account, newer, List.of());

        finish(account, older, List.of());

        assertThat(next(account, 0).getFirst()).isEqualTo(kg(new BigDecimal("60").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG))));
    }

    @Test
    void aRefusedFinishChangesNothing() throws Exception {
        AccountId account = withAProgram();
        String workout = start(account, MONDAY_EVENING);
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");

        assertThat(finish(account, workout, List.of("no_such_move"))).hasStatus(400);
        assertThat(finish(account, workout, List.of("bench_press", "bench_press"))).hasStatus(400);

        assertThat(map(send("GET", account, "/v1/workouts/" + workout, null))).doesNotContainKey("endedAt");
        assertThat(planned(account, 0)).doesNotContainKeys("nextLoadKg", "nextReps");
    }

    private AccountId withAProgram() {
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        assertThat(send("PUT", account, "/v1/program", Map.of("days", List.of(Map.of("name", "Full body", "weekday", "MONDAY", "exercises", List.of(
                own("bench_press", 6, 10), own("squat", 6, 10), own("bench_press", 10, 12), own("one_arm_dumbbell_row", 8, 12))))))).hasStatusOk();
        return account;
    }

    private static Map<String, Object> own(String exercise, int min, int max) {
        return Map.of("exerciseId", exercise, "sets", 3, "reps", Map.of("min", min, "max", max));
    }

    private String start(AccountId account, Instant at) throws Exception {
        Map<String, Object> day = ((List<Map<String, Object>>) map(send("GET", account, "/v1/program", null)).get("days")).getFirst();
        MvcTestResult started = send("POST", account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", at.toString(),
                "programDayId", day.get("id")));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    private void sets(AccountId account, String workout, String exercise, int count, double kg, int reps, String side) {
        for (int i = 0; i < count; i++) {
            set(account, workout, exercise, kg, reps, 1, side);
        }
    }

    private void set(AccountId account, String workout, String exercise, double kg, int reps, Integer rir, String side) {
        set(account, workout, exercise, kg, reps, rir, side, "WORKING");
    }

    private void set(AccountId account, String workout, String exercise, double kg, int reps, Integer rir, String side, String type) {
        Map<String, Object> body = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", exercise, "setType", type, "loadKg", kg,
                "reps", reps, "side", side));
        if (rir != null) {
            body.put("rir", rir);
        }
        assertThat(send("POST", account, "/v1/workouts/" + workout + "/sets", body)).hasStatus(201);
    }

    private MvcTestResult finish(AccountId account, String workout, List<String> unclean) {
        return send("POST", account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", Instant.now().toString(), "uncleanExerciseIds", unclean));
    }

    /** The day's planned move at this position, as the program shows it today. */
    private Map<String, Object> planned(AccountId account, int position) throws Exception {
        Map<String, Object> day = ((List<Map<String, Object>>) map(send("GET", account, "/v1/program", null)).get("days")).getFirst();
        return ((List<Map<String, Object>>) day.get("exercises")).get(position);
    }

    /** The load step of the region, from the parameter file. */
    private BigDecimal step(ParameterKey key) {
        return BigDecimal.valueOf(parameters.forSex(Sex.MALE).number(key));
    }

    /** The planned move's next load (plain, 62.5 not 62.50) and reps. */
    private List<Object> next(AccountId account, int position) throws Exception {
        Map<String, Object> planned = planned(account, position);
        return List.of(kg(planned.get("nextLoadKg")), planned.get("nextReps"));
    }

    private static List<Object> target(Object kg, int reps) {
        return List.of(kg(kg), reps);
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
