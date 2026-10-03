package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.engine.DecisionPipeline;
import app.keel.engine.ParameterSet;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
 * The weekly check-in (K-212, ADR-003): the Snapshot is built from the modules' APIs, the engine makes the call, and
 * the call is kept with its Snapshot and the parameters' hash — the same Snapshot makes the same call again.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class DecisionServiceTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    ParameterSet parameters;

    @Autowired
    CallStore store;

    @Test
    void theFirstCheckInStartsThePlanAndKeepsTheCall() throws Exception {
        AccountId account = ready("LOSE_FAT");

        MvcTestResult result = answer(account, UUID.randomUUID(), thisWeek(), List.of());

        assertThat(result).hasStatusOk();
        Map<String, Object> call = map(result);
        assertThat(call).containsKeys("id", "madeOn", "action", "reasons", "confidence", "nextReview", "copyKey", "application");
        assertThat(call.get("madeOn")).isEqualTo(LocalDate.now(ZoneOffset.UTC).toString());
        Map<String, Object> plan = jdbc.sql("select phase, observing_maintenance, target_kcal from decision.plan where account_id = :a")
                .param("a", account.value()).query().singleRow();
        // LOSE_FAT is a cut; the target starts at the maintenance estimate, watched before it is judged (K-114).
        assertThat(plan).containsEntry("phase", "CUT").containsEntry("observing_maintenance", true);
        assertThat((Integer) plan.get("target_kcal")).isPositive();
        assertThat(jdbc.sql("select parameters_hash from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single()).isEqualTo(parameters.versionHash());
    }

    @Test
    void theSameAnswersSentAgainGetTheSameCallAndTheEngineDoesNotRunTwice() throws Exception {
        AccountId account = ready("LOSE_FAT");
        UUID clientId = UUID.randomUUID();

        Map<String, Object> first = map(answer(account, clientId, thisWeek(), List.of()));
        MvcTestResult again = answer(account, clientId, thisWeek(), List.of());

        assertThat(again).hasStatusOk();
        assertThat(map(again)).isEqualTo(first);
        assertThat(jdbc.sql("select count(*) from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(Integer.class).single()).isOne();
    }

    @Test
    void aWeekHasOneCallAndOnlyTheCurrentWeekIsAnswered() {
        AccountId account = ready("LOSE_FAT");
        answer(account, UUID.randomUUID(), thisWeek(), List.of());

        assertThat(answer(account, UUID.randomUUID(), thisWeek(), List.of())).as("a second call this week").hasStatus(409);
        assertThat(answer(ready("LOSE_FAT"), UUID.randomUUID(), thisWeek().minusWeeks(1), List.of())).as("last week").hasStatus(409);
        assertThat(answer(ready("LOSE_FAT"), UUID.randomUUID(), thisWeek().plusWeeks(1), List.of())).as("next week").hasStatus(409);
    }

    @Test
    void theCheckInNeedsItsConsentAProfileAndADirection() {
        AccountId noConsent = TestSessions.newAccount();
        assertThat(answer(noConsent, UUID.randomUUID(), thisWeek(), List.of())).hasStatus(403);

        AccountId noProfile = TestSessions.newAccount();
        send(noProfile, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        assertThat(answer(noProfile, UUID.randomUUID(), thisWeek(), List.of())).as("no profile yet").hasStatus(409);

        // DECIDE_FOR_ME (ADR-027 #17, K-222): the phase gate on the fat estimate; without one, a cut (G4 K-4).
        AccountId leftToTheEngine = ready("DECIDE_FOR_ME");
        assertThat(answer(leftToTheEngine, UUID.randomUUID(), thisWeek(), List.of())).hasStatus(200);
        assertThat(jdbc.sql("select phase from decision.plan where account_id = :a").param("a", leftToTheEngine.value()).query(String.class).single())
                .isEqualTo("CUT");
    }

    @Test
    void leftToTheEngineALeanBodyStartsBuilding() {
        // Look 1 for a man is 10 %, under the surplus line (12): the gate turns to building (ADR-027 #17).
        AccountId account = ready("DECIDE_FOR_ME");
        send(account, "POST", "/v1/body-looks", Map.of("clientId", UUID.randomUUID(), "takenOn", LocalDate.now(java.time.ZoneOffset.UTC).toString(),
                "level", 1));

        assertThat(answer(account, UUID.randomUUID(), thisWeek(), List.of())).hasStatus(200);
        assertThat(jdbc.sql("select phase from decision.plan where account_id = :a").param("a", account.value()).query(String.class).single())
                .isEqualTo("BULK");
    }

    @Test
    void anAnswerTheEngineCannotReadIsRefused() {
        AccountId account = ready("LOSE_FAT");

        assertThat(answer(account, UUID.randomUUID(), thisWeek(), List.of(Map.of("kind", "LOOK", "choice", "AMAZING")))).hasStatus(400);
    }

    @Test
    void theCycleQuestionIsNotTakenBeforeItIsAsked() {
        // V4: asked only to a woman in the low energy band, which needs the fat estimate (question 11). Taken from anyone,
        // it stopped a man's plan, and the stored call named the answer (K-212 review; storage: DURUM question 18).
        AccountId account = ready("LOSE_FAT");

        assertThat(answer(account, UUID.randomUUID(), thisWeek(), List.of(Map.of("kind", "CYCLE_STOPPED", "choice", "YES")))).hasStatus(400);
    }

    @Test
    void aBodyTheEngineCannotReadIsAConflictNotA500() {
        // Born this year: age 0, which the engine's Profile refuses (K-212 review). The profile API refuses it since K-225
        // (adults only), so it is written into the table: the check-in still must not 500 on a body it cannot read.
        AccountId baby = TestSessions.newAccount();
        send(baby, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        send(baby, "PUT", "/v1/profile", profile("LOSE_FAT", "MALE", 1996, "UTC", null));
        jdbc.sql("update profile.profile set birth_year = :year where account_id = :a").param("year", LocalDate.now(ZoneOffset.UTC).getYear())
                .param("a", baby.value()).update();

        assertThat(answer(baby, UUID.randomUUID(), thisWeek(), List.of())).hasStatus(409);
    }

    @Test
    void aPlanThatStartsAfterTodayIsAConflictNotA500() {
        // A time zone moved west after the plan began: the plan's first day is "tomorrow" on the new calendar.
        AccountId account = ready("LOSE_FAT");
        jdbc.sql("insert into decision.plan (account_id, phase, phase_start, plan_start, observing_maintenance) values (:a, 'CUT', :d, :d, true)")
                .param("a", account.value()).param("d", LocalDate.now(ZoneOffset.UTC).plusDays(1)).update();

        assertThat(answer(account, UUID.randomUUID(), thisWeek(), List.of())).hasStatus(409);
    }

    @Test
    void theDirectionTheSexAndTheBodyComeFromTheProfile() throws Exception {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        send(account, "PUT", "/v1/profile", profile("BUILD_MUSCLE", "FEMALE", 1990, "UTC", "ACTIVE"));
        weighIn(account, java.time.Instant.now().minusSeconds(3 * 86400), 60.2);
        weighIn(account, java.time.Instant.now().minusSeconds(3600), 61.0);

        answer(account, UUID.randomUUID(), thisWeek(), List.of());

        Map<String, Object> plan = jdbc.sql("select phase, target_kcal from decision.plan where account_id = :a").param("a", account.value()).query().singleRow();
        assertThat(plan).containsEntry("phase", "BULK");
        // The latest weigh-in, the age by birth year, the activity level: the maintenance estimate (K-114).
        int expected = app.keel.engine.InitialTarget.estimate(app.keel.engine.Sex.FEMALE, new java.math.BigDecimal("61.0"),
                new app.keel.engine.Profile(LocalDate.now(ZoneOffset.UTC).getYear() - 1990, 180),
                java.util.Optional.of(app.keel.engine.ActivityLevel.ACTIVE), parameters.forSex(app.keel.engine.Sex.FEMALE)).maintenanceKcal();
        assertThat(plan.get("target_kcal")).isEqualTo(expected);
        assertThat(storedSnapshot(account).sex()).isEqualTo(app.keel.engine.Sex.FEMALE);
    }

    @Test
    void anExistingPlanIsWhatTheEngineJudges() throws Exception {
        AccountId account = ready("LOSE_FAT");
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'BULK', :phase, :plan, 2900, false)""")
                .param("a", account.value()).param("phase", today.minusDays(60)).param("plan", today.minusDays(20)).update();

        answer(account, UUID.randomUUID(), thisWeek(), List.of());

        StoredSnapshot snapshot = storedSnapshot(account);
        assertThat(snapshot.phase()).isEqualTo(app.keel.engine.Phase.BULK);
        assertThat(snapshot.phaseStart()).isEqualTo(today.minusDays(60));
        assertThat(snapshot.planStart()).isEqualTo(today.minusDays(20));
        assertThat(snapshot.observingMaintenance()).isFalse();
    }

    @Test
    void theWeightsAreTheEvaluationWindow() throws Exception {
        AccountId account = ready("LOSE_FAT");
        int days = parameters.forSex(app.keel.engine.Sex.MALE).wholeNumber(app.keel.engine.ParameterKey.EVALUATION_WINDOW_DAYS);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        weighIn(account, today.minusDays(days - 1L).atStartOfDay(ZoneOffset.UTC).plusHours(12).toInstant(), 84.0);   // the window's first day
        weighIn(account, today.minusDays(days).atStartOfDay(ZoneOffset.UTC).plusHours(12).toInstant(), 85.0);        // the day before it

        answer(account, UUID.randomUUID(), thisWeek(), List.of());

        assertThat(storedSnapshot(account).weights()).extracting(StoredSnapshot.Weight::date)
                .contains(today.minusDays(days - 1L)).doesNotContain(today.minusDays(days));
    }

    @Test
    void todayIsTheUsersOwnDate() throws Exception {
        // Of UTC+14 and UTC-12, one is on another date than UTC at any moment: the call is made on that user's date.
        java.time.Instant now = java.time.Instant.now();
        String zone = LocalDate.ofInstant(now, java.time.ZoneId.of("Etc/GMT-14")).equals(LocalDate.ofInstant(now, ZoneOffset.UTC))
                ? "Etc/GMT+12" : "Etc/GMT-14";
        LocalDate theirs = LocalDate.ofInstant(now, java.time.ZoneId.of(zone));
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        Map<String, Object> profile = new java.util.HashMap<>(profile("LOSE_FAT", "MALE", 1996, zone, null));
        profile.put("schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", theirs.getDayOfWeek().name(), "timeZone", zone));
        send(account, "PUT", "/v1/profile", profile);

        MvcTestResult result = answer(account, UUID.randomUUID(), theirs, List.of());

        assertThat(result).hasStatusOk();
        assertThat(map(result)).containsEntry("madeOn", theirs.toString());
    }

    @Test
    void theCallsAreHealthDataAndGoWithTheConsent() throws Exception {
        AccountId account = ready("LOSE_FAT");
        String id = (String) map(answer(account, UUID.randomUUID(), thisWeek(), List.of())).get("id");

        send(account, "DELETE", "/v1/consents/HEALTH_DATA?confirmDataDeletion=true", null);

        assertThat(send(account, "GET", "/v1/decisions", null)).hasStatus(403);
        assertThat(send(account, "GET", "/v1/decisions/current", null)).hasStatus(403);
        assertThat(send(account, "GET", "/v1/decisions/" + id, null)).hasStatus(403);
    }

    @Test
    void theSameClientIdIsKeptOnce() {
        AccountId account = ready("LOSE_FAT");
        CallStore.Call call = new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), thisWeek(), LocalDate.now(ZoneOffset.UTC), java.time.Instant.now(),
                parameters.versionHash(), StoredSnapshot.of(new app.keel.engine.Snapshot(LocalDate.now(ZoneOffset.UTC), app.keel.engine.Sex.MALE,
                        app.keel.engine.Phase.CUT, LocalDate.now(ZoneOffset.UTC), new app.keel.engine.WeightSeries(List.of()))),
                Map.of("copyKey", "decision.continue"), CallStore.Application.NOT_NEEDED);

        assertThat(store.keep(account, call)).isTrue();
        assertThat(store.keep(account, new CallStore.Call(UUID.randomUUID(), call.clientId(), call.weekOf().minusWeeks(1), call.madeOn(),
                call.decidedAt(), call.parametersHash(), call.snapshot(), call.decision(), call.application()))).as("same clientId").isFalse();
    }

    @Test
    void theKeptSnapshotMakesTheSameCallAgain() throws Exception {
        // ADR-003 §6: a past call can be reproduced from what was kept.
        AccountId account = ready("LOSE_FAT");
        // No answers: since K-213 only the questions the week asked are answered, and a first check-in asks none.
        answer(account, UUID.randomUUID(), thisWeek(), List.of());
        Map<String, Object> kept = jdbc.sql("select snapshot::text as snapshot, decision::text as decision from decision.weekly_call where account_id = :a")
                .param("a", account.value()).query().singleRow();

        StoredSnapshot snapshot = JSON.readValue((String) kept.get("snapshot"), StoredSnapshot.class);
        Map<String, Object> again = DecisionJson.of(DecisionPipeline.decide(snapshot.toSnapshot(), parameters.forSex(snapshot.sex())));

        assertThat(JSON.readValue(JSON.writeValueAsString(again), Map.class)).isEqualTo(JSON.readValue((String) kept.get("decision"), Map.class));
    }

    @Test
    void theLedgerIsNewestFirstAndTheCurrentCallIsTheLatest() throws Exception {
        AccountId account = ready("LOSE_FAT");
        String latest = (String) map(answer(account, UUID.randomUUID(), thisWeek(), List.of())).get("id");
        // Two older calls, as earlier weeks would have left them.
        for (int weeks = 1; weeks <= 2; weeks++) {
            jdbc.sql("""
                    insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision, application)
                    select gen_random_uuid(), account_id, gen_random_uuid(), week_of - :days, made_on - :days, decided_at - make_interval(days => :days),
                           parameters_hash, snapshot, decision, application from decision.weekly_call where id = :id""")
                    .param("days", weeks * 7).param("id", UUID.fromString(latest)).update();
        }

        Map<String, Object> page = map(send(account, "GET", "/v1/decisions?limit=2", null));
        List<Map<String, Object>> items = (List<Map<String, Object>>) page.get("items");
        assertThat(items).hasSize(2).first().satisfies(call -> assertThat(call).containsEntry("id", latest));
        Map<String, Object> older = map(send(account, "GET", "/v1/decisions?limit=2&before=" + page.get("next"), null));
        assertThat((List<?>) older.get("items")).hasSize(1);
        assertThat(older).doesNotContainKey("next");
        assertThat(map(send(account, "GET", "/v1/decisions/current", null))).containsEntry("id", latest);
        assertThat(map(send(account, "GET", "/v1/decisions/" + latest, null))).containsEntry("id", latest);
        assertThat(send(ready("LOSE_FAT"), "GET", "/v1/decisions/" + latest, null)).as("someone else's").hasStatus(404);
    }

    @Test
    void aCallGoesOutWithTheKindOfItsSourcesAndKeepsTheirPathsOnTheServer() throws Exception {
        // K-523 (ADR-041 #72): the app is told what kind of source a reason rests on; where it is written down
        // (arastirma/…, which may name a person) stays with the kept call, for audit.
        AccountId account = ready("LOSE_FAT");
        UUID clientId = UUID.randomUUID();
        MvcTestResult answered = answer(account, clientId, thisWeek(), List.of());
        String id = (String) map(answered).get("id");
        // The answer's own reply, and the same answers sent again, are the call as sent too.
        for (MvcTestResult reply : List.of(answered, answer(account, clientId, thisWeek(), List.of()))) {
            assertThat(reply.getResponse().getContentAsString()).doesNotContain("arastirma/").contains("\"source\":{\"tag\":");
        }

        for (String path : List.of("/v1/decisions", "/v1/decisions/current", "/v1/decisions/" + id)) {
            MvcTestResult result = send(account, "GET", path, null);
            assertThat(result).hasStatusOk();
            assertThat(result.getResponse().getContentAsString()).as(path).doesNotContain("arastirma/").contains("\"source\":{\"tag\":");
        }
        String kept = jdbc.sql("select decision->'reasons'->0->'source'->>'reference' from decision.weekly_call where id = :id")
                .param("id", UUID.fromString(id)).query(String.class).single();
        assertThat(kept).startsWith("arastirma/");
    }

    @Test
    void whetherAHardStopHoldsIsReadWithoutTheCallsSnapshots() {
        // K-229 review: every week read the hold from each call of the last months; parsing their snapshots only to look
        // at the decision was a cost, and one unreadable snapshot would have made every week fail.
        AccountId account = TestSessions.newAccount();
        jdbc.sql("""
                insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision, application,
                    applied_at, plan_before, plan_after)
                values (:id, :a, :client, :week, :week, now(), 'h', cast('{}' as jsonb), cast(:decision as jsonb), 'APPLIED', now(),
                    cast('{}' as jsonb), cast('{}' as jsonb))""")
                .param("id", UUID.randomUUID()).param("a", account.value()).param("client", UUID.randomUUID()).param("week", thisWeek())
                .param("decision", "{\"action\": {\"type\": \"CHANGE_PHASE\", \"to\": \"BULK\"}, \"safety\": true}").update();

        List<CallStore.Outcome> outcomes = store.outcomes(account);

        assertThat(outcomes).singleElement().satisfies(outcome -> {
            assertThat(outcome.application()).isEqualTo(CallStore.Application.APPLIED);
            assertThat(outcome.decision()).containsEntry("safety", true);
        });
        assertThat(SafetyHolds.from(outcomes)).isTrue();
    }

    private AccountId ready(String goal) {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        send(account, "PUT", "/v1/profile", profile(goal, "MALE", 1996, "UTC", null));
        weighIn(account, java.time.Instant.now().minusSeconds(3600), 82.4);
        return account;
    }

    private static Map<String, Object> profile(String goal, String sex, int birthYear, String zone, String activity) {
        Map<String, Object> profile = new java.util.HashMap<>(Map.of("goal", goal, "sex", sex, "heightCm", 180, "birthYear", birthYear,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", zone)));
        if (activity != null) {
            profile.put("activityLevel", activity);
        }
        return profile;
    }

    private void weighIn(AccountId account, java.time.Instant at, double kg) {
        assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", at.toString(), "kg", kg,
                "source", "MANUAL")).getResponse().getStatus()).isLessThan(300);
    }

    private StoredSnapshot storedSnapshot(AccountId account) throws Exception {
        return JSON.readValue(jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single(), StoredSnapshot.class);
    }

    private static LocalDate thisWeek() {
        return CheckInWeek.weekOf(LocalDate.now(ZoneOffset.UTC), DayOfWeek.MONDAY);
    }

    private MvcTestResult answer(AccountId account, UUID clientId, LocalDate weekOf, List<Map<String, Object>> answers) {
        return send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", clientId, "weekOf", weekOf.toString(), "answers", answers));
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "PUT" -> mvc.put();
            case "DELETE" -> mvc.delete();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        }
        return request.exchange();
    }

    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
