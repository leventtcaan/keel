package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.engine.Action;
import app.keel.engine.Confidence;
import app.keel.engine.CopyKey;
import app.keel.engine.Decision;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Phase;
import app.keel.engine.Reason;
import app.keel.engine.RuleId;
import app.keel.engine.SafetyNet;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import app.keel.engine.WeightSeries;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.profile.TestOnboarding;
import app.keel.shared.AccountId;
import app.keel.shared.ErrorCode;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
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
 * "Keep last week's plan" (K-963, ADR-077 #3, contract /v1/decisions/{id}/decline): the call stays on record and is not
 * applied (DECLINED); the next week reads the plan as it was; the call itself never changes (U2); "Use this call" applies
 * it after all. A call resting on the safety net is never declined (U13): CONFLICT.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class DecisionApplicationTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final LocalDate TODAY = LocalDate.now(ZoneOffset.UTC);
    private static final LocalDate PLAN_START = TODAY.minusDays(42);
    private static final LocalDate THIS_WEEK = CheckInWeek.weekOf(TODAY, DayOfWeek.MONDAY);
    private static final CallStore.Plan LAST_WEEKS_PLAN = new CallStore.Plan(Phase.CUT, PLAN_START, PLAN_START, 2600, false, null);

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    CallStore store;

    @Autowired
    ParameterSet parameters;

    @Autowired
    WeekLogs logs;

    @Test
    void aDeclinedCallStaysOnRecordUnchangedAndThePlanIsLastWeeks() throws Exception {
        AccountId account = onACut();
        UUID call = pending(account, new Action.AdjustCalories(-500));
        Map<String, Object> decided = store.byId(account, call).orElseThrow().decision();

        MvcTestResult declined = send(account, "POST", "/v1/decisions/" + call + "/decline");

        assertThat(declined).hasStatusOk();
        assertThat(map(declined)).containsEntry("targetKcal", 2600);
        assertThat(store.plan(account)).contains(LAST_WEEKS_PLAN);
        Map<String, Object> kept = map(send(account, "GET", "/v1/decisions/" + call));
        assertThat((Map<String, Object>) kept.get("application")).containsEntry("state", "DECLINED").containsKey("declinedAt")
                .doesNotContainKeys("appliedAt", "undoneAt");
        assertThat((Map<String, Object>) kept.get("action")).as("the call itself does not change (U2)")
                .containsEntry("type", "ADJUST_CALORIES").containsEntry("kcalPerDay", -500);
        assertThat(store.byId(account, call).orElseThrow().decision()).isEqualTo(decided);
        assertThat(send(account, "POST", "/v1/decisions/" + call + "/decline")).as("declined twice").hasStatusOk();
        assertThat(store.plan(account)).contains(LAST_WEEKS_PLAN);
    }

    @Test
    void declinedAfterTheDefaultWasAppliedThePlanGoesBackAsAnUndoWouldPutIt() throws Exception {
        AccountId account = onACut();
        UUID call = pending(account, new Action.AdjustCalories(-500));
        assertThat(map(send(account, "POST", "/v1/decisions/" + call + "/apply"))).containsEntry("targetKcal", 2100);

        MvcTestResult declined = send(account, "POST", "/v1/decisions/" + call + "/decline");

        assertThat(declined).hasStatusOk();
        assertThat(map(declined)).containsEntry("targetKcal", 2600);
        assertThat(store.plan(account)).contains(LAST_WEEKS_PLAN);
        assertThat((Map<String, Object>) map(send(account, "GET", "/v1/decisions/" + call)).get("application"))
                .containsEntry("state", "DECLINED").containsKeys("declinedAt", "appliedAt").doesNotContainKey("undoneAt");
        assertThat(map(send(account, "GET", "/v1/targets"))).containsEntry("targetKcal", 2600);
    }

    @Test
    void useThisCallAppliesTheDeclinedCallOnceAndItCanStillBeUndone() throws Exception {
        AccountId account = onACut();
        UUID call = pending(account, new Action.AdjustCalories(-500));
        send(account, "POST", "/v1/decisions/" + call + "/apply");
        send(account, "POST", "/v1/decisions/" + call + "/decline");

        MvcTestResult used = send(account, "POST", "/v1/decisions/" + call + "/apply");

        assertThat(used).hasStatusOk();
        assertThat(map(used)).as("the step lands once, on last week's plan").containsEntry("targetKcal", 2100);
        assertThat(store.plan(account)).contains(new CallStore.Plan(Phase.CUT, PLAN_START, TODAY, 2100, false, null));
        assertThat((Map<String, Object>) map(send(account, "GET", "/v1/decisions/" + call)).get("application"))
                .containsEntry("state", "APPLIED").containsKey("appliedAt").doesNotContainKey("declinedAt");
        assertThat(map(send(account, "POST", "/v1/decisions/" + call + "/apply"))).as("used twice").containsEntry("targetKcal", 2100);
        assertThat(map(send(account, "POST", "/v1/decisions/" + call + "/undo"))).containsEntry("targetKcal", 2600);
    }

    @Test
    void aPendingCallDeclinedIsUsedFromLastWeeksPlan() throws Exception {
        AccountId account = onACut();
        UUID call = pending(account, new Action.ChangeMovement());
        send(account, "POST", "/v1/decisions/" + call + "/decline");

        assertThat(map(send(account, "POST", "/v1/decisions/" + call + "/apply"))).containsEntry("stepsPerDay", steps(ParameterKey.STEPS_TARGET_RAISED));
        assertThat(store.byId(account, call).orElseThrow().application()).isEqualTo(CallStore.Application.APPLIED);
    }

    @Test
    void theNextWeekReadsADeclinedCallAsNotApplied() {
        // Last week's call, applied by default and then declined: this week's call judges last week's target, and the step
        // days are judged against last week's step target — as if it had never been applied.
        AccountId account = onACut();
        UUID calories = pending(account, new Action.AdjustCalories(-500), THIS_WEEK.minusWeeks(1), Instant.now().minusSeconds(7200));
        send(account, "POST", "/v1/decisions/" + calories + "/apply");
        assertThat(send(account, "POST", "/v1/decisions/" + calories + "/decline")).hasStatusOk();

        assertThat(send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "weekOf", THIS_WEEK.toString(),
                "answers", List.of()))).hasStatusOk();

        String snapshot = jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a and week_of = :week")
                .param("a", account.value()).param("week", THIS_WEEK).query(String.class).single();
        assertThat(JSON.readValue(snapshot, StoredSnapshot.class).energy().targetKcal()).isEqualTo(2600);
        assertThat(store.byId(account, calories).orElseThrow().application()).as("still on record, not applied")
                .isEqualTo(CallStore.Application.DECLINED);
    }

    @Test
    void aDeclinedStepTargetIsNotTheOneTheDaysAreJudgedBy() {
        AccountId account = onACut();
        UUID movement = pending(account, new Action.ChangeMovement());
        send(account, "POST", "/v1/decisions/" + movement + "/apply");
        send(account, "POST", "/v1/decisions/" + movement + "/decline");

        CallStore.Plan plan = store.plan(account).orElseThrow();
        assertThat(logs.stepTargets(account, plan, ZoneOffset.UTC, parameters.forSex(Sex.MALE)).apply(TODAY))
                .isEqualTo(steps(ParameterKey.STEPS_TARGET_START));
    }

    @Test
    void aCallRestingOnTheSafetyNetIsNeverDeclined() throws Exception {
        // U13: the hard stop (kept with its safety mark) and a call with a safety net rule among its reasons — pending or
        // applied, CONFLICT with the code's own words, and nothing moves. The applied state is written as apply would
        // leave it, not through apply: this test fails only over decline.
        CallStore.Plan safetyPlan = new CallStore.Plan(Phase.BULK, TODAY, TODAY, 2750, true, null);
        for (SafetyNetCall safety : List.of(new SafetyNetCall(new Action.HardStop(), "low_energy_safety"),
                new SafetyNetCall(new Action.IncreaseCalories(150), "loss_rate_cap"),
                new SafetyNetCall(new Action.IncreaseCalories(150), "bmr_floor"))) {
            assertThat(SafetyNet.RULES).contains(new RuleId(safety.rule()));
            AccountId account = onACut();
            UUID call = pending(account, safety.action(), List.of(new RuleId("calorie_ladder_step"), new RuleId(safety.rule())));

            MvcTestResult pendingDeclined = send(account, "POST", "/v1/decisions/" + call + "/decline");

            assertThat(pendingDeclined).as(safety.rule()).hasStatus(409);
            assertThat(map(pendingDeclined)).containsEntry("code", "CONFLICT").containsEntry("message", ErrorCode.CONFLICT.message());
            assertThat(store.byId(account, call).orElseThrow().application()).isEqualTo(CallStore.Application.PENDING);
            assertThat(store.plan(account)).contains(LAST_WEEKS_PLAN);
            assertThat(map(send(account, "GET", "/v1/decisions/" + call))).as(safety.rule()).containsEntry("declinable", false);

            assertThat(store.markApplied(account, call, Instant.now(), LAST_WEEKS_PLAN, safetyPlan)).isTrue();
            store.replace(account, safetyPlan);

            assertThat(send(account, "POST", "/v1/decisions/" + call + "/decline")).as(safety.rule() + " applied").hasStatus(409);
            assertThat(store.byId(account, call).orElseThrow().application()).isEqualTo(CallStore.Application.APPLIED);
            assertThat(store.plan(account)).contains(safetyPlan);
            assertThat(map(send(account, "GET", "/v1/decisions/" + call))).containsEntry("declinable", false);
        }
    }

    @Test
    void theCallSaysWhetherItCanBeDeclined() throws Exception {
        // Contract Decision.declinable: the server decides; the phone never reads the safety net's rules (K2).
        AccountId account = onACut();
        UUID older = pending(account, new Action.AdjustCalories(-500), THIS_WEEK.minusWeeks(1), Instant.now().minusSeconds(7200));
        UUID call = pending(account, new Action.AdjustCalories(-500));

        assertThat(map(send(account, "GET", "/v1/decisions/current"))).containsEntry("declinable", true);
        assertThat(map(send(account, "GET", "/v1/decisions/" + older))).as("history").containsEntry("declinable", false);
        List<Map<String, Object>> ledger = (List<Map<String, Object>>) map(send(account, "GET", "/v1/decisions")).get("items");
        assertThat(ledger).extracting(item -> item.get("declinable")).containsExactly(true, false);

        send(account, "POST", "/v1/decisions/" + call + "/apply");
        assertThat(map(send(account, "GET", "/v1/decisions/" + call))).as("applied by default").containsEntry("declinable", true);
        send(account, "POST", "/v1/decisions/" + call + "/decline");
        assertThat(map(send(account, "GET", "/v1/decisions/" + call))).as("declined already").containsEntry("declinable", false);

        AccountId holding = onACut();
        pending(holding, new Action.Continue());
        assertThat(map(send(holding, "GET", "/v1/decisions/current"))).as("changes nothing").containsEntry("declinable", false);
    }

    @Test
    void onlyTheLatestCallThatChangesSomethingIsDeclined() {
        AccountId account = onACut();
        UUID older = pending(account, new Action.AdjustCalories(-500), THIS_WEEK.minusWeeks(1), Instant.now().minusSeconds(7200));
        UUID hold = pending(account, new Action.Continue());

        assertThat(send(account, "POST", "/v1/decisions/" + older + "/decline")).as("history").hasStatus(409);
        assertThat(send(account, "POST", "/v1/decisions/" + hold + "/decline")).as("changes nothing (NOT_NEEDED)").hasStatus(409);
        assertThat(send(account, "POST", "/v1/decisions/" + UUID.randomUUID() + "/decline")).hasStatus(404);
        assertThat(store.byId(account, older).orElseThrow().application()).isEqualTo(CallStore.Application.PENDING);
        assertThat(store.byId(account, hold).orElseThrow().application()).isEqualTo(CallStore.Application.NOT_NEEDED);
    }

    @Test
    void anUndoneCallIsNotDeclinedAndADeclinedOneIsNotUndone() {
        AccountId account = onACut();
        UUID undone = pending(account, new Action.AdjustCalories(-500));
        send(account, "POST", "/v1/decisions/" + undone + "/apply");
        send(account, "POST", "/v1/decisions/" + undone + "/undo");
        assertThat(send(account, "POST", "/v1/decisions/" + undone + "/decline")).hasStatus(409);

        AccountId other = onACut();
        UUID declined = pending(other, new Action.AdjustCalories(-500));
        send(other, "POST", "/v1/decisions/" + declined + "/decline");
        assertThat(send(other, "POST", "/v1/decisions/" + declined + "/undo")).as("never applied now").hasStatus(409);
        assertThat(store.plan(other)).contains(LAST_WEEKS_PLAN);
    }

    @Test
    void anotherAccountsCallIsNotFoundAndDecliningNeedsTheConsent() {
        AccountId owner = onACut();
        UUID call = pending(owner, new Action.AdjustCalories(-500));

        assertThat(send(onACut(), "POST", "/v1/decisions/" + call + "/decline")).hasStatus(404);
        send(owner, "DELETE", "/v1/consents/HEALTH_DATA?confirmDataDeletion=true");
        assertThat(send(owner, "POST", "/v1/decisions/" + call + "/decline")).hasStatus(403);
    }

    @Test
    void aDeclinedLighterWeekLeavesTheProgramAsItWas() throws Exception {
        // The deload ladder's change is the program's (K-217): declined, it is gone as an undo takes it away.
        AccountId account = onACut();
        send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY")));
        UUID deload = pending(account, new Action.Deload(new BigDecimal("0.5")));
        assertThat(send(account, "POST", "/v1/decisions/" + deload + "/apply")).hasStatusOk();
        assertThat(map(send(account, "GET", "/v1/program"))).containsKey("deload");

        assertThat(send(account, "POST", "/v1/decisions/" + deload + "/decline")).hasStatusOk();

        assertThat(map(send(account, "GET", "/v1/program"))).doesNotContainKey("deload");
        assertThat(send(account, "POST", "/v1/decisions/" + deload + "/apply")).as("used after all").hasStatusOk();
        assertThat(map(send(account, "GET", "/v1/program"))).containsKey("deload");
    }

    private record SafetyNetCall(Action action, String rule) {
    }

    /** A male cut six weeks in, 2600 kcal, past the maintenance watch, one weigh-in today, training on Mondays. */
    private AccountId onACut() {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        TestOnboarding.finishedTwoWeeksAgo(context, account);
        assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", Instant.now().minusSeconds(60).toString(),
                "kg", 80.0, "source", "MANUAL")).getResponse().getStatus()).isLessThan(300);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :start, :start, 2600, false)""").param("a", account.value()).param("start", PLAN_START).update();
        return account;
    }

    private UUID pending(AccountId account, Action action) {
        return pending(account, action, THIS_WEEK, Instant.now(), List.of(new RuleId("r")));
    }

    private UUID pending(AccountId account, Action action, List<RuleId> rules) {
        return pending(account, action, THIS_WEEK, Instant.now(), rules);
    }

    private UUID pending(AccountId account, Action action, LocalDate weekOf, Instant at) {
        return pending(account, action, weekOf, at, List.of(new RuleId("r")));
    }

    /** A call as the engine would have kept it, made on the plan of 2600 kcal. */
    private UUID pending(AccountId account, Action action, LocalDate weekOf, Instant at, List<RuleId> rules) {
        Decision decision = new Decision(action, rules.stream().map(rule -> new Reason(rule, new Source("arastirma/x.md#1", SourceTag.LITERATURE))).toList(),
                Confidence.MEDIUM, TODAY.plusDays(7), new CopyKey("decision.continue"));
        CallStore.Call call = new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), weekOf, TODAY, at, parameters.versionHash(),
                StoredSnapshot.of(new Snapshot(TODAY, Sex.MALE, Phase.CUT, PLAN_START, new WeightSeries(List.of()))
                        .withEnergy(app.keel.engine.EnergyBudget.exerciseUnknown(2600))), DecisionJson.of(decision),
                DecisionService.application(decision));
        assertThat(store.keep(account, call)).isTrue();
        return call.id();
    }

    private int steps(ParameterKey key) {
        return parameters.forSex(Sex.MALE).wholeNumber(key);
    }

    private MvcTestResult send(AccountId account, String method, String uri) {
        return send(account, method, uri, null);
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

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
