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
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * Supersets (K-424, ADR-035, L3 §1 #7): the sets of moves done back to back carry the same supersetId, given by the
 * phone, so the history can show them together. Nothing else changes: each set is still its move's set.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class SupersetTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Test
    void theSetsOfASupersetCarryItsIdAndOthersNone() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);
        UUID superset = UUID.randomUUID();

        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("bench_press", superset))).hasStatus(201);
        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("barbell_row", superset))).hasStatus(201);
        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("lateral_raise", null))).hasStatus(201);

        List<Map<String, Object>> sets = (List<Map<String, Object>>) map(get(account, "/v1/workouts/" + workout)).get("sets");
        assertThat(sets).extracting(s -> s.get("supersetId")).containsExactly(superset.toString(), superset.toString(), null);
    }

    @Test
    void aReplayAnswersTheSetAsFirstStored() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);
        Map<String, Object> set = set("bench_press", UUID.randomUUID());
        Map<String, Object> first = map(post(account, "/v1/workouts/" + workout + "/sets", set));

        Map<String, Object> changed = new HashMap<>(set);
        changed.put("supersetId", UUID.randomUUID());
        MvcTestResult again = post(account, "/v1/workouts/" + workout + "/sets", changed);

        assertThat(again).hasStatusOk();
        assertThat(map(again)).isEqualTo(first);
    }

    private String start(AccountId account) throws Exception {
        MvcTestResult started = post(account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "2026-09-30T15:40:00Z"));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    private static Map<String, Object> set(String exerciseId, UUID superset) {
        Map<String, Object> set = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", exerciseId, "setType", "WORKING", "loadKg", 40,
                "reps", 10, "rir", 2));
        if (superset != null) {
            set.put("supersetId", superset);
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
