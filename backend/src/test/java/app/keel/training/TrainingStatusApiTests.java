package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.TrainingStatus;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
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
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        send("POST", account, "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY")));
        // The program made a month ago, so the sessions below fall after it.
        jdbc.sql("update training.program set created_at = now() - interval '30 days' where account_id = :a").param("a", account.value()).update();
        Map<String, Object> day = ((List<Map<String, Object>>) map(send("GET", account, "/v1/program", null)).get("days")).getFirst();
        String lift = ((List<Map<String, Object>>) day.get("exercises")).stream().map(planned -> (String) planned.get("exerciseId"))
                .filter(id -> catalog.find(id).filter(move -> move.kind() == ExerciseCatalog.Kind.COMPOUND && move.load() == ExerciseCatalog.Load.EXTERNAL
                        && !move.unilateral()).isPresent())
                .findFirst().orElseThrow();
        for (int daysAgo : new int[] {15, 8, 1}) {
            String workout = (String) map(send("POST", account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt",
                    Instant.now().minus(daysAgo, ChronoUnit.DAYS).toString(), "programDayId", day.get("id")))).get("id");
            send("POST", account, "/v1/workouts/" + workout + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", lift, "setType", "WORKING",
                    "loadKg", 80, "reps", 8, "rir", 1));
        }

        TrainingStatus status = reader.status(account, LocalDate.now(ZoneOffset.UTC), ZoneOffset.UTC).orElseThrow();

        assertThat(status.stalledSessions()).isEqualTo(2);
        assertThat(status.loadsBelowLastWeek()).isFalse();
        assertThat(status.weeksLoadHeld()).isZero();
        assertThat(reader.status(TestSessions.newAccount(), LocalDate.now(ZoneOffset.UTC), ZoneOffset.UTC)).as("no program").isEmpty();
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
