package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
 * Cardio in the program and the cardio log (K-959, ADR-074; contract Program.cardio, /v1/program/cardio,
 * /v1/cardio-sessions). The default follows the phase in force — the plan's, or before the first call the goal's — on the
 * program's training days (cardio.yaml: a cut 3-5 × 30 min, a gaining phase 2 × 20, none for very active work); the
 * user's own is kept through a new program and a new phase; the week counts the days with cardio logged, Monday to Sunday
 * (UTC here). Cardio reaches neither the food budget nor the weekly consistency (#5, #6).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class CardioLogTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final LocalDate TODAY = LocalDate.now(ZoneOffset.UTC);
    private static final List<String> MON_WED_FRI = List.of("MONDAY", "WEDNESDAY", "FRIDAY");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    void aFatLossWeekOnThreeTrainingDaysHasThreeThirtyMinuteSessionsAfterTheWeights() throws Exception {
        AccountId account = withAProgram("LOSE_FAT", "INACTIVE", MON_WED_FRI);

        assertThat(cardio(account)).isEqualTo(Map.of("source", "GENERATED", "minutes", 30, "sessionsPerWeek", 3, "doneThisWeek", 0,
                "sessions", List.of(after("MONDAY"), after("WEDNESDAY"), after("FRIDAY"))));
    }

    @Test
    void aGainingPhaseHasTwoTwentyMinuteSessions() throws Exception {
        AccountId account = withAProgram("BUILD_MUSCLE", "ACTIVE", MON_WED_FRI);

        assertThat(cardio(account)).containsEntry("minutes", 20).containsEntry("sessions", List.of(after("MONDAY"), after("WEDNESDAY")));
    }

    @Test
    void thePhaseOfThePlanInForceWinsOverTheGoal() throws Exception {
        // A fat-loss goal whose plan moved to a gaining phase (a hard stop, ADR-020): cardio follows the plan.
        AccountId account = withAProgram("LOSE_FAT", "INACTIVE", MON_WED_FRI);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'BULK', :today, :today, 2600, false)""").param("a", account.value()).param("today", TODAY).update();

        assertThat(cardio(account)).containsEntry("minutes", 20).containsEntry("sessionsPerWeek", 2);
    }

    @Test
    void decideForMeWithoutAFatEstimateStartsWithACutsCardio() throws Exception {
        // The phase the first plan would start with (ADR-027 #17): without a look or a waist, a cut.
        AccountId account = withAProgram("DECIDE_FOR_ME", "INACTIVE", MON_WED_FRI);

        assertThat(cardio(account)).containsEntry("minutes", 30).containsEntry("sessionsPerWeek", 3);
    }

    @Test
    void veryActiveWorkHasNoDefaultCardio() throws Exception {
        AccountId account = withAProgram("LOSE_FAT", "VERY_ACTIVE", MON_WED_FRI);

        assertThat(program(account)).doesNotContainKey("cardio");
    }

    @Test
    void theUsersOwnCardioReplacesTheDefaultAndOutlivesANewProgramAndANewPhase() throws Exception {
        AccountId account = withAProgram("LOSE_FAT", "INACTIVE", MON_WED_FRI);
        profile(account, "BUILD_MUSCLE", "INACTIVE");
        assertThat(cardio(account)).as("the default follows the phase").containsEntry("minutes", 20);
        Map<String, Object> own = Map.of("minutes", 40, "sessions", List.of(place("TUESDAY", "OFF_DAY_LOW_INTENSITY"), after("FRIDAY")));

        MvcTestResult answer = send("PUT", account, "/v1/program/cardio", own);

        Map<String, Object> expected = Map.of("source", "USER", "minutes", 40, "sessionsPerWeek", 2, "doneThisWeek", 0,
                "sessions", List.of(place("TUESDAY", "OFF_DAY_LOW_INTENSITY"), after("FRIDAY")));
        assertThat(answer).hasStatusOk();
        assertThat(map(answer).get("cardio")).isEqualTo(expected);
        assertThat(send("POST", account, "/v1/program/generate", Map.of("trainingDays", List.of("TUESDAY", "THURSDAY")))).hasStatusOk();
        profile(account, "LOSE_FAT", "INACTIVE");
        assertThat(cardio(account)).as("a new program and a new phase keep it").isEqualTo(expected);
    }

    @Test
    void cardioTurnedOffIsTheUsersOwnWithNoSessions() throws Exception {
        AccountId account = withAProgram("LOSE_FAT", "INACTIVE", MON_WED_FRI);

        assertThat(send("PUT", account, "/v1/program/cardio", Map.of("minutes", 30, "sessions", List.of()))).hasStatusOk();

        assertThat(cardio(account)).containsEntry("source", "USER").containsEntry("sessionsPerWeek", 0).containsEntry("sessions", List.of());
    }

    @Test
    void aCardioPlanThatCannotBeIsRefused() throws Exception {
        AccountId account = withAProgram("LOSE_FAT", "INACTIVE", MON_WED_FRI);
        Map<String, Object> noPlace = new HashMap<>(Map.of("weekday", "MONDAY"));
        noPlace.put("place", null);
        List<Map<String, Object>> bodies = List.of(Map.of("minutes", 0, "sessions", List.of()), Map.of("minutes", 601, "sessions", List.of()),
                Map.of("sessions", List.of()), Map.of("minutes", 30), Map.of("minutes", 30, "sessions", List.of(after("MONDAY"), after("MONDAY"))),
                Map.of("minutes", 30, "sessions", List.of(noPlace)));

        for (Map<String, Object> body : bodies) {
            assertThat(send("PUT", account, "/v1/program/cardio", body)).as(body.toString()).hasStatus(400).bodyJson().extractingPath("$.code")
                    .isEqualTo("VALIDATION_FAILED");
        }
        assertThat(cardio(account)).containsEntry("source", "GENERATED");
    }

    @Test
    void withoutAProgramThereIsNoCardioToSet() {
        assertThat(send("PUT", TestSessions.newAccount(), "/v1/program/cardio", Map.of("minutes", 30, "sessions", List.of()))).hasStatus(404);
    }

    @Test
    void theWeekCountsTheDaysWithCardioFromMondayToSunday() throws Exception {
        // Two sessions on one day are that day's session (a typed one and the watch's); last Sunday is last week's.
        AccountId account = withAProgram("LOSE_FAT", "INACTIVE", MON_WED_FRI);
        LocalDate lastSunday = CardioWeek.weekOf(TODAY).minusDays(1);

        assertThat(log(account, UUID.randomUUID(), TODAY, "MANUAL", null)).hasStatus(201);
        assertThat(log(account, UUID.randomUUID(), TODAY, "APPLE_HEALTH", null)).hasStatus(201);
        assertThat(log(account, UUID.randomUUID(), lastSunday, "MANUAL", null)).hasStatus(201);

        assertThat(cardio(account)).containsEntry("doneThisWeek", 1);
    }

    @Test
    void aSessionSentAgainIsStoredOnce() throws Exception {
        AccountId account = withAProgram("LOSE_FAT", "INACTIVE", MON_WED_FRI);
        UUID clientId = UUID.randomUUID();

        MvcTestResult first = log(account, clientId, TODAY, "MANUAL", null);
        MvcTestResult again = log(account, clientId, TODAY, "MANUAL", null);

        assertThat(first).hasStatus(201);
        assertThat(again).hasStatusOk();
        assertThat(map(again)).isEqualTo(map(first)).containsEntry("clientId", clientId.toString()).containsEntry("minutes", 30)
                .doesNotContainKey("activeEnergyKcal");
    }

    @Test
    void activeEnergyIsAWatchsReadingFromAppleHealthBehindTheHealthDataConsent() throws Exception {
        AccountId account = withAProgram("LOSE_FAT", "INACTIVE", MON_WED_FRI);

        assertThat(log(account, UUID.randomUUID(), TODAY, "APPLE_HEALTH", 280)).hasStatus(403).bodyJson().extractingPath("$.code")
                .isEqualTo("CONSENT_REQUIRED");
        assertThat(log(account, UUID.randomUUID(), TODAY, "MANUAL", 280)).as("typed calories are no measurement").hasStatus(400);
        consent(account);
        MvcTestResult measured = log(account, UUID.randomUUID(), TODAY, "APPLE_HEALTH", 280);

        assertThat(measured).hasStatus(201);
        assertThat(map(measured)).containsEntry("activeEnergyKcal", 280).containsEntry("source", "APPLE_HEALTH");
    }

    @Test
    void withdrawingTheHealthDataConsentClearsTheEnergyAndKeepsTheSession() throws Exception {
        AccountId account = withAProgram("LOSE_FAT", "INACTIVE", MON_WED_FRI);
        consent(account);
        assertThat(log(account, UUID.randomUUID(), TODAY, "APPLE_HEALTH", 280)).hasStatus(201);

        assertThat(mvc.delete().uri("/v1/consents/HEALTH_DATA?confirmDataDeletion=true").header("Authorization", TestSessions.bearer(context, account))
                .exchange()).hasStatusOk();

        assertThat(jdbc.sql("select active_energy_kcal from training.cardio_session where account_id = :a").param("a", account.value())
                .query((row, n) -> row.getObject("active_energy_kcal", Integer.class)).list()).containsExactly((Integer) null);
        assertThat(cardio(account)).as("training data stays (ADR-007)").containsEntry("doneThisWeek", 1);
    }

    @Test
    void cardioReachesNeitherTheFoodBudgetNorTheWeeklyConsistency() throws Exception {
        // ADR-074 #5 (K-30: cardio does not make up for the diet) and #6 (consistency counts weight sessions).
        AccountId account = withAProgram("LOSE_FAT", "INACTIVE", MON_WED_FRI);
        consent(account);
        assertThat(send("POST", account, "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", Instant.now().minusSeconds(60).toString(),
                "kg", 80.0, "source", "MANUAL"))).hasStatus(201);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :start, :start, 2600, false)""").param("a", account.value()).param("start", TODAY.minusDays(42)).update();
        MvcTestResult budgetBefore = send("GET", account, "/v1/days/" + TODAY + "/budget", null);
        MvcTestResult consistencyBefore = send("GET", account, "/v1/consistency", null);
        assertThat(budgetBefore).hasStatusOk();
        assertThat(map(budgetBefore)).containsEntry("targetKcal", 2600);

        assertThat(log(account, UUID.randomUUID(), TODAY, "APPLE_HEALTH", 450)).hasStatus(201);
        assertThat(log(account, UUID.randomUUID(), TODAY.minusDays(7), "MANUAL", null)).hasStatus(201);

        assertThat(map(send("GET", account, "/v1/days/" + TODAY + "/budget", null))).isEqualTo(map(budgetBefore));
        assertThat(map(send("GET", account, "/v1/consistency", null))).isEqualTo(map(consistencyBefore));
    }

    @Test
    void aSessionThatCannotBeIsRefused() {
        AccountId account = withAProgram("LOSE_FAT", "INACTIVE", MON_WED_FRI);
        consent(account);
        List<Map<String, Object>> bodies = List.of(session(Map.of("minutes", 0)), session(Map.of("minutes", 601)), session(Map.of("clientId", "")),
                session(Map.of("day", "")), session(Map.of("source", "")), session(Map.of("activeEnergyKcal", -1)),
                session(Map.of("activeEnergyKcal", 5001)), session(Map.of("day", "1800-01-01")));

        for (Map<String, Object> body : bodies) {
            assertThat(send("POST", account, "/v1/cardio-sessions", body)).as(body.toString()).hasStatus(400);
        }
    }

    /** A valid APPLE_HEALTH session today, the given fields changed; an empty string is the field left out. */
    private static Map<String, Object> session(Map<String, Object> changed) {
        Map<String, Object> body = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "day", TODAY.toString(), "minutes", 30,
                "source", "APPLE_HEALTH", "activeEnergyKcal", 280));
        body.putAll(changed);
        body.values().removeIf(""::equals);
        return body;
    }

    private MvcTestResult log(AccountId account, UUID clientId, LocalDate day, String source, Integer activeEnergyKcal) {
        Map<String, Object> body = new HashMap<>(Map.of("clientId", clientId, "day", day.toString(), "minutes", 30, "source", source));
        if (activeEnergyKcal != null) {
            body.put("activeEnergyKcal", activeEnergyKcal);
        }
        return send("POST", account, "/v1/cardio-sessions", body);
    }

    private AccountId withAProgram(String goal, String activity, List<String> trainingDays) {
        AccountId account = TestSessions.newAccount();
        profile(account, goal, activity);
        assertThat(send("POST", account, "/v1/program/generate", Map.of("trainingDays", trainingDays))).hasStatusOk();
        return account;
    }

    private void profile(AccountId account, String goal, String activity) {
        assertThat(send("PUT", account, "/v1/profile", Map.of("goal", goal, "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "activityLevel", activity, "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", MON_WED_FRI, "checkInDay", "MONDAY", "timeZone", "UTC")))).hasStatusOk();
    }

    private void consent(AccountId account) {
        assertThat(send("PUT", account, "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
    }

    private static Map<String, Object> after(String weekday) {
        return place(weekday, "AFTER_LIFT");
    }

    private static Map<String, Object> place(String weekday, String place) {
        return Map.of("weekday", weekday, "place", place);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> cardio(AccountId account) throws Exception {
        return (Map<String, Object>) program(account).get("cardio");
    }

    private Map<String, Object> program(AccountId account) throws Exception {
        MvcTestResult program = send("GET", account, "/v1/program", null);
        assertThat(program).hasStatusOk();
        return map(program);
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
