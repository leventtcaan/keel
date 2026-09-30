package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.InitialTarget;
import app.keel.engine.ParameterSet;
import app.keel.engine.Profile;
import app.keel.engine.Sex;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
 * The week's check-in and its questions (K-213, contract /v1/check-ins/current): the engine runs on what the data says
 * — the week's photo check, the waist over the window — and asks only what it would wait for, each with its reason.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class CheckInQuestionsApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    ParameterSet parameters;

    @Test
    void aFirstCheckInWhileMaintenanceIsWatchedAsksNothing() throws Exception {
        // The engine's answer is "not yet: watching maintenance" whatever the answers would be (K-114): no question.
        AccountId account = ready();

        Map<String, Object> checkIn = map(send(account, "GET", "/v1/check-ins/current", null));

        assertThat(checkIn).containsEntry("weekOf", thisWeek().toString()).containsEntry("questions", List.of()).containsEntry("answered", false);
    }

    @Test
    void aCutThatLooksWorseAsksAboutTrainingAndRecoveryWithTheirReasons() throws Exception {
        // Losing weight but the week's photo looks worse: the spine waits for training, then recovery (03 §2.4).
        AccountId account = losingButLookingWorse();

        List<Map<String, Object>> questions = (List<Map<String, Object>>) map(send(account, "GET", "/v1/check-ins/current", null)).get("questions");

        assertThat(questions).extracting(question -> question.get("kind")).containsExactly("TRAINING", "RECOVERY");
        assertThat(questions.getFirst()).containsEntry("format", "CHOICE").containsEntry("choices", List.of("IMPROVING", "STABLE", "DECLINING"))
                .containsEntry("copyKey", "checkIn.question.training").containsEntry("reasonCopyKey", "checkIn.reason.training");
    }

    @Test
    void anAnswerToAQuestionNotAskedIsRefusedAndTheAskedOnesMakeTheCall() throws Exception {
        AccountId account = losingButLookingWorse();

        // LOOK comes from the photo check: an answer would overwrite what the data says. The engine never waits for it.
        assertThat(answer(account, List.of(Map.of("kind", "LOOK", "choice", "BETTER")))).hasStatus(400);
        MvcTestResult call = answer(account, List.of(Map.of("kind", "TRAINING", "choice", "DECLINING")));

        assertThat(call).hasStatusOk();
        assertThat((Map<String, Object>) map(call).get("action")).containsEntry("type", "FIX_TRAINING");
        assertThat(map(send(account, "GET", "/v1/check-ins/current", null))).containsEntry("answered", true).containsEntry("questions", List.of());
    }

    @Test
    void bothQuestionsAskedAreTakenAndMakeTheCall() throws Exception {
        AccountId account = losingButLookingWorse();

        MvcTestResult call = answer(account, List.of(Map.of("kind", "TRAINING", "choice", "STABLE"), Map.of("kind", "RECOVERY", "choice", "POOR")));

        assertThat(call).hasStatusOk();
        assertThat((Map<String, Object>) map(call).get("action")).containsEntry("type", "FIX_RECOVERY");
    }

    @Test
    void anAnswerTheEngineCanWaitForIsTakenEvenWhenTheDataChangedSinceTheQuestions() throws Exception {
        // Asked nothing (maintenance is watched), answered anyway — as a question shown before a new weigh-in or midnight
        // would be (K-213 review): taken, not 400.
        AccountId account = ready();
        assertThat(map(send(account, "GET", "/v1/check-ins/current", null))).containsEntry("questions", List.of());

        assertThat(answer(account, List.of(Map.of("kind", "TRAINING", "choice", "STABLE")))).hasStatusOk();
    }

    @Test
    void aRefusedAnswerLeavesNoPlanBehind() {
        AccountId account = ready();

        assertThat(answer(account, List.of(Map.of("kind", "LOOK", "choice", "SAME")))).hasStatus(400);

        assertThat(jdbc.sql("select count(*) from decision.plan where account_id = :a").param("a", account.value()).query(Integer.class).single())
                .isZero();
    }

    @Test
    void theWeeksPhotoWindowStartsSevenDaysBeforeItsCheckInDay() throws Exception {
        LocalDate weekOf = thisWeek();
        AccountId outside = losingWithAPhotoOn(weekOf.minusDays(7));
        AccountId inside = losingWithAPhotoOn(weekOf.minusDays(6));

        assertThat(map(send(outside, "GET", "/v1/check-ins/current", null))).containsEntry("questions", List.of());
        assertThat((List<Map<String, Object>>) map(send(inside, "GET", "/v1/check-ins/current", null)).get("questions"))
                .extracting(question -> question.get("kind")).containsExactly("TRAINING", "RECOVERY");
    }

    @Test
    void aWeekOverlappingTheLastCallIsAnsweredForTheQuestionsAsForTheAnswers() throws Exception {
        // Checked in this week on Monday, then the check-in day moved to today: no second call this week (K-212), and the
        // check-in says so instead of asking questions whose answers would all get CONFLICT (K-213 review).
        AccountId account = ready();
        assertThat(answer(account, List.of())).hasStatusOk();
        DayOfWeek today = LocalDate.now(ZoneOffset.UTC).getDayOfWeek();
        send(account, "PUT", "/v1/profile", profile(today));
        LocalDate movedWeek = CheckInWeek.weekOf(LocalDate.now(ZoneOffset.UTC), today);

        assertThat(map(send(account, "GET", "/v1/check-ins/current", null))).containsEntry("weekOf", movedWeek.toString())
                .containsEntry("answered", true).containsEntry("questions", List.of());
        assertThat(send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "weekOf", movedWeek.toString(),
                "answers", List.of()))).hasStatus(409);
    }

    @Test
    void theAdherenceIsCountedFromTheWeeksLogs() throws Exception {
        // K-220: training on Mondays (1 a week), weighed every day (4 a week asked), no food or steps logged — so neither
        // planned. One workout in the window's first week: (1 + 4 × weeks) done of 5 × weeks planned.
        AccountId account = losingButLookingWorse();
        List<LocalDate> weeks = WeekTallies.weeks(LocalDate.now(ZoneOffset.UTC), 21);
        assertThat(send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt",
                weeks.getFirst().atTime(10, 0).toInstant(ZoneOffset.UTC).toString())).getResponse().getStatus()).isLessThan(300);

        answer(account, List.of(Map.of("kind", "TRAINING", "choice", "STABLE"), Map.of("kind", "RECOVERY", "choice", "GOOD")));

        String snapshot = jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single();
        assertThat(JSON.readValue(snapshot, StoredSnapshot.class).checkIn().adherence())
                .isEqualByComparingTo(java.math.BigDecimal.valueOf(1 + 4L * weeks.size()).divide(java.math.BigDecimal.valueOf(5L * weeks.size()),
                        java.math.MathContext.DECIMAL64));
    }

    @Test
    void theFatEstimateKeepsTheLookAndTheWaistAndStaysInside() throws Exception {
        // K-224: a man of 180 cm picks look 3 (10 + 2 × 5 = 20 %); his waist of 90 cm gives RFM 64 − 20 × 2 = 24 %: the
        // engine keeps 20 as the lower and 24 as the higher (K-224 review). The call the app gets carries no percent (U4).
        AccountId account = ready();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        waist(account, today, 90.0);
        assertThat(send(account, "POST", "/v1/body-looks", Map.of("clientId", UUID.randomUUID(), "takenOn", today.toString(), "level", 3))
                .getResponse().getStatus()).isLessThan(300);

        MvcTestResult call = answer(account, List.of());

        String snapshot = jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single();
        assertThat(JSON.readValue(snapshot, StoredSnapshot.class).fatProxyPct()).isEqualByComparingTo("20");
        assertThat(JSON.readValue(snapshot, StoredSnapshot.class).fatProxyHighPct()).isEqualByComparingTo("24");
        assertThat(call.getResponse().getContentAsString()).doesNotContainIgnoringCase("fatProxy").doesNotContain("\"20\"");
    }

    @Test
    void aWaistTypedWrongLeavesTheLookAlone() throws Exception {
        // K-224 review: 9 typed for 90 is RFM −336 % — no body — so the engine reads the look only, not a fat-free mass
        // larger than the man.
        AccountId account = ready();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        waist(account, today, 9.0);
        assertThat(send(account, "POST", "/v1/body-looks", Map.of("clientId", UUID.randomUUID(), "takenOn", today.toString(), "level", 3))
                .getResponse().getStatus()).isLessThan(300);

        answer(account, List.of());

        StoredSnapshot kept = JSON.readValue(jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a")
                .param("a", account.value()).query(String.class).single(), StoredSnapshot.class);
        assertThat(kept.fatProxyPct()).isEqualByComparingTo("20");
        assertThat(kept.fatProxyHighPct()).isEqualByComparingTo("20");
    }

    @Test
    void aWomanOnAPlanTooLowIsAskedAboutHerCycleFirst() throws Exception {
        // V4 (K-222): 60 kg at look 3 (30 %) is 42 kg fat-free; 1200 kcal is 28.6 per kg, under her line (30): low.
        AccountId account = womanOnALowPlan();

        List<Map<String, Object>> questions = (List<Map<String, Object>>) map(send(account, "GET", "/v1/check-ins/current", null)).get("questions");

        assertThat(questions).isNotEmpty();
        assertThat(questions.getFirst()).containsEntry("kind", "CYCLE_STOPPED").containsEntry("choices", List.of("YES", "NO"))
                .containsEntry("copyKey", "checkIn.question.cycle_stopped");
    }

    @Test
    void herYesIsTheHardStopUnderAGeneralLabelAndItsApplyingEndsTheDeficit() throws Exception {
        // ADR-020 L-1, ADR-027 #18: the call is kept, its reason a general label; the answer leaves no trace. Applied, the
        // plan turns to building at no less than maintenance, watched (K-222).
        AccountId account = womanOnALowPlan();

        MvcTestResult call = answer(account, List.of(Map.of("kind", "CYCLE_STOPPED", "choice", "YES")));

        assertThat(call.getResponse().getStatus()).isEqualTo(200);
        Map<String, Object> made = map(call);
        // K-228 (ADR-028 #24): shown and kept as its change of phase with the safety mark — the kind would give the
        // answer away; nothing names the hard stop.
        assertThat((Map<String, Object>) made.get("action")).isEqualTo(Map.of("type", "CHANGE_PHASE", "to", "BULK"));
        assertThat(made).containsEntry("safety", true).containsEntry("copyKey", "decision.change_phase.low_energy_safety");
        assertThat(call.getResponse().getContentAsString()).contains("low_energy_safety").doesNotContainIgnoringCase("menstrual")
                .doesNotContainIgnoringCase("cycle").doesNotContainIgnoringCase("hard_stop");
        String kept = jdbc.sql("select decision::text || snapshot::text from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single();
        assertThat(kept).doesNotContainIgnoringCase("menstrual").doesNotContainIgnoringCase("cycle").doesNotContainIgnoringCase("hard_stop");

        assertThat(send(account, "POST", "/v1/decisions/" + made.get("id") + "/apply", null).getResponse().getStatus()).isEqualTo(200);
        Map<String, Object> plan = jdbc.sql("select phase, observing_maintenance, target_kcal from decision.plan where account_id = :a")
                .param("a", account.value()).query().singleRow();
        assertThat(plan).containsEntry("phase", "BULK").containsEntry("observing_maintenance", true);
        // The maintenance estimate at her weight, height and age (K-114), not just any number above the old target.
        int maintenance = InitialTarget.estimate(Sex.FEMALE, new BigDecimal("60.0"),
                new Profile(LocalDate.now(ZoneOffset.UTC).getYear() - 1996, 165), Optional.empty(),
                parameters.forSex(Sex.FEMALE)).maintenanceKcal();
        assertThat((Integer) plan.get("target_kcal")).isEqualTo(Math.max(1200, maintenance));

        // Not taken back (ADR-020 L-1), and the export — plans before and after included — carries no trace either.
        assertThat(send(account, "POST", "/v1/decisions/" + made.get("id") + "/undo", null).getResponse().getStatus()).isEqualTo(409);
        String export = send(account, "GET", "/v1/account/export", null).getResponse().getContentAsString();
        assertThat(export).contains("low_energy_safety").doesNotContainIgnoringCase("menstrual").doesNotContainIgnoringCase("cycle")
                .doesNotContainIgnoringCase("hard_stop");
    }

    @Test
    void aHardStopWithNoWeighInInTheWindowStillEndsTheDeficit() throws Exception {
        // K-222 review: with the last weigh-in older than the evaluation window, the maintenance estimate comes from that
        // last known weight — not "no estimate, the cut target stays".
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"));
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "FEMALE", "heightCm", 165, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        weighIn(account, today.minusDays(120).atStartOfDay(ZoneOffset.UTC).plusHours(6).toInstant(), 60.0);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :start, :start, 1200, false)""").param("a", account.value()).param("start", today.minusDays(42)).update();

        MvcTestResult call = answer(account, List.of(Map.of("kind", "CYCLE_STOPPED", "choice", "YES")));
        assertThat(map(call)).containsEntry("safety", true); // the hard stop, kept as its change of phase (K-228)
        assertThat(send(account, "POST", "/v1/decisions/" + map(call).get("id") + "/apply", null).getResponse().getStatus()).isEqualTo(200);

        int maintenance = InitialTarget.estimate(Sex.FEMALE, new BigDecimal("60.0"), new Profile(today.getYear() - 1996, 165), Optional.empty(),
                parameters.forSex(Sex.FEMALE)).maintenanceKcal();
        assertThat(jdbc.sql("select target_kcal from decision.plan where account_id = :a").param("a", account.value()).query(Integer.class).single())
                .isEqualTo(Math.max(1200, maintenance));
    }

    @Test
    void afterAHardStopACutWaitsForTheCycleQuestionAndItIsAsked() throws Exception {
        // K-229, ADR-028 #23: the gate would turn her to a cut; before any deficit opens again, the question comes back.
        AccountId account = womanHeldAfterAHardStop();

        List<Map<String, Object>> questions = (List<Map<String, Object>>) map(send(account, "GET", "/v1/check-ins/current", null)).get("questions");
        assertThat(questions).extracting(question -> question.get("kind")).contains("CYCLE_STOPPED");
        Map<String, Object> made = map(answer(account, List.of()));
        assertThat((Map<String, Object>) made.get("action")).containsEntry("type", "NO_DECISION_YET");
        assertThat(made).containsEntry("copyKey", "decision.no_decision_yet.cycle_check_needed");
        String kept = jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a and week_of = :w")
                .param("a", account.value()).param("w", thisWeek()).query(String.class).single();
        assertThat(kept).contains("\"safetyHold\": true").doesNotContainIgnoringCase("resolved").doesNotContainIgnoringCase("cycle");
    }

    @Test
    void afterAHardStopNotStoppedLetsTheCutThrough() throws Exception {
        AccountId account = womanHeldAfterAHardStop();

        Map<String, Object> made = map(answer(account, List.of(Map.of("kind", "CYCLE_STOPPED", "choice", "NO"))));

        assertThat((Map<String, Object>) made.get("action")).isEqualTo(Map.of("type", "CHANGE_PHASE", "to", "CUT"));
        assertThat(made).doesNotContainKey("safety");
        String kept = jdbc.sql("select decision::text || snapshot::text from decision.weekly_call where account_id = :a and week_of = :w")
                .param("a", account.value()).param("w", thisWeek()).query(String.class).single();
        assertThat(kept).doesNotContainIgnoringCase("resolved").doesNotContainIgnoringCase("cycle");
    }

    @Test
    void afterAHardStopStillStoppedIsTheHardStopAgain() throws Exception {
        AccountId account = womanHeldAfterAHardStop();

        Map<String, Object> made = map(answer(account, List.of(Map.of("kind", "CYCLE_STOPPED", "choice", "YES"))));

        assertThat(made).containsEntry("safety", true);
    }

    @Test
    void aWomanNotInTheLowBandOrWithoutAnEstimateIsNotAskedAboutHerCycle() throws Exception {
        // V4: only in the low band — the answer is special-category data (GDPR Art. 9), not asked of every woman.
        AccountId fed = womanOnALowPlan();
        jdbc.sql("update decision.plan set target_kcal = 2000 where account_id = :a").param("a", fed.value()).update();
        AccountId noEstimate = womanOnALowPlan();
        jdbc.sql("delete from measurement.body_look where account_id = :a").param("a", noEstimate.value()).update();

        for (AccountId account : List.of(fed, noEstimate)) {
            List<Map<String, Object>> questions = (List<Map<String, Object>>) map(send(account, "GET", "/v1/check-ins/current", null)).get("questions");
            assertThat(questions).extracting(question -> question.get("kind")).doesNotContain("CYCLE_STOPPED");
        }
    }

    @Test
    void herNoMakesTheUsualCallAndAMansAnswerIsRefused() throws Exception {
        MvcTestResult no = answer(womanOnALowPlan(), List.of(Map.of("kind", "CYCLE_STOPPED", "choice", "NO")));
        assertThat(no.getResponse().getStatus()).isEqualTo(200);
        assertThat((Map<String, Object>) map(no).get("action")).containsEntry("type", "INCREASE_CALORIES");

        assertThat(answer(losingButLookingWorse(), List.of(Map.of("kind", "CYCLE_STOPPED", "choice", "YES"))).getResponse().getStatus()).isEqualTo(400);
    }

    @Test
    void theWaistComesFromItsMeasurements() throws Exception {
        AccountId account = ready();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        waist(account, today.minusDays(14), 92.0);
        waist(account, today, 89.5);

        answer(account, List.of());

        String snapshot = jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single();
        assertThat(JSON.readValue(snapshot, StoredSnapshot.class).checkIn().waist()).isEqualTo(app.keel.engine.CheckIn.Waist.DOWN);
    }

    @Test
    void theCheckInIsHealthDataAndNeedsAProfile() {
        assertThat(send(TestSessions.newAccount(), "GET", "/v1/check-ins/current", null)).hasStatus(403);
        AccountId noProfile = TestSessions.newAccount();
        send(noProfile, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"));
        assertThat(send(noProfile, "GET", "/v1/check-ins/current", null)).hasStatus(409);
    }

    /**
     * A cut past its observation: four weeks of daily weigh-ins going down 0.1 kg a day, the plan six weeks old, and a
     * photo check this week that looks worse.
     */
    private AccountId losingButLookingWorse() {
        return losingWithAPhotoOn(LocalDate.now(ZoneOffset.UTC));
    }

    private AccountId losingWithAPhotoOn(LocalDate takenOn) {
        AccountId account = ready(false);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :start, :start, 2300, false)""").param("a", account.value()).param("start", today.minusDays(42)).update();
        for (int day = 28; day >= 0; day--) {
            Instant at = today.minusDays(day).atStartOfDay(ZoneOffset.UTC).plusHours(6).toInstant();
            if (at.isBefore(Instant.now())) {
                weighIn(account, at, 86.0 - 0.1 * (28 - day));
            }
        }
        assertThat(send(account, "POST", "/v1/photo-checks", Map.of("clientId", UUID.randomUUID(), "takenOn", takenOn.toString(), "look", "WORSE"))
                .getResponse().getStatus()).isLessThan(300);
        return account;
    }

    private AccountId ready() {
        return ready(true);
    }

    /** A woman of 60 kg who picked look 3 (30 %), on a 1200 kcal cut: energy availability in the low band. */
    /**
     * A woman whose hard stop was applied weeks ago (K-229): the plan builds at 2200 kcal, her estimate is over the bulk
     * ceiling (the reference look at its fullest), so the phase gate would turn her to a cut — a deficit again.
     */
    private AccountId womanHeldAfterAHardStop() {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"));
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "FEMALE", "heightCm", 165, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'BULK', :start, :start, 2200, false)""").param("a", account.value()).param("start", today.minusDays(42)).update();
        String plan = "{\"phase\":\"BULK\",\"phaseStart\":\"" + today.minusDays(42) + "\",\"planStart\":\"" + today.minusDays(42)
                + "\",\"targetKcal\":2200,\"observingMaintenance\":true,\"stepsPerDay\":null}";
        jdbc.sql("""
                insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision,
                    application, applied_at, plan_before, plan_after)
                values (:id, :a, :client, :week, :week, :at, 'h', cast(:snapshot as jsonb), cast(:decision as jsonb), 'APPLIED', :at,
                    cast(:plan as jsonb), cast(:plan as jsonb))""")
                .param("id", UUID.randomUUID()).param("a", account.value()).param("client", UUID.randomUUID())
                .param("week", thisWeek().minusWeeks(6)).param("at", java.time.OffsetDateTime.now(ZoneOffset.UTC).minusWeeks(6))
                .param("plan", plan)
                // A snapshot as a real call keeps it (the ledger and the week's logs read every call's).
                .param("snapshot", "{\"today\":\"" + thisWeek().minusWeeks(6) + "\",\"sex\":\"FEMALE\",\"phase\":\"CUT\",\"planStart\":\""
                        + today.minusDays(90) + "\",\"weights\":[],\"fatProxyPct\":null,\"energy\":null,\"checkIn\":{\"look\":\"UNKNOWN\","
                        + "\"training\":\"UNKNOWN\",\"recovery\":\"UNKNOWN\",\"waist\":\"UNKNOWN\",\"adherence\":null,\"appetite\":\"UNKNOWN\"},"
                        + "\"profile\":null,\"observingMaintenance\":false,\"phaseStart\":\"" + today.minusDays(90)
                        + "\",\"training\":null,\"fatProxyHighPct\":null,\"safetyHold\":false}")
                .param("decision", """
                        {"action": {"type": "CHANGE_PHASE", "to": "BULK"}, "safety": true, "confidence": "HIGH", "nextReview": "2026-01-01",
                         "copyKey": "decision.change_phase.low_energy_safety",
                         "reasons": [{"rule": "low_energy_safety", "source": {"reference": "arastirma/ham/J1-cinsiyet.md#C6", "tag": "LITERATURE"}}]}""")
                .update();
        for (int day = 28; day >= 0; day--) {
            Instant at = today.minusDays(day).atStartOfDay(ZoneOffset.UTC).plusHours(6).toInstant();
            if (at.isBefore(Instant.now())) {
                weighIn(account, at, 60.0);
            }
        }
        assertThat(send(account, "POST", "/v1/body-looks", Map.of("clientId", UUID.randomUUID(), "takenOn", today.toString(), "level", 7))
                .getResponse().getStatus()).isLessThan(300);
        return account;
    }

    private AccountId womanOnALowPlan() {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"));
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "FEMALE", "heightCm", 165, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :start, :start, 1200, false)""").param("a", account.value()).param("start", today.minusDays(42)).update();
        for (int day = 28; day >= 0; day--) {
            Instant at = today.minusDays(day).atStartOfDay(ZoneOffset.UTC).plusHours(6).toInstant();
            if (at.isBefore(Instant.now())) {
                weighIn(account, at, 60.0);
            }
        }
        assertThat(send(account, "POST", "/v1/body-looks", Map.of("clientId", UUID.randomUUID(), "takenOn", today.toString(), "level", 3))
                .getResponse().getStatus()).isLessThan(300);
        return account;
    }

    private AccountId ready(boolean oneWeighIn) {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"));
        send(account, "PUT", "/v1/profile", profile(DayOfWeek.MONDAY));
        if (oneWeighIn) {
            weighIn(account, Instant.now().minusSeconds(3600), 82.4);
        }
        return account;
    }

    private static Map<String, Object> profile(DayOfWeek checkInDay) {
        return Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996, "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", checkInDay.name(), "timeZone", "UTC"));
    }

    private void weighIn(AccountId account, Instant at, double kg) {
        assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", at.toString(),
                "kg", Math.round(kg * 10) / 10.0, "source", "MANUAL")).getResponse().getStatus()).isLessThan(300);
    }

    private void waist(AccountId account, LocalDate day, double cm) {
        assertThat(send(account, "POST", "/v1/waist-measurements", Map.of("clientId", UUID.randomUUID(), "measuredOn", day.toString(), "cm", cm))
                .getResponse().getStatus()).isLessThan(300);
    }

    private static LocalDate thisWeek() {
        return CheckInWeek.weekOf(LocalDate.now(ZoneOffset.UTC), DayOfWeek.MONDAY);
    }

    private MvcTestResult answer(AccountId account, List<Map<String, Object>> answers) {
        return send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "weekOf", thisWeek().toString(),
                "answers", answers));
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
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

    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
