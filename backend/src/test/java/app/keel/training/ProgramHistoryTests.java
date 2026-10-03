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
import tools.jackson.databind.json.JsonMapper;

/**
 * The program's sessions a week over time (K-535, ADR-045 #79): a program replaced keeps what the one before it asked, and
 * from when, so a week gone by is judged by the program it had (U7).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class ProgramHistoryTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    TrainingStatusReader statuses;

    @Autowired
    TrainingAccountData data;

    @Test
    void aReplacedProgramKeepsWhatTheOneBeforeItAskedAndFromWhen() {
        AccountId account = TestSessions.newAccount();
        ProgramStore programs = context.getBean(ProgramStore.class);
        send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY", "THURSDAY", "SATURDAY")));
        java.time.Instant firstMade = programs.createdAt(account).orElseThrow();
        own(account, 5);

        List<ProgramPeriod> history = statuses.programHistory(account);

        assertThat(history).extracting(ProgramPeriod::sessionsPerWeek).containsExactly(3, 5);
        assertThat(history.get(0).from()).isEqualTo(firstMade).isBefore(history.get(1).from());
        assertThat(history.get(1).from()).isEqualTo(programs.createdAt(account).orElseThrow());
    }

    @Test
    void theProgramInForceIsAlwaysTheHistorysLast() {
        // Two replaces at once (K-535 review): each read the clock before the other's lock let it in, so the one stored
        // last can carry the earlier time. The history never goes back: its last row is the program in force.
        AccountId account = TestSessions.newAccount();
        own(account, 2);
        java.time.Instant later = java.time.Instant.now().plusSeconds(3600).truncatedTo(java.time.temporal.ChronoUnit.MICROS); // as stored
        context.getBean(org.springframework.jdbc.core.simple.JdbcClient.class).sql(
                "insert into training.program_history (id, account_id, sessions_per_week, effective_from) values (gen_random_uuid(), :account, 4, :later)")
                .param("account", account.value()).param("later", later.atOffset(java.time.ZoneOffset.UTC)).update();

        own(account, 3);

        assertThat(statuses.programHistory(account)).last().satisfies(period -> {
            assertThat(period.sessionsPerWeek()).isEqualTo(3);
            assertThat(period.from()).isAfter(later);
        });
    }

    @Test
    void withoutAProgramThereIsNoHistory() {
        assertThat(statuses.programHistory(TestSessions.newAccount())).isEmpty();
    }

    @Test
    void theHistoryIsTheUsersDataExported() {
        AccountId account = TestSessions.newAccount();
        own(account, 2);

        @SuppressWarnings("unchecked")
        Map<String, Object> training = (Map<String, Object>) data.export(account);

        assertThat(training.get("programHistory")).asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.LIST)
                .extracting(period -> ((ProgramPeriod) period).sessionsPerWeek()).containsExactly(2);
    }

    /** The user's own program of {@code days} days, none on a weekday. */
    private void own(AccountId account, int days) {
        List<Map<String, Object>> program = java.util.stream.IntStream.range(0, days).mapToObj(day -> Map.<String, Object>of("name", "Full body",
                "exercises", List.of(Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 6, "max", 10))))).toList();
        send(account, "PUT", "/v1/program", Map.of("days", program));
    }

    private void send(AccountId account, String method, String uri, Object body) {
        var request = "PUT".equals(method) ? mvc.put() : mvc.post();
        assertThat(request.uri(uri).header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(body)).exchange().getResponse().getStatus()).as(method + " " + uri).isLessThan(300);
    }
}
