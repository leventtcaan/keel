package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.util.ArrayList;
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
 * Past sessions from another app's export (K-615, ADR-053, contract /v1/workout-imports): stored finished, marked with
 * where they came from, listed like any session — all or nothing, a retry safe, only with the health data consent.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class WorkoutImportApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    void sessionsAreStoredFinishedMarkedAndListed() throws Exception {
        AccountId account = consented();
        Map<String, Object> monday = session(UUID.randomUUID(), "2025-06-30T17:56:00Z", "2025-06-30T18:58:00Z",
                set("bench_press", "WARM_UP", 40, 10), set("bench_press", "WORKING", 80, 8));
        Map<String, Object> thursday = session(UUID.randomUUID(), "2025-07-03T17:00:00Z", "2025-07-03T18:00:00Z", set("squat", "WORKING", 100, 5));

        MvcTestResult result = importing(account, "STRONG", monday, thursday);

        assertThat(result).hasStatusOk();
        assertThat(map(result)).containsEntry("imported", 2).containsEntry("alreadyThere", 0);
        List<Map<String, Object>> listed = list(send(account, "GET", "/v1/workouts?from=2025-06-30&to=2025-07-03", null));
        assertThat(listed).extracting(w -> w.get("startedAt"), w -> w.get("endedAt"), w -> w.get("importedFrom")).containsExactly(
                org.assertj.core.groups.Tuple.tuple("2025-06-30T17:56:00Z", "2025-06-30T18:58:00Z", "STRONG"),
                org.assertj.core.groups.Tuple.tuple("2025-07-03T17:00:00Z", "2025-07-03T18:00:00Z", "STRONG"));
        List<Map<String, Object>> sets = (List<Map<String, Object>>) listed.getFirst().get("sets");
        // In the order they were done; no reps in reserve, no side — the file does not say.
        assertThat(sets).extracting(s -> s.get("exerciseId"), s -> s.get("setType"), s -> s.get("loadKg"), s -> s.get("reps")).containsExactly(
                org.assertj.core.groups.Tuple.tuple("bench_press", "WARM_UP", 40, 10), org.assertj.core.groups.Tuple.tuple("bench_press", "WORKING", 80, 8));
        assertThat(sets).allSatisfy(s -> assertThat(s).doesNotContainKeys("rir", "side", "note", "supersetId"));
    }

    @Test
    void aSessionLoggedInTheAppIsNotMarked() throws Exception {
        AccountId account = consented();
        send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "2025-07-01T17:00:00Z"));

        assertThat(list(send(account, "GET", "/v1/workouts?from=2025-07-01&to=2025-07-01", null)))
                .singleElement().satisfies(w -> assertThat(w).doesNotContainKey("importedFrom"));
    }

    @Test
    void aRetrySkipsTheSessionsAlreadyStored() throws Exception {
        AccountId account = consented();
        Map<String, Object> first = session(UUID.randomUUID(), "2025-06-30T17:56:00Z", "2025-06-30T18:58:00Z", set("bench_press", "WORKING", 80, 8));
        importing(account, "HEVY", first);

        MvcTestResult again = importing(account, "HEVY", first,
                session(UUID.randomUUID(), "2025-07-03T17:00:00Z", "2025-07-03T18:00:00Z", set("squat", "WORKING", 100, 5)));

        assertThat(again).hasStatusOk();
        assertThat(map(again)).containsEntry("imported", 1).containsEntry("alreadyThere", 1);
        assertThat(count(account, "training.workout")).isEqualTo(2);
        assertThat(count(account, "training.workout_set")).isEqualTo(2);
    }

    @Test
    void theHealthDataConsentIsNeeded() {
        AccountId account = TestSessions.newAccount();

        assertThat(importing(account, "STRONG", session(UUID.randomUUID(), "2025-06-30T17:56:00Z", "2025-06-30T18:58:00Z",
                set("bench_press", "WORKING", 80, 8)))).hasStatus(403);
        assertThat(count(account, "training.workout")).isZero();
    }

    @Test
    void oneInvalidSessionStoresNothing() {
        AccountId account = consented();
        Map<String, Object> good = session(UUID.randomUUID(), "2025-06-30T17:56:00Z", "2025-06-30T18:58:00Z", set("bench_press", "WORKING", 80, 8));
        Map<String, Object> unknownMove = session(UUID.randomUUID(), "2025-07-03T17:00:00Z", "2025-07-03T18:00:00Z",
                set("underwater_basket", "WORKING", 10, 5));

        assertThat(importing(account, "STRONG", good, unknownMove)).hasStatus(400);
        assertThat(count(account, "training.workout")).isZero();
        assertThat(count(account, "training.workout_set")).isZero();
    }

    @Test
    void whatASessionOrSetCannotBeIsRefused() {
        AccountId account = consented();
        String start = "2025-06-30T17:56:00Z";
        String end = "2025-06-30T18:58:00Z";

        assertThat(importing(account, "STRONG", session(UUID.randomUUID(), end, start, set("bench_press", "WORKING", 80, 8))))
                .as("ended before it started").hasStatus(400);
        assertThat(importing(account, "STRONG", session(UUID.randomUUID(), start, end))).as("no set").hasStatus(400);
        assertThat(importing(account, "STRONG", session(UUID.randomUUID(), start, end, set("bench_press", "WORKING", 80, 0))))
                .as("no reps").hasStatus(400);
        assertThat(importing(account, "STRONG", session(UUID.randomUUID(), start, end, set("bench_press", "FAILURE", 80, 8))))
                .as("a set type the file cannot say").hasStatus(400);
        assertThat(importing(account, "STRONG", session(UUID.randomUUID(), start, end, set("bench_press", "WORKING", 80.125, 8))))
                .as("load finer than the column").hasStatus(400);
        assertThat(importing(account, "STRONG", session(UUID.randomUUID(), start, end, set("bench_press", "WORKING", 1001, 8))))
                .as("load over the limit").hasStatus(400);
        assertThat(importing(account, "STRONG", session(UUID.randomUUID(), start, end, set("push_up", "WORKING", 10, 8))))
                .as("a load on a bodyweight move").hasStatus(400);
        assertThat(importing(account, "STRAVA", session(UUID.randomUUID(), start, end, set("bench_press", "WORKING", 80, 8))))
                .as("an app not imported from").hasStatus(400);
        assertThat(count(account, "training.workout")).isZero();
    }

    @Test
    void theSameSessionTwiceInOneRequestIsRefused() {
        AccountId account = consented();
        UUID clientId = UUID.randomUUID();
        Map<String, Object> once = session(clientId, "2025-06-30T17:56:00Z", "2025-06-30T18:58:00Z", set("bench_press", "WORKING", 80, 8));

        assertThat(importing(account, "STRONG", once, once)).hasStatus(400);
    }

    @Test
    void atMostTwentySessionsARequest() {
        AccountId account = consented();
        List<Map<String, Object>> sessions = new ArrayList<>();
        for (int day = 1; day <= 21; day++) {
            sessions.add(session(UUID.randomUUID(), "2025-06-%02dT17:00:00Z".formatted(day), "2025-06-%02dT18:00:00Z".formatted(day),
                    set("bench_press", "WORKING", 80, 8)));
        }

        assertThat(importing(account, "STRONG", sessions.toArray(Map[]::new))).hasStatus(400);
        assertThat(importing(account, "STRONG", sessions.subList(0, 20).toArray(Map[]::new))).hasStatusOk();
    }

    @Test
    void aUnilateralMoveIsTakenWithoutASideAndAnOwnMoveToo() throws Exception {
        AccountId account = consented();
        String own = (String) map(send(account, "POST", "/v1/custom-exercises", Map.of("clientId", UUID.randomUUID(), "name", "Landmine press",
                "kind", "COMPOUND", "load", "EXTERNAL", "equipment", "BARBELL", "unilateral", true))).get("id");

        MvcTestResult result = importing(account, "HEVY", session(UUID.randomUUID(), "2025-06-30T17:56:00Z", "2025-06-30T18:58:00Z",
                set("one_arm_dumbbell_row", "WORKING", 30, 10), set(own, "WORKING", 20, 8)));

        assertThat(result).hasStatusOk();
        assertThat(map(result)).containsEntry("imported", 1);
        assertThat(importing(consented(), "HEVY", session(UUID.randomUUID(), "2025-06-30T17:56:00Z", "2025-06-30T18:58:00Z",
                set(own, "WORKING", 20, 8)))).as("another user's own move").hasStatus(400);
    }

    private AccountId consented() {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        return account;
    }

    private int count(AccountId account, String table) {
        return jdbc.sql("select count(*) from " + table + " where account_id = :a").param("a", account.value()).query(Integer.class).single();
    }

    @SafeVarargs
    private static Map<String, Object> session(UUID clientId, String startedAt, String endedAt, Map<String, Object>... sets) {
        return Map.of("clientId", clientId, "startedAt", startedAt, "endedAt", endedAt, "sets", List.of(sets));
    }

    private static Map<String, Object> set(String exerciseId, String setType, double loadKg, int reps) {
        Map<String, Object> set = new HashMap<>(Map.of("exerciseId", exerciseId, "setType", setType, "reps", reps));
        set.put("loadKg", loadKg == Math.rint(loadKg) ? (Object) (long) loadKg : (Object) loadKg);
        return set;
    }

    @SafeVarargs
    private MvcTestResult importing(AccountId account, String source, Map<String, Object>... sessions) {
        return send(account, "POST", "/v1/workout-imports", Map.of("source", source, "workouts", List.of(sessions)));
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

    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private static List<Map<String, Object>> list(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }
}
