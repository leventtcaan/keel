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
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * Notes (K-422, L3 §1 #8): a set and a session can each carry the user's own words ("left shoulder pinched", "slept 5
 * hours"), kept with them and read back with them. A note of only spaces is no note; one past the limit is refused, so
 * nothing is cut silently.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class WorkoutNoteTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Value("${keel.training.max-note}")
    int maxNote;

    @Test
    void aSetsNoteAndTheSessionsNoteAreKeptAndReadBack() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);

        MvcTestResult logged = post(account, "/v1/workouts/" + workout + "/sets", set("Left shoulder pinched on the last rep"));
        assertThat(logged).hasStatus(201);
        assertThat(map(logged)).containsEntry("note", "Left shoulder pinched on the last rep");
        assertThat(post(account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T16:32:00Z", "note", "Slept 5 hours")))
                .hasStatusOk();

        Map<String, Object> read = map(get(account, "/v1/workouts/" + workout));
        assertThat(read).containsEntry("note", "Slept 5 hours");
        assertThat((List<Map<String, Object>>) read.get("sets")).singleElement()
                .satisfies(s -> assertThat(s).containsEntry("note", "Left shoulder pinched on the last rep"));
    }

    @Test
    void noNoteIsNoField() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);

        assertThat(map(post(account, "/v1/workouts/" + workout + "/sets", set(null)))).doesNotContainKey("note");
        assertThat(map(post(account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T16:32:00Z")))).doesNotContainKey("note");
    }

    @Test
    void aNoteOfOnlySpacesIsNoNoteAndANoteIsKeptWithoutItsOuterSpaces() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);

        assertThat(map(post(account, "/v1/workouts/" + workout + "/sets", set("   \n ")))).doesNotContainKey("note");
        assertThat(map(post(account, "/v1/workouts/" + workout + "/sets", set("  grip slipped \n")))).containsEntry("note", "grip slipped");
        assertThat(map(post(account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T16:32:00Z", "note", "  "))))
                .doesNotContainKey("note");
    }

    @Test
    void aNotePastTheLimitIsRefusedNotCut() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);

        assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("x".repeat(maxNote)))).hasStatus(201);
        MvcTestResult tooLong = post(account, "/v1/workouts/" + workout + "/sets", set("x".repeat(maxNote + 1)));
        assertThat(tooLong).hasStatus(400);
        assertThat(map(tooLong)).containsEntry("code", "VALIDATION_FAILED");
        assertThat((List<?>) map(get(account, "/v1/workouts/" + workout)).get("sets")).hasSize(1);
        assertThat(post(account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T16:32:00Z", "note", "x".repeat(maxNote + 1))))
                .hasStatus(400);
        assertThat(map(get(account, "/v1/workouts/" + workout))).doesNotContainKey("endedAt");
    }

    @Test
    void aLaterFinishWithoutANoteKeepsTheNoteAndOneWithANoteReplacesIt() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);
        post(account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T16:32:00Z", "note", "Slept 5 hours"));

        assertThat(post(account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T16:40:00Z"))).hasStatusOk();
        assertThat(map(get(account, "/v1/workouts/" + workout))).containsEntry("note", "Slept 5 hours");
        post(account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T16:40:00Z", "note", "Slept 6 hours"));
        assertThat(map(get(account, "/v1/workouts/" + workout))).containsEntry("note", "Slept 6 hours");
    }

    @Test
    void theNotesAreInTheUsersExport() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);
        post(account, "/v1/workouts/" + workout + "/sets", set("grip slipped"));
        post(account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-09-30T16:32:00Z", "note", "Slept 5 hours"));

        String export = mvc.get().uri("/v1/account/export").header("Authorization", TestSessions.bearer(context, account)).exchange()
                .getResponse().getContentAsString();
        assertThat(export).contains("grip slipped").contains("Slept 5 hours");
    }

    private String start(AccountId account) throws Exception {
        MvcTestResult started = post(account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "2026-09-30T15:40:00Z"));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    private static Map<String, Object> set(String note) {
        Map<String, Object> set = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press", "setType", "WORKING",
                "loadKg", 80, "reps", 8, "rir", 1));
        if (note != null) {
            set.put("note", note);
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

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
