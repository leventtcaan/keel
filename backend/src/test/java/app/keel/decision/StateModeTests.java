package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.time.ZoneId;
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
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * State mode (K-516, ADR-038): the user declares what life brought — traveling, sick, in pain, a busy week, a new gym —
 * from today on their calendar, until a day or until they are back. Sickness and pain are health data: behind the health
 * data consent (GDPR Art. 9), deleted with it. What came before stays, so past weeks know they were paused.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class StateModeTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final ZoneId KIRITIMATI = ZoneId.of("Pacific/Kiritimati"); // UTC+14: a day ahead of UTC most hours

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    void aStateBeginsTodayOnTheUsersCalendarAndIsReadBack() throws Exception {
        AccountId account = ready();

        MvcTestResult declared = send(account, "PUT", Map.of("kind", "SICK"));

        assertThat(declared).hasStatusOk();
        assertThat(read(declared)).isEqualTo(Map.of("kind", "SICK", "since", today().toString()));
        assertThat(read(send(account, "GET", null))).isEqualTo(Map.of("kind", "SICK", "since", today().toString()));
    }

    @Test
    @SuppressWarnings("unchecked")
    void aBusyWeekIsReadBackWithItsLeastDoseAndNoOtherStateIs() throws Exception {
        // K-528 (ADR-038 #7, H9 §2): one session of one set per exercise, the usual weights, at 30 (born 1996); a suggestion
        // with the state — the export keeps only what was declared.
        AccountId account = ready();
        Map<String, Object> busy = read(send(account, "PUT", Map.of("kind", "BUSY")));
        assertThat((Map<String, Object>) busy.get("busyDose")).isEqualTo(Map.of("sessions", 1, "setsPerExercise", 1, "keepLoad", true));
        assertThat((Map<String, Object>) read(send(account, "GET", null)).get("busyDose"))
                .isEqualTo(Map.of("sessions", 1, "setsPerExercise", 1, "keepLoad", true));

        AccountId traveling = ready();
        assertThat(read(send(traveling, "PUT", Map.of("kind", "TRAVELING")))).doesNotContainKey("busyDose");
    }

    @Test
    void anEndDayIsKeptAndAStatePastItIsOver() throws Exception {
        AccountId account = ready();
        String until = today().plusDays(3).toString();

        assertThat(read(send(account, "PUT", Map.of("kind", "TRAVELING", "until", until)))).containsEntry("until", until);

        jdbc.sql("update decision.declared_state set starts_on = starts_on - 10, ends_on = ends_on - 10 where account_id = :a")
                .param("a", account.value()).update();
        assertThat(send(account, "GET", null)).hasStatus(404);
    }

    @Test
    void aNewStateTakesOverTheOpenOne() throws Exception {
        AccountId account = ready();
        send(account, "PUT", Map.of("kind", "SICK"));
        jdbc.sql("update decision.declared_state set starts_on = starts_on - 3 where account_id = :a").param("a", account.value()).update();

        assertThat(read(send(account, "PUT", Map.of("kind", "BUSY")))).containsEntry("kind", "BUSY");

        // The sickness ended yesterday and is kept: those days were paused.
        assertThat(states(account)).containsExactly(List.of("SICK", today().minusDays(3).toString(), today().minusDays(1).toString()),
                List.of("BUSY", today().toString(), "open"));
    }

    @Test
    void aStateChangedTheSameDayIsReplacedNotKept() throws Exception {
        AccountId account = ready();
        send(account, "PUT", Map.of("kind", "SICK"));

        send(account, "PUT", Map.of("kind", "PAIN"));

        assertThat(states(account)).containsExactly(List.of("PAIN", today().toString(), "open"));
    }

    @Test
    void backEndsTheStateYesterdayOrTakesBackOneDeclaredToday() throws Exception {
        AccountId account = ready();
        send(account, "PUT", Map.of("kind", "NEW_GYM"));
        jdbc.sql("update decision.declared_state set starts_on = starts_on - 4 where account_id = :a").param("a", account.value()).update();

        assertThat(send(account, "DELETE", null)).hasStatus(204);

        assertThat(send(account, "GET", null)).hasStatus(404);
        assertThat(states(account)).containsExactly(List.of("NEW_GYM", today().minusDays(4).toString(), today().minusDays(1).toString()));

        send(account, "PUT", Map.of("kind", "BUSY"));
        assertThat(send(account, "DELETE", null)).hasStatus(204);
        assertThat(send(account, "DELETE", null)).as("back again: nothing open, nothing to do").hasStatus(204);
        assertThat(states(account)).hasSize(1);
    }

    @Test
    void whatIsNotAStateOrADayToEndIsRefused() {
        AccountId account = ready();
        assertThat(send(account, "PUT", Map.of("kind", "ON_HOLIDAY"))).hasStatus(400);
        assertThat(send(account, "PUT", Map.of())).hasStatus(400);
        assertThat(send(account, "PUT", Map.of("kind", "BUSY", "until", today().minusDays(1).toString()))).hasStatus(400);
        assertThat(send(account, "PUT", Map.of("kind", "BUSY", "until", today().plusYears(2).toString()))).hasStatus(400);
        assertThat(send(account, "GET", null)).hasStatus(404);
    }

    @Test
    void sicknessAndPainAreHealthDataSoTheStateNeedsTheConsent() {
        AccountId account = TestSessions.newAccount();
        profile(account);
        for (String method : List.of("GET", "PUT", "DELETE")) {
            assertThat(send(account, method, "PUT".equals(method) ? Map.of("kind", "SICK") : null)).as(method).hasStatus(403)
                    .bodyJson().extractingPath("$.code").isEqualTo("CONSENT_REQUIRED");
        }
    }

    @Test
    void withoutAProfileThereIsNoCalendarToBeginOn() {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT /v1/consents", null);
        assertThat(send(account, "PUT", Map.of("kind", "SICK"))).hasStatus(409);
    }

    @Test
    void twoStatesDeclaredAtOnceLeaveOneOpen() throws Exception {
        // A double tap, or two devices: the second waits for the first, then takes over the open one (ADR-038 #2).
        for (int round = 0; round < 5; round++) {
            AccountId account = ready();
            var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
            var first = pool.submit(() -> send(account, "PUT", Map.of("kind", "SICK")).getResponse().getStatus());
            var second = pool.submit(() -> send(account, "PUT", Map.of("kind", "BUSY")).getResponse().getStatus());
            assertThat(List.of(first.get(), second.get())).as("round " + round).containsOnly(200);
            pool.shutdown();
            assertThat(states(account)).as("round " + round).hasSize(1);
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void aDeclaredWeeksCheckInAsksNothingAndItsCallWaitsSayingWhy() throws Exception {
        // ADR-038: the week the user declared is not read; the reason is shown (U3).
        AccountId account = ready();
        send(account, "PUT", Map.of("kind", "SICK"));
        String weekOf = CheckInWeek.weekOf(today(), java.time.DayOfWeek.MONDAY).toString();

        assertThat(read(mvc.get().uri("/v1/check-ins/current").header("Authorization", TestSessions.bearer(context, account)).exchange()))
                .containsEntry("questions", List.of());
        Map<String, Object> call = read(mvc.post().uri("/v1/check-ins/current/answers").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("clientId", java.util.UUID.randomUUID(),
                        "weekOf", weekOf, "answers", List.of()))).exchange());

        assertThat((Map<String, Object>) call.get("action")).containsEntry("type", "NO_DECISION_YET");
        assertThat((List<Map<String, Object>>) call.get("reasons")).extracting(reason -> reason.get("rule")).containsExactly("declared_context");
        assertThat(call).containsEntry("copyKey", "decision.no_decision_yet.declared_context");
    }

    @Test
    void aWeekWithADeclaredDayIsPausedOnTheConsistency() throws Exception {
        AccountId account = ready();
        String weekOf = CheckInWeek.weekOf(today(), java.time.DayOfWeek.MONDAY).toString();
        assertThat(mvc.post().uri("/v1/check-ins/current/answers").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("clientId", java.util.UUID.randomUUID(),
                        "weekOf", weekOf, "answers", List.of()))).exchange()).hasStatusOk();
        assertThat(read(mvc.get().uri("/v1/consistency").header("Authorization", TestSessions.bearer(context, account)).exchange()))
                .doesNotContainKey("paused");

        send(account, "PUT", Map.of("kind", "BUSY"));

        assertThat(read(mvc.get().uri("/v1/consistency").header("Authorization", TestSessions.bearer(context, account)).exchange()))
                .containsEntry("paused", true);
    }

    @Test
    @SuppressWarnings("unchecked")
    void theThirdPausedWeekRunningAsksOnceWhetherItIsStillSoAndNoEndsIt() throws Exception {
        // ADR-038 #5 (L3 §4.2): putting the call off is the user's right, changing it is not (U2) — after three weeks paused
        // in a row, one question that says why it is asked.
        AccountId account = ready();
        send(account, "PUT", Map.of("kind", "BUSY"));
        LocalDate monday = today().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        jdbc.sql("update decision.declared_state set starts_on = :start where account_id = :a").param("start", monday.minusWeeks(2))
                .param("a", account.value()).update();

        List<Map<String, Object>> questions = (List<Map<String, Object>>) checkIn(account).get("questions");

        assertThat(questions).singleElement().satisfies(question -> assertThat(question).containsEntry("kind", "STATE_STILL")
                .containsEntry("choices", List.of("YES", "NO")).containsEntry("reasonCopyKey", "checkIn.reason.state_still"));
        answer(account, "NO");
        assertThat(send(account, "GET", null)).as("over: it ended yesterday").hasStatus(404);
    }

    @Test
    void stillSoKeepsTheState() throws Exception {
        AccountId account = ready();
        send(account, "PUT", Map.of("kind", "SICK"));
        LocalDate monday = today().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        jdbc.sql("update decision.declared_state set starts_on = :start where account_id = :a").param("start", monday.minusWeeks(2))
                .param("a", account.value()).update();

        answer(account, "YES");

        assertThat(read(send(account, "GET", null))).containsEntry("kind", "SICK");
    }

    @Test
    @SuppressWarnings("unchecked")
    void stillSoIsKeptOnTheStateInForceOnlyAndGoesInTheExport() throws Exception {
        // K-525: the answer is the day it was given, on the state in force — not an ended one, not anyone else's.
        AccountId account = ready();
        AccountId other = ready();
        send(other, "PUT", Map.of("kind", "BUSY"));
        send(account, "PUT", Map.of("kind", "SICK"));
        LocalDate monday = today().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        jdbc.sql("update decision.declared_state set starts_on = :start where account_id = :a").param("start", monday.minusWeeks(2))
                .param("a", account.value()).update();
        jdbc.sql("""
                insert into decision.declared_state (id, account_id, kind, starts_on, ends_on, created_at)
                values (gen_random_uuid(), :a, 'PAIN', :start, :end, now())""").param("a", account.value())
                .param("start", monday.minusWeeks(6)).param("end", monday.minusWeeks(5)).update();
        UUID clientId = UUID.randomUUID();

        answer(account, clientId, "YES");

        assertThat(stillSoOn(account, "SICK")).isEqualTo(today());
        assertThat(stillSoOn(account, "PAIN")).as("ended").isNull();
        assertThat(stillSoOn(other, "BUSY")).as("someone else's").isNull();
        // The same answers sent again (a retry) keep the call and do not write the day again.
        jdbc.sql("update decision.declared_state set still_so_on = :said where account_id = :a and kind = 'SICK'")
                .param("said", monday.minusWeeks(2)).param("a", account.value()).update();
        answer(account, clientId, "YES");
        assertThat(stillSoOn(account, "SICK")).isEqualTo(monday.minusWeeks(2));
        // The export: on its state, with the days as the state's own; GET /v1/state stays the contract's DeclaredState.
        Map<String, Object> export = read(mvc.get().uri("/v1/account/export").header("Authorization", TestSessions.bearer(context, account))
                .exchange());
        List<Map<String, Object>> states = (List<Map<String, Object>>) ((Map<String, Object>) ((Map<String, Object>) export.get("sections"))
                .get("decision")).get("declaredStates");
        assertThat(states).filteredOn(state -> "SICK".equals(state.get("kind"))).singleElement()
                .satisfies(state -> assertThat(state).containsEntry("since", monday.minusWeeks(2).toString())
                        .containsEntry("stillSoOn", monday.minusWeeks(2).toString()).doesNotContainKey("until"));
        assertThat(states).filteredOn(state -> "PAIN".equals(state.get("kind"))).singleElement()
                .satisfies(state -> assertThat(state).doesNotContainKey("stillSoOn"));
        assertThat(read(send(account, "GET", null))).isEqualTo(Map.of("kind", "SICK", "since", monday.minusWeeks(2).toString()));
    }

    @Test
    void aStillSoWithNoStateInForceIsTakenAndKeepsNothing() throws Exception {
        // The question was fetched, then "I'm back", then "still so": the call is made, nothing is marked.
        AccountId account = ready();
        send(account, "PUT", Map.of("kind", "SICK"));
        LocalDate monday = today().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        jdbc.sql("update decision.declared_state set starts_on = :start where account_id = :a").param("start", monday.minusWeeks(2))
                .param("a", account.value()).update();
        assertThat(send(account, "DELETE", null).getResponse().getStatus()).isLessThan(300);

        answer(account, UUID.randomUUID(), "YES");

        assertThat(stillSoOn(account, "SICK")).isNull();
        assertThat(send(account, "GET", null)).hasStatus(404);
    }

    @Test
    void aCheckInWithoutTheQuestionKeepsNothing() throws Exception {
        AccountId account = ready();
        send(account, "PUT", Map.of("kind", "SICK"));
        String weekOf = CheckInWeek.weekOf(today(), java.time.DayOfWeek.MONDAY).toString();

        assertThat(mvc.post().uri("/v1/check-ins/current/answers").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("clientId", UUID.randomUUID(),
                        "weekOf", weekOf, "answers", List.of()))).exchange()).hasStatusOk();
        assertThat(stillSoOn(account, "SICK")).isNull();
    }

    @Test
    @SuppressWarnings("unchecked")
    void aNewStateDoesNotBringTheQuestionBackSoonerTheLastStillSoCounts() throws Exception {
        // Putting the call off is the user's right, not a way round the question (U2): SICK said still so last week, then
        // BUSY declared — the paused run goes on, and the question waits three weeks from that answer, not from BUSY.
        AccountId account = ready();
        LocalDate monday = today().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        jdbc.sql("""
                insert into decision.declared_state (id, account_id, kind, starts_on, ends_on, still_so_on, created_at)
                values (gen_random_uuid(), :a, 'SICK', :start, :end, :said, now())""").param("a", account.value())
                .param("start", monday.minusWeeks(5)).param("end", today().minusDays(1)).param("said", monday.minusWeeks(1)).update();
        send(account, "PUT", Map.of("kind", "BUSY"));

        assertThat(checkIn(account)).as("a week after the answer").containsEntry("questions", List.of());

        jdbc.sql("update decision.declared_state set still_so_on = :said where account_id = :a and kind = 'SICK'")
                .param("said", monday.minusWeeks(3)).param("a", account.value()).update();
        assertThat((List<Map<String, Object>>) checkIn(account).get("questions")).as("three weeks after it").singleElement()
                .satisfies(question -> assertThat(question).containsEntry("kind", "STATE_STILL"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void afterStillSoTheQuestionWaitsThreeWeeksAndIsAskedOnceMore() throws Exception {
        // ADR-041 #62: every three weeks (state_still_after_paused_weeks) — not every week after the third.
        AccountId account = ready();
        send(account, "PUT", Map.of("kind", "BUSY"));
        LocalDate monday = today().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        jdbc.sql("update decision.declared_state set starts_on = :start, still_so_on = :said where account_id = :a")
                .param("start", monday.minusWeeks(5)).param("said", monday.minusWeeks(2)).param("a", account.value()).update();

        assertThat(checkIn(account)).as("two weeks on").containsEntry("questions", List.of());

        jdbc.sql("update decision.declared_state set still_so_on = :said where account_id = :a").param("said", monday.minusWeeks(3).plusDays(6))
                .param("a", account.value()).update();
        assertThat((List<Map<String, Object>>) checkIn(account).get("questions")).as("three weeks on").singleElement()
                .satisfies(question -> assertThat(question).containsEntry("kind", "STATE_STILL"));
    }

    @Test
    void twoPausedWeeksAskNothing() throws Exception {
        AccountId account = ready();
        send(account, "PUT", Map.of("kind", "SICK"));
        LocalDate monday = today().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        jdbc.sql("update decision.declared_state set starts_on = :start where account_id = :a").param("start", monday.minusWeeks(1))
                .param("a", account.value()).update();

        assertThat(checkIn(account)).containsEntry("questions", List.of());
    }

    @Test
    void aStateThatEndedLongAgoPausesNothingAndBreaksNothing() throws Exception {
        // K-516 review: a state over before the weeks read must be left out, not read backwards.
        AccountId account = ready();
        send(account, "PUT", Map.of("kind", "SICK"));
        jdbc.sql("update decision.declared_state set starts_on = :start, ends_on = :end where account_id = :a")
                .param("start", today().minusDays(60)).param("end", today().minusDays(45)).param("a", account.value()).update();
        String weekOf = CheckInWeek.weekOf(today(), java.time.DayOfWeek.MONDAY).toString();

        assertThat(checkIn(account)).containsEntry("answered", false);
        assertThat(mvc.post().uri("/v1/check-ins/current/answers").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("clientId", java.util.UUID.randomUUID(),
                        "weekOf", weekOf, "answers", List.of()))).exchange()).hasStatusOk();
        assertThat(read(mvc.get().uri("/v1/consistency").header("Authorization", TestSessions.bearer(context, account)).exchange()))
                .doesNotContainKey("paused");
    }

    private Map<String, Object> checkIn(AccountId account) throws Exception {
        return read(mvc.get().uri("/v1/check-ins/current").header("Authorization", TestSessions.bearer(context, account)).exchange());
    }

    private void answer(AccountId account, String stillSo) throws Exception {
        answer(account, UUID.randomUUID(), stillSo);
    }

    private void answer(AccountId account, UUID clientId, String stillSo) throws Exception {
        String weekOf = CheckInWeek.weekOf(today(), java.time.DayOfWeek.MONDAY).toString();
        assertThat(mvc.post().uri("/v1/check-ins/current/answers").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("clientId", clientId,
                        "weekOf", weekOf, "answers", List.of(Map.of("kind", "STATE_STILL", "choice", stillSo))))).exchange()).hasStatusOk();
    }

    private LocalDate stillSoOn(AccountId account, String kind) {
        return jdbc.sql("select still_so_on from decision.declared_state where account_id = :a and kind = :kind")
                .param("a", account.value()).param("kind", kind)
                // A null day is the answer here: read as a row, not as a required value.
                .query((row, n) -> java.util.Optional.ofNullable(row.getObject(1, LocalDate.class))).single().orElse(null);
    }

    /** A user in Kiritimati, with the consent and a profile. */
    private AccountId ready() {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT /v1/consents", null);
        profile(account);
        return account;
    }

    private void profile(AccountId account) {
        assertThat(mvc.put().uri("/v1/profile").header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                        "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                        "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", KIRITIMATI.getId()))))
                .exchange()).hasStatusOk();
    }

    private static LocalDate today() {
        return LocalDate.now(KIRITIMATI);
    }

    /** Every state kept, oldest first: kind, first day, last day or "open". */
    private List<List<String>> states(AccountId account) {
        return jdbc.sql("select kind, starts_on, ends_on from decision.declared_state where account_id = :a order by starts_on, created_at")
                .param("a", account.value())
                .query((row, n) -> List.of(row.getString("kind"), row.getObject("starts_on", LocalDate.class).toString(),
                        row.getObject("ends_on", LocalDate.class) == null ? "open" : row.getObject("ends_on", LocalDate.class).toString()))
                .list();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private MvcTestResult send(AccountId account, String method, Object body) {
        if (method.equals("PUT /v1/consents")) {
            MvcTestResult consent = mvc.put().uri("/v1/consents/HEALTH_DATA").header("Authorization", TestSessions.bearer(context, account))
                    .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("textVersion", ConsentTextVersions.HEALTH_DATA)))
                    .exchange();
            assertThat(consent).hasStatusOk();
            return consent;
        }
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "DELETE" -> mvc.delete();
            default -> mvc.put();
        };
        request = request.uri("/v1/state").header("Authorization", TestSessions.bearer(context, account));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(new HashMap<>((Map<?, ?>) body)));
        }
        return request.exchange();
    }
}
