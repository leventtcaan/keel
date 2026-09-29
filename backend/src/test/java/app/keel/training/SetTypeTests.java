package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
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
 * What a set can be for its move (K-218, L3 P6): a one-side-at-a-time move is logged per side; a bodyweight move has
 * no added load (that is BODYWEIGHT_PLUS_EXTERNAL); a set to failure has no reps in reserve.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class SetTypeTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final ExerciseCatalog.Exercise ONE_ARM_ROW = move(ExerciseCatalog.Load.EXTERNAL, true);
    private static final ExerciseCatalog.Exercise BENCH = move(ExerciseCatalog.Load.EXTERNAL, false);
    private static final ExerciseCatalog.Exercise PUSH_UP = move(ExerciseCatalog.Load.BODYWEIGHT, false);
    private static final ExerciseCatalog.Exercise PULL_UP = move(ExerciseCatalog.Load.BODYWEIGHT_PLUS_EXTERNAL, false);

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Test
    void aOneSideMoveIsLoggedPerSide() {
        assertThat(SetRules.accepts(ONE_ARM_ROW, SetType.WORKING, kg("30"), 1, Side.LEFT)).isTrue();
        assertThat(SetRules.accepts(ONE_ARM_ROW, SetType.WORKING, kg("30"), 1, Side.RIGHT)).isTrue();
        assertThat(SetRules.accepts(ONE_ARM_ROW, SetType.WORKING, kg("30"), 1, Side.BOTH)).isFalse();
        assertThat(SetRules.accepts(ONE_ARM_ROW, SetType.WORKING, kg("30"), 1, null)).isFalse();
    }

    @Test
    void aTwoSidedMoveHasNoLeftOrRight() {
        assertThat(SetRules.accepts(BENCH, SetType.WORKING, kg("80"), 1, null)).isTrue();
        assertThat(SetRules.accepts(BENCH, SetType.WORKING, kg("80"), 1, Side.BOTH)).isTrue();
        assertThat(SetRules.accepts(BENCH, SetType.WORKING, kg("80"), 1, Side.LEFT)).isFalse();
    }

    @Test
    void aBodyweightMoveHasNoAddedLoadAndAWeightedOneMay() {
        assertThat(SetRules.accepts(PUSH_UP, SetType.WORKING, kg("0"), 1, null)).isTrue();
        assertThat(SetRules.accepts(PUSH_UP, SetType.WORKING, kg("5"), 1, null)).isFalse();
        assertThat(SetRules.accepts(PULL_UP, SetType.WORKING, kg("10"), 1, null)).isTrue();
        assertThat(SetRules.accepts(PULL_UP, SetType.WORKING, kg("0"), 1, null)).isTrue();
    }

    @Test
    void aSetToFailureHasNoRepsInReserve() {
        assertThat(SetRules.accepts(BENCH, SetType.FAILURE, kg("80"), 0, null)).isTrue();
        assertThat(SetRules.accepts(BENCH, SetType.FAILURE, kg("80"), null, null)).isTrue();
        assertThat(SetRules.accepts(BENCH, SetType.FAILURE, kg("80"), 2, null)).isFalse();
        assertThat(SetRules.accepts(BENCH, SetType.WARM_UP, kg("40"), 5, null)).isTrue();
    }

    @Test
    void theApiRefusesASetItsMoveCannotHave() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = (String) JSON.readValue(post(account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(),
                "startedAt", "2026-09-30T15:40:00Z")).getResponse().getContentAsString(), Map.class).get("id");

        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("pull_up", "WORKING", 10, 1, "LEFT"))).hasStatus(400);
        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("bench_press", "FAILURE", 80, 3, null))).hasStatus(400);
        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("bench_press", "FAILURE", 80, 0, null))).hasStatus(201);
    }

    private static ExerciseCatalog.Exercise move(ExerciseCatalog.Load load, boolean unilateral) {
        return new ExerciseCatalog.Exercise("move", ExerciseCatalog.Kind.COMPOUND, List.of("lats"), List.of(), load, unilateral);
    }

    private static BigDecimal kg(String value) {
        return new BigDecimal(value);
    }

    private static Map<String, Object> set(String exercise, String type, double loadKg, int rir, String side) {
        Map<String, Object> set = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", exercise, "setType", type,
                "loadKg", loadKg, "reps", 6, "rir", rir));
        if (side != null) {
            set.put("side", side);
        }
        return set;
    }

    private MvcTestResult post(AccountId account, String uri, Object body) {
        return mvc.post().uri(uri).header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(body)).exchange();
    }
}
