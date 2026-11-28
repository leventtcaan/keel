package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Duration;
import java.time.Instant;
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
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * A move's history (K-1259, ADR-096 › Geçmiş ve grafik, free): every session that has it, a page at a time, with no limit in
 * time; its records of all time, so a record older than the year the phone used to ask for stays. The subscription is not read.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class MoveHistoryApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Instant LAST = Instant.parse("2026-11-01T10:00:00Z");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Test
    void theHistoryIsPagedNewestFirstAndReachesPastAYear() throws Exception {
        AccountId account = TestSessions.newAccount();
        int page = MoveHistoryController.pageFromClasspath();
        List<String> started = new ArrayList<>();
        // One session more than a page, forty days apart: the oldest is far past 365 days before the newest.
        for (int k = 0; k <= page; k++) {
            Instant at = LAST.minus(Duration.ofDays(40L * k));
            String workout = start(account, at);
            started.add(at.toString());
            assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("bench_press", "WARM_UP", 40, 10, null))).hasStatus(201);
            assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("bench_press", "WORKING", 80, 8, 1))).hasStatus(201);
            assertThat(post(account, "/v1/workouts/" + workout + "/sets", set("squat", "WORKING", 100, 5, 1))).hasStatus(201);
        }
        String unrelated = start(account, LAST.plus(Duration.ofDays(1)));
        assertThat(post(account, "/v1/workouts/" + unrelated + "/sets", set("squat", "WORKING", 100, 5, 1))).hasStatus(201);

        Map<String, Object> first = map(get(account, "/v1/exercises/bench_press/history"));
        List<Map<String, Object>> sessions = sessions(first);
        assertThat(sessions).extracting(s -> s.get("startedAt")).containsExactlyElementsOf(started.subList(0, page));
        // The move's sets only, warm-ups too: what was done.
        assertThat(sessions).allSatisfy(s -> assertThat(sets(s)).extracting(set -> set.get("exerciseId")).containsOnly("bench_press").hasSize(2));
        assertThat(first).containsKey("next");

        Map<String, Object> second = map(get(account, "/v1/exercises/bench_press/history?before=" + first.get("next")));
        assertThat(sessions(second)).extracting(s -> s.get("startedAt")).containsExactly(started.get(page));
        assertThat(second).doesNotContainKey("next");
    }

    @Test
    void aRecordOlderThan400DaysStaysWhateverPageIsAsked() throws Exception {
        AccountId account = TestSessions.newAccount();
        Instant longAgo = LAST.minus(Duration.ofDays(500));
        String old = start(account, longAgo);
        assertThat(post(account, "/v1/workouts/" + old + "/sets", set("bench_press", "WORKING", 100, 5, null))).hasStatus(201);
        String recent = start(account, LAST);
        assertThat(post(account, "/v1/workouts/" + recent + "/sets", set("bench_press", "WORKING", 80, 5, null))).hasStatus(201);

        Map<String, Object> read = map(get(account, "/v1/exercises/bench_press/history"));

        assertThat(records(read)).first().satisfies(record -> assertThat(record).containsEntry("kind", "HEAVIEST").containsEntry("loadKg", 100)
                .containsEntry("reps", 5).containsEntry("on", longAgo.toString()));
        assertThat(records(read)).extracting(r -> r.get("kind")).containsExactly("HEAVIEST", "REPS_AT", "REPS_AT");
    }

    @Test
    void aMoveOfNeitherTheCatalogNorTheUserIsNotFoundACursorNotTheirsIsRefused() throws Exception {
        AccountId account = TestSessions.newAccount();
        AccountId stranger = TestSessions.newAccount();
        String theirs = start(stranger, LAST);
        assertThat(post(stranger, "/v1/workouts/" + theirs + "/sets", set("bench_press", "WORKING", 80, 8, 1))).hasStatus(201);

        assertThat(get(account, "/v1/exercises/underwater_basket/history")).hasStatus(404);
        assertThat(get(account, "/v1/exercises/custom:" + UUID.randomUUID() + "/history")).hasStatus(404);
        assertThat(get(account, "/v1/exercises/bench_press/history?before=" + theirs)).hasStatus(400);
        assertThat(get(account, "/v1/exercises/bench_press/history?before=not-a-cursor")).hasStatus(400);
        // Another account's sessions are not listed, and without any there are no records.
        Map<String, Object> none = map(get(account, "/v1/exercises/bench_press/history"));
        assertThat(sessions(none)).isEmpty();
        assertThat(records(none)).isEmpty();
    }

    private String start(AccountId account, Instant startedAt) throws Exception {
        MvcTestResult started = post(account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", startedAt.toString()));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    private static Map<String, Object> set(String exercise, String type, double loadKg, int reps, Integer rir) {
        Map<String, Object> set = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", exercise, "setType", type,
                "loadKg", loadKg, "reps", reps));
        if (rir != null) {
            set.put("rir", rir);
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
        assertThat(result.getResponse().getStatus()).isLessThan(300);
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> sessions(Map<String, Object> history) {
        return (List<Map<String, Object>>) history.get("sessions");
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> sets(Map<String, Object> session) {
        return (List<Map<String, Object>>) session.get("sets");
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> records(Map<String, Object> history) {
        return (List<Map<String, Object>>) history.get("records");
    }
}
