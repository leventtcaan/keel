package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.util.List;
import java.util.Map;
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
 * The program (K-211, contract /v1/program): built for the user who has none — the template for their training days —
 * or brought by the user who has one; the engine coaches on either. One current program per account; a new one
 * replaces it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class ProgramApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final List<String> FOUR_DAYS = List.of("FRIDAY", "MONDAY", "THURSDAY", "TUESDAY");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Test
    void aGeneratedProgramIsStoredAndReadBack() throws Exception {
        AccountId account = TestSessions.newAccount();

        MvcTestResult generated = send(account, "POST", "/v1/program/generate", Map.of("trainingDays", FOUR_DAYS));

        assertThat(generated).hasStatusOk();
        Map<String, Object> program = map(generated);
        assertThat(program).containsEntry("source", "GENERATED").containsKey("id");
        List<Map<String, Object>> days = (List<Map<String, Object>>) program.get("days");
        assertThat(days).extracting(day -> day.get("nameKey"), day -> day.get("weekday")).containsExactly(
                org.assertj.core.groups.Tuple.tuple("programDays.upper_a.name", "MONDAY"),
                org.assertj.core.groups.Tuple.tuple("programDays.lower_a.name", "TUESDAY"),
                org.assertj.core.groups.Tuple.tuple("programDays.upper_b.name", "THURSDAY"),
                org.assertj.core.groups.Tuple.tuple("programDays.lower_b.name", "FRIDAY"));
        assertThat((List<Map<String, Object>>) days.getFirst().get("exercises")).first().satisfies(bench -> assertThat(bench)
                .containsEntry("exerciseId", "bench_press").containsEntry("baseSets", 3).containsEntry("sets", 3)
                .containsEntry("reps", Map.of("min", 6, "max", 10)).containsEntry("targetRir", 1));
        assertThat(map(send(account, "GET", "/v1/program", null))).isEqualTo(program);
    }

    @Test
    void aNewProgramReplacesTheOldOne() throws Exception {
        AccountId account = TestSessions.newAccount();
        send(account, "POST", "/v1/program/generate", Map.of("trainingDays", FOUR_DAYS));

        send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY", "WEDNESDAY", "FRIDAY")));

        assertThat((List<?>) map(send(account, "GET", "/v1/program", null)).get("days")).hasSize(3);
    }

    @Test
    void twoProgramsSentAtOnceLeaveOneAndNeitherFails() throws Exception {
        // A double tap on "Generate": the replace is delete-then-insert on a unique account (K-211 review) — both answer 200.
        AccountId account = TestSessions.newAccount();
        String bearer = TestSessions.bearer(context, account);
        for (int round = 0; round < 5; round++) {
            var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
            var first = pool.submit(() -> generate(bearer, FOUR_DAYS));
            var second = pool.submit(() -> generate(bearer, List.of("MONDAY", "WEDNESDAY", "FRIDAY")));
            assertThat(List.of(first.get(), second.get())).as("round " + round).containsOnly(200);
            pool.shutdown();
        }
        assertThat((List<?>) map(send(account, "GET", "/v1/program", null)).get("days")).hasSizeBetween(3, 4);
    }

    private int generate(String bearer, List<String> days) {
        return mvc.post().uri("/v1/program/generate").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("trainingDays", days))).exchange().getResponse().getStatus();
    }

    @Test
    void noDaysSevenDaysOrADayTwiceIsNotAProgram() {
        AccountId account = TestSessions.newAccount();

        assertThat(send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of()))).hasStatus(400);
        assertThat(send(account, "POST", "/v1/program/generate", Map.of("trainingDays",
                List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY")))).hasStatus(400);
        assertThat(send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY", "MONDAY")))).hasStatus(400);
    }

    @Test
    void noProgramYetIs404() {
        assertThat(send(TestSessions.newAccount(), "GET", "/v1/program", null)).hasStatus(404);
    }

    @Test
    void anOwnProgramIsStoredAsTheUserWroteIt() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> own = Map.of("days", List.of(
                Map.of("name", "Push", "weekday", "MONDAY", "exercises", List.of(
                        Map.of("exerciseId", "bench_press", "sets", 4, "reps", Map.of("min", 5, "max", 8)),
                        Map.of("exerciseId", "lateral_raise", "sets", 3, "reps", Map.of("min", 12, "max", 15)))),
                Map.of("name", "Pull", "exercises", List.of(
                        Map.of("exerciseId", "pull_up", "sets", 3, "reps", Map.of("min", 6, "max", 10))))));

        MvcTestResult stored = send(account, "PUT", "/v1/program", own);

        assertThat(stored).hasStatusOk();
        Map<String, Object> program = map(stored);
        assertThat(program).containsEntry("source", "OWN");
        List<Map<String, Object>> days = (List<Map<String, Object>>) program.get("days");
        assertThat(days).extracting(day -> day.get("name"), day -> day.get("weekday"))
                .containsExactly(org.assertj.core.groups.Tuple.tuple("Push", "MONDAY"), org.assertj.core.groups.Tuple.tuple("Pull", null));
        assertThat((List<Map<String, Object>>) days.getFirst().get("exercises")).first().satisfies(bench -> assertThat(bench)
                .containsEntry("sets", 4).containsEntry("baseSets", 4).containsEntry("reps", Map.of("min", 5, "max", 8))
                .containsEntry("targetRir", 1));
        assertThat(map(send(account, "GET", "/v1/program", null))).isEqualTo(program);
    }

    @Test
    void anOwnProgramTakesAFixedRepTarget() throws Exception {
        // K-991: 5 x 5 is min = max (the contract's RepRange); the engine then only adds load.
        AccountId account = TestSessions.newAccount();

        MvcTestResult stored = send(account, "PUT", "/v1/program", own("squat", 5, 5, 5, "Day"));

        assertThat(stored).hasStatusOk();
        List<Map<String, Object>> days = (List<Map<String, Object>>) map(stored).get("days");
        assertThat((List<Map<String, Object>>) days.getFirst().get("exercises")).first()
                .satisfies(squat -> assertThat(squat).containsEntry("sets", 5).containsEntry("reps", Map.of("min", 5, "max", 5)));
        assertThat(send(account, "PUT", "/v1/program", own("squat", 5, 6, 5, "Day"))).as("max under min").hasStatus(400);
    }

    @Test
    void anOwnProgramTheEngineCannotReadIsRefused() {
        AccountId account = TestSessions.newAccount();

        assertThat(send(account, "PUT", "/v1/program", own("underwater_basket", 3, 6, 10, "Day"))).as("not in the catalog").hasStatus(400);
        assertThat(send(account, "PUT", "/v1/program", own("bench_press", 0, 6, 10, "Day"))).as("no sets").hasStatus(400);
        assertThat(send(account, "PUT", "/v1/program", own("bench_press", 3, 10, 6, "Day"))).as("min over max").hasStatus(400);
        assertThat(send(account, "PUT", "/v1/program", own("bench_press", 3, 6, 101, "Day"))).as("reps over the ceiling").hasStatus(400);
        assertThat(send(account, "PUT", "/v1/program", own("bench_press", 3, 6, 10, " "))).as("no name").hasStatus(400);
        assertThat(send(account, "PUT", "/v1/program", Map.of("days", List.of()))).as("no days").hasStatus(400);
        assertThat(send(account, "PUT", "/v1/program", Map.of("days", List.of(
                Map.of("name", "A", "weekday", "MONDAY", "exercises", List.of(Map.of("exerciseId", "squat", "sets", 3, "reps", Map.of("min", 6, "max", 10)))),
                Map.of("name", "B", "weekday", "MONDAY", "exercises", List.of(Map.of("exerciseId", "squat", "sets", 3, "reps", Map.of("min", 6, "max", 10))))))))
                .as("two days on one weekday").hasStatus(400);
    }

    private static Map<String, Object> own(String exercise, int sets, int min, int max, String name) {
        return Map.of("days", List.of(Map.of("name", name, "exercises", List.of(
                Map.of("exerciseId", exercise, "sets", sets, "reps", Map.of("min", min, "max", max))))));
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
}
