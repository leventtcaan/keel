package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.util.HashMap;
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

/** The rest before a set (K-1214): kept as the phone measured it, absent for an older phone, refused when it cannot be real. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class RestSecondsApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Test
    void theRestComesBackOnTheSetAndInTheSession() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);

        MvcTestResult first = post(account, "/v1/workouts/" + workout + "/sets", set(null));
        MvcTestResult second = post(account, "/v1/workouts/" + workout + "/sets", set(135));

        assertThat(first).hasStatus(201);
        assertThat(map(first)).doesNotContainKey("restSeconds");
        assertThat(second).hasStatus(201);
        assertThat(map(second)).containsEntry("restSeconds", 135);
        java.util.List<Map<String, Object>> sets = (java.util.List<Map<String, Object>>) map(get(account, "/v1/workouts/" + workout)).get("sets");
        assertThat(sets).extracting(s -> s.get("restSeconds")).containsExactly(null, 135);
    }

    @Test
    void aZeroRestIsKept() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);

        assertThat(map(post(account, "/v1/workouts/" + workout + "/sets", set(0)))).containsEntry("restSeconds", 0);
    }

    @Test
    void aNegativeOrImpossibleRestIsRefused() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);

        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set(-1))).hasStatus(400);
        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set(7201))).hasStatus(400);
    }

    @Test
    void theExportCarriesTheRest() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);
        post(account, "/v1/workouts/" + workout + "/sets", set(150));

        String exported = JSON.writeValueAsString(context.getBean(TrainingAccountData.class).export(account));

        assertThat(exported).contains("\"restSeconds\":150");
    }

    private String start(AccountId account) throws Exception {
        MvcTestResult started = post(account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "2026-09-30T15:40:00Z"));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    private static Map<String, Object> set(Integer restSeconds) {
        Map<String, Object> set = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press", "setType", "WORKING",
                "loadKg", 40, "reps", 10, "rir", 2));
        if (restSeconds != null) {
            set.put("restSeconds", restSeconds);
        }
        return set;
    }

    private MvcTestResult post(AccountId account, String uri, Object body) {
        return mvc.post().uri(uri).header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(body)).exchange();
    }

    private MvcTestResult get(AccountId account, String uri) {
        return mvc.get().uri(uri).header("Authorization", TestSessions.bearer(context, account)).exchange();
    }

    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
