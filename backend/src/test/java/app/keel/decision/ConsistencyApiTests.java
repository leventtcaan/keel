package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
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
 * The daily number on the Today screen (K-420, K-111, U15): this week's four kinds of planned action counted from the
 * logs on the user's calendar, and the record of weeks on track since the first call — never reset (U7).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class ConsistencyApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final ZoneId ISTANBUL = ZoneId.of("Europe/Istanbul");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    void thisWeeksActionsAreCountedFromTheLogsOnTheUsersCalendar() throws Exception {
        LocalDate today = LocalDate.now(ISTANBUL);
        AccountId account = afterTheFirstCall();
        // Today: a session and a weigh-in (done today), and a step count (today is not over: not judged yet).
        send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", Instant.now().minusSeconds(1).toString()));
        send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", Instant.now().minusSeconds(1).toString(),
                "kg", 82.0, "source", "MANUAL"));
        send(account, "PUT", "/v1/activity-days", Map.of("day", today.toString(), "steps", 12000));

        Map<String, Object> consistency = read(get(account));

        assertThat(consistency).containsEntry("weekOf", today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString());
        assertThat(consistency.get("training")).isEqualTo(Map.of("planned", 2, "done", 1));
        assertThat((Map<String, Object>) consistency.get("weighIns")).containsEntry("done", 1);
        assertThat(consistency.get("steps")).isEqualTo(Map.of("planned", 0, "done", 0));
        assertThat((int) consistency.get("done")).isEqualTo(2);
        assertThat(consistency).containsKeys("planned", "percent");
        // The first call is this week: no week is over since, nothing counted yet.
        assertThat(consistency.get("record")).isEqualTo(Map.of("onTrackWeeks", 0, "countedWeeks", 0, "currentRun", 0));
    }

    @Test
    void aPlanWithoutACallCountsFromThePlansPhase() throws Exception {
        // K-420 review: no call yet (a plan set some other way) — the record begins where the phase began, not a 500.
        AccountId account = consenting();
        LocalDate began = LocalDate.now(ISTANBUL).minusDays(30);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :began, :began, 2600, false)""").param("a", account.value()).param("began", began).update();

        Map<String, Object> consistency = read(get(account));

        assertThat((Map<String, Object>) consistency.get("record")).containsEntry("countedWeeks", 4).containsEntry("onTrackWeeks", 0);
    }

    @Test
    void beforeTheFirstCallNothingIsPlannedYet() {
        AccountId account = consenting();

        assertThat(get(account)).hasStatus(404).bodyJson().extractingPath("$.code").isEqualTo("NOT_FOUND");
    }

    @Test
    void itIsHealthDataSoItNeedsTheConsent() {
        AccountId account = afterTheFirstCall();
        assertThat(mvc.delete().uri("/v1/consents/HEALTH_DATA?confirmDataDeletion=true").header("Authorization", TestSessions.bearer(context, account))
                .exchange()).hasStatusOk();

        assertThat(get(account)).hasStatus(403).bodyJson().extractingPath("$.code").isEqualTo("CONSENT_REQUIRED");
    }

    /** A man in Istanbul training on Mondays and Thursdays, whose first weekly call was made this week. */
    private AccountId afterTheFirstCall() {
        AccountId account = consenting();
        LocalDate today = LocalDate.now(ISTANBUL);
        send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(),
                "weekOf", CheckInWeek.weekOf(today, DayOfWeek.MONDAY).toString(), "answers", List.of()));
        return account;
    }

    private AccountId consenting() {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"));
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY", "THURSDAY"), "checkInDay", "MONDAY", "timeZone", ISTANBUL.getId())));
        return account;
    }

    private MvcTestResult get(AccountId account) {
        return mvc.get().uri("/v1/consistency").header("Authorization", TestSessions.bearer(context, account)).exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private void send(AccountId account, String method, String uri, Object body) {
        var request = "PUT".equals(method) ? mvc.put() : mvc.post();
        MvcTestResult result = request.uri(uri).header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body)).exchange();
        assertThat(result.getResponse().getStatus()).as(method + " " + uri).isLessThan(300);
    }
}
