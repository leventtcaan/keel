package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
 * The user's own moves (K-424, ADR-035, L3 §1 #10): a move the catalog does not have, named by the user, with the
 * classification the engine needs asked of them — compound or isolation, the load model, the equipment, one side or both.
 * A set names it as "custom:<id>", only its owner's; the set rules follow its load model as for a catalog move.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class CustomExerciseTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Value("${keel.training.custom-exercise.max-name}")
    int maxName;

    @Value("${keel.training.custom-exercise.max-count}")
    int maxMoves;

    @Test
    void aMoveOfTheUsersOwnIsKeptOncePerClientIdAndListedByName() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> move = move(UUID.randomUUID(), "  Landmine press ", "COMPOUND", "EXTERNAL", "BARBELL", true);

        MvcTestResult first = send(account, "POST", "/v1/custom-exercises", move);
        MvcTestResult again = send(account, "POST", "/v1/custom-exercises", move);
        send(account, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "cable crunch", "ISOLATION", "EXTERNAL", "CABLE", false));

        assertThat(first).hasStatus(201);
        assertThat(again).hasStatus(200);
        assertThat(map(again)).isEqualTo(map(first));
        assertThat(map(first)).containsEntry("name", "Landmine press").containsEntry("kind", "COMPOUND").containsEntry("load", "EXTERNAL")
                .containsEntry("equipment", "BARBELL").containsEntry("unilateral", true);
        assertThat((String) map(first).get("id")).startsWith("custom:");
        assertThat(list(send(account, "GET", "/v1/custom-exercises", null))).extracting(m -> m.get("name"))
                .containsExactly("cable crunch", "Landmine press");
        assertThat(list(send(TestSessions.newAccount(), "GET", "/v1/custom-exercises", null))).as("another user's").isEmpty();
    }

    @Test
    void aSetOfItIsLoggedAndReadBack() throws Exception {
        AccountId account = TestSessions.newAccount();
        String id = (String) map(send(account, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "Landmine press", "COMPOUND", "EXTERNAL",
                "BARBELL", true))).get("id");
        String workout = start(account);

        MvcTestResult logged = send(account, "POST", "/v1/workouts/" + workout + "/sets", set(id, 40, "LEFT"));

        assertThat(logged).hasStatus(201);
        assertThat((List<Map<String, Object>>) map(send(account, "GET", "/v1/workouts/" + workout, null)).get("sets")).singleElement()
                .satisfies(s -> assertThat(s).containsEntry("exerciseId", id).containsEntry("side", "LEFT"));
    }

    @Test
    void theSetRulesFollowItsLoadModelAndSides() throws Exception {
        AccountId account = TestSessions.newAccount();
        String bodyweight = (String) map(send(account, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "Ring row", "COMPOUND", "BODYWEIGHT",
                "BODYWEIGHT", false))).get("id");
        String workout = start(account);

        assertThat(send(account, "POST", "/v1/workouts/" + workout + "/sets", set(bodyweight, 10, null))).as("a bodyweight move with a load").hasStatus(400);
        assertThat(send(account, "POST", "/v1/workouts/" + workout + "/sets", set(bodyweight, 0, "LEFT"))).as("one side of a two-sided move").hasStatus(400);
        assertThat(send(account, "POST", "/v1/workouts/" + workout + "/sets", set(bodyweight, 0, null))).hasStatus(201);
    }

    @Test
    void onlyTheOwnerCanLogIt() throws Exception {
        AccountId owner = TestSessions.newAccount();
        String id = (String) map(send(owner, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "Landmine press", "COMPOUND", "EXTERNAL",
                "BARBELL", true))).get("id");
        AccountId other = TestSessions.newAccount();
        String workout = start(other);

        assertThat(send(other, "POST", "/v1/workouts/" + workout + "/sets", set(id, 40, null))).hasStatus(400);
        assertThat(send(other, "POST", "/v1/workouts/" + workout + "/sets", set("custom:not-a-uuid", 40, null))).hasStatus(400);
    }

    @Test
    void whatTheServerDoesNotTake() {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> good = move(UUID.randomUUID(), "Landmine press", "COMPOUND", "EXTERNAL", "BARBELL", true);
        for (String missing : List.of("clientId", "name", "kind", "load", "equipment", "unilateral")) {
            Map<String, Object> wrong = new HashMap<>(good);
            wrong.remove(missing);
            assertThat(send(account, "POST", "/v1/custom-exercises", wrong)).as("no " + missing).hasStatus(400);
        }
        for (String name : List.of("   ", "x".repeat(maxName + 1), "Land\u0000mine")) {
            assertThat(send(account, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), name, "COMPOUND", "EXTERNAL", "BARBELL", true)))
                    .as(name.length() + " characters").hasStatus(400);
        }
        assertThat(send(account, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "Pull-up", "COMPOUND", "BODYWEIGHT", "BARBELL", false)))
                .as("a bodyweight load on a barbell (the catalog's own rule)").hasStatus(400);
        assertThat(send(account, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "Push-up", "COMPOUND", "EXTERNAL", "BODYWEIGHT", false)))
                .as("bodyweight equipment with an external load").hasStatus(400);
        assertThat(send(account, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "x".repeat(maxName), "COMPOUND", "EXTERNAL", "BARBELL",
                true))).hasStatus(201);
    }

    @Test
    void thereIsALimitToHowManyMovesAUserKeeps() {
        AccountId account = TestSessions.newAccount();
        send(account, "GET", "/v1/custom-exercises", null); // the account row (the bearer makes it)
        for (int i = 0; i < maxMoves; i++) {
            jdbc.sql("""
                    insert into training.custom_exercise (id, account_id, client_id, name, kind, load, equipment, unilateral, created_at)
                    values (gen_random_uuid(), :account, gen_random_uuid(), :name, 'COMPOUND', 'EXTERNAL', 'BARBELL', false, now())""")
                    .param("account", account.value()).param("name", "Move " + i).update();
        }

        assertThat(send(account, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "One more", "COMPOUND", "EXTERNAL", "BARBELL", false)))
                .hasStatus(400);
    }

    @Test
    void aFinishMayCallTheUsersOwnMoveUncleanAndThePlannedMovesStillGetTheirTargets() throws Exception {
        AccountId account = TestSessions.newAccount();
        String id = (String) map(send(account, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "Landmine press", "COMPOUND", "EXTERNAL",
                "BARBELL", true))).get("id");
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", day("bench_press")));
        String dayId = (String) ((List<Map<String, Object>>) program.get("days")).getFirst().get("id");
        MvcTestResult started = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "2026-09-30T15:40:00Z",
                "programDayId", dayId));
        String workout = (String) map(started).get("id");
        send(account, "POST", "/v1/workouts/" + workout + "/sets", set("bench_press", 60, null));
        send(account, "POST", "/v1/workouts/" + workout + "/sets", set(id, 40, null));

        MvcTestResult finished = send(account, "POST", "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T16:30:00Z",
                "uncleanExerciseIds", List.of(id)));

        assertThat(finished).as("review: a custom move in the unclean list failed the whole finish").hasStatusOk();
        List<Map<String, Object>> planned = (List<Map<String, Object>>) ((List<Map<String, Object>>) map(send(account, "GET", "/v1/program", null))
                .get("days")).getFirst().get("exercises");
        assertThat(planned).singleElement().satisfies(bench -> assertThat(bench).containsKeys("nextLoadKg", "nextReps"));
        assertThat(send(TestSessions.newAccount(), "POST", "/v1/workouts/" + start(account) + "/finish", Map.of("endedAt", "2026-09-30T16:30:00Z")))
                .as("not that account's workout").hasStatus(404);
    }

    @Test
    void anotherUsersMoveInTheUncleanListIsRefused() throws Exception {
        AccountId owner = TestSessions.newAccount();
        String id = (String) map(send(owner, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "Landmine press", "COMPOUND", "EXTERNAL",
                "BARBELL", true))).get("id");
        AccountId other = TestSessions.newAccount();
        String workout = start(other);

        assertThat(send(other, "POST", "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T16:30:00Z", "uncleanExerciseIds", List.of(id))))
                .hasStatus(400);
    }

    /**
     * ADR-035 Ek 1 (Levent, 2026-10-08; ADR-073 #1): the user's own program may carry their own move — an imported routine's
     * move the catalog does not have. The engine applies no rule to it: no target, nothing from the in-session table.
     */
    @Test
    void anOwnProgramMayCarryTheUsersOwnMoveWithNoTarget() throws Exception {
        AccountId account = TestSessions.newAccount();
        String id = (String) map(send(account, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "Landmine press", "COMPOUND", "EXTERNAL",
                "BARBELL", true))).get("id");

        MvcTestResult stored = send(account, "PUT", "/v1/program", day(id));

        assertThat(stored).hasStatusOk();
        Map<String, Object> program = map(stored);
        assertThat(program).containsEntry("source", "OWN");
        Map<String, Object> planned = ((List<Map<String, Object>>) ((List<Map<String, Object>>) program.get("days")).getFirst().get("exercises")).getFirst();
        assertThat(planned).containsEntry("exerciseId", id).containsEntry("sets", 3).containsEntry("reps", Map.of("min", 6, "max", 8))
                .doesNotContainKeys("nextLoadKg", "nextReps", "lighterLoadKg", "heavierLoadKg", "calibrationStepKg", "lastBestSet", "nextLoadAtTopKg");
        assertThat(map(send(account, "GET", "/v1/program", null))).isEqualTo(program);
    }

    @Test
    void finishingADayWithAnOwnMoveSetsTheCatalogMovesTargetsAndNoneForIt() throws Exception {
        AccountId account = TestSessions.newAccount();
        String id = (String) map(send(account, "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "Landmine press", "COMPOUND", "EXTERNAL",
                "BARBELL", false))).get("id");
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", Map.of("days", List.of(Map.of("name", "Upper", "weekday", "MONDAY",
                "exercises", List.of(Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 6, "max", 8)),
                        Map.of("exerciseId", id, "sets", 3, "reps", Map.of("min", 6, "max", 8))))))));
        String dayId = (String) ((List<Map<String, Object>>) program.get("days")).getFirst().get("id");
        String workout = (String) map(send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "2026-09-30T15:40:00Z",
                "programDayId", dayId))).get("id");
        assertThat(send(account, "POST", "/v1/workouts/" + workout + "/sets", set("bench_press", 60, null))).hasStatus(201);
        assertThat(send(account, "POST", "/v1/workouts/" + workout + "/sets", set(id, 40, null))).hasStatus(201);

        assertThat(send(account, "POST", "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T16:30:00Z"))).hasStatusOk();

        List<Map<String, Object>> planned = (List<Map<String, Object>>) ((List<Map<String, Object>>) map(send(account, "GET", "/v1/program", null))
                .get("days")).getFirst().get("exercises");
        assertThat(planned.get(0)).containsEntry("exerciseId", "bench_press").containsKeys("nextLoadKg", "nextReps");
        assertThat(planned.get(1)).containsEntry("exerciseId", id).doesNotContainKeys("nextLoadKg", "nextReps", "lastBestSet");
    }

    @Test
    void anotherUsersMoveIsNotInAProgram() throws Exception {
        String id = (String) map(send(TestSessions.newAccount(), "POST", "/v1/custom-exercises", move(UUID.randomUUID(), "Landmine press", "COMPOUND",
                "EXTERNAL", "BARBELL", true))).get("id");
        AccountId other = TestSessions.newAccount();

        assertThat(send(other, "PUT", "/v1/program", day(id))).hasStatus(400);
        assertThat(send(other, "PUT", "/v1/program", day("custom:" + UUID.randomUUID()))).as("no such move").hasStatus(400);
        assertThat(send(other, "GET", "/v1/program", null)).as("nothing stored").hasStatus(404);
    }

    private static Map<String, Object> day(String exerciseId) {
        return Map.of("days", List.of(Map.of("name", "Upper", "weekday", "MONDAY", "exercises",
                List.of(Map.of("exerciseId", exerciseId, "sets", 3, "reps", Map.of("min", 6, "max", 8))))));
    }

    private String start(AccountId account) throws Exception {
        MvcTestResult started = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "2026-09-30T15:40:00Z"));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    private static Map<String, Object> move(UUID clientId, String name, String kind, String load, String equipment, boolean unilateral) {
        return Map.of("clientId", clientId, "name", name, "kind", kind, "load", load, "equipment", equipment, "unilateral", unilateral);
    }

    private static Map<String, Object> set(String exerciseId, int loadKg, String side) {
        Map<String, Object> set = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", exerciseId, "setType", "WORKING", "loadKg", loadKg,
                "reps", 8, "rir", 2));
        if (side != null) {
            set.put("side", side);
        }
        return set;
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
