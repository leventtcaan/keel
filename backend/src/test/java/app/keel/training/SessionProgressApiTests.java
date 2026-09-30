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
 * Finishing a workout of a program day sets each planned move's next load and reps (K-217, K-109): every work set at
 * the top of the range adds the region's load step; unclean form holds them (G6 K-31).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class SessionProgressApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    ExerciseCatalog catalog;

    @Autowired
    ParameterSet parameters;

    @Test
    void everySetAtTheTopOfTheRangeAddsTheRegionsLoadStepFromTheBottomOfTheRange() throws Exception {
        AccountId account = withAProgram();
        Map<String, Object> day = firstDay(account);
        Map<String, Object> planned = loadTracked(day);
        String exercise = (String) planned.get("exerciseId");
        int top = (Integer) ((Map<String, Object>) planned.get("reps")).get("max");
        int bottom = (Integer) ((Map<String, Object>) planned.get("reps")).get("min");

        assertThat(finish(account, workAtTheTop(account, day, planned), List.of())).hasStatusOk();

        Map<String, Object> next = plannedAfter(account, exercise);
        ExerciseCatalog.Exercise move = catalog.find(exercise).orElseThrow();
        ParameterKey step = catalog.region(move.muscles().getFirst()) == ExerciseCatalog.Region.UPPER ? ParameterKey.LOAD_INCREMENT_UPPER_KG
                : ParameterKey.LOAD_INCREMENT_LOWER_KG;
        assertThat(new BigDecimal(next.get("nextLoadKg").toString()))
                .isEqualByComparingTo(new BigDecimal("60").add(BigDecimal.valueOf(parameters.forSex(Sex.MALE).number(step))));
        assertThat(next).containsEntry("nextReps", bottom);
        assertThat(top).isGreaterThan(bottom);
    }

    @Test
    void uncleanFormHoldsTheLoadAndTheReps() throws Exception {
        AccountId account = withAProgram();
        Map<String, Object> day = firstDay(account);
        Map<String, Object> planned = loadTracked(day);
        String exercise = (String) planned.get("exerciseId");
        int top = (Integer) ((Map<String, Object>) planned.get("reps")).get("max");

        assertThat(finish(account, workAtTheTop(account, day, planned), List.of(exercise))).hasStatusOk();

        Map<String, Object> next = plannedAfter(account, exercise);
        assertThat(new BigDecimal(next.get("nextLoadKg").toString())).isEqualByComparingTo("60");
        assertThat(next).containsEntry("nextReps", top);
    }

    @Test
    void anUnknownOrRepeatedMoveInTheTechniqueAnswerIsRefused() throws Exception {
        AccountId account = withAProgram();
        Map<String, Object> day = firstDay(account);
        String workout = workAtTheTop(account, day, loadTracked(day));

        assertThat(finish(account, workout, List.of("no_such_move"))).hasStatus(400);
        String exercise = (String) loadTracked(day).get("exerciseId");
        assertThat(finish(account, workout, List.of(exercise, exercise))).hasStatus(400);
    }

    private AccountId withAProgram() {
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        assertThat(send("POST", account, "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY")))).hasStatusOk();
        return account;
    }

    private Map<String, Object> firstDay(AccountId account) throws Exception {
        return ((List<Map<String, Object>>) map(send("GET", account, "/v1/program", null)).get("days")).getFirst();
    }

    /** The day's first compound move with an external load, not one-sided: its sets need nothing but a load and reps. */
    private Map<String, Object> loadTracked(Map<String, Object> day) {
        return ((List<Map<String, Object>>) day.get("exercises")).stream().filter(planned -> catalog.find((String) planned.get("exerciseId"))
                        .filter(move -> move.kind() == ExerciseCatalog.Kind.COMPOUND && move.load() == ExerciseCatalog.Load.EXTERNAL && !move.unilateral())
                        .isPresent())
                .findFirst().orElseThrow();
    }

    /** A workout of the day with each planned set at 60 kg and the top of the range; its id. */
    private String workAtTheTop(AccountId account, Map<String, Object> day, Map<String, Object> planned) throws Exception {
        String workout = (String) map(send("POST", account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt",
                Instant.now().minusSeconds(3600).toString(), "programDayId", day.get("id")))).get("id");
        int top = (Integer) ((Map<String, Object>) planned.get("reps")).get("max");
        for (int set = 0; set < (Integer) planned.get("sets"); set++) {
            assertThat(send("POST", account, "/v1/workouts/" + workout + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId",
                    planned.get("exerciseId"), "setType", "WORKING", "loadKg", 60, "reps", top, "rir", 1)).getResponse().getStatus()).isLessThan(300);
        }
        return workout;
    }

    private MvcTestResult finish(AccountId account, String workout, List<String> unclean) {
        return send("POST", account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", Instant.now().toString(), "uncleanExerciseIds", unclean));
    }

    private Map<String, Object> plannedAfter(AccountId account, String exercise) throws Exception {
        return ((List<Map<String, Object>>) firstDay(account).get("exercises")).stream().filter(planned -> exercise.equals(planned.get("exerciseId")))
                .findFirst().orElseThrow();
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
