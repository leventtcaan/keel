package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Action;
import app.keel.engine.Confidence;
import app.keel.engine.CopyKey;
import app.keel.engine.Decision;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Phase;
import app.keel.engine.Reason;
import app.keel.engine.RuleId;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import app.keel.engine.WeightSeries;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
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
 * Applying a call to the targets and taking it back (K-216, contract /v1/decisions/{id}/apply, /undo, /v1/targets): only
 * the one thing the call is about moves (U3), and when it was applied and undone is kept with the plan before it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class ApplyDecisionApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final LocalDate TODAY = LocalDate.now(ZoneOffset.UTC);
    private static final LocalDate PLAN_START = TODAY.minusDays(42);

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

    @Test
    void aCalorieCallMovesOnlyTheTargetAndIsKeptWithWhenItWasApplied() throws Exception {
        AccountId account = onACut();
        UUID call = pending(account, new Action.AdjustCalories(-500));

        Map<String, Object> targets = map(send(account, "POST", "/v1/decisions/" + call + "/apply"));

        assertThat(targets).containsEntry("targetKcal", 2100).containsEntry("stepsPerDay", steps(ParameterKey.STEPS_TARGET_START))
                .containsEntry("trainingSessionsPerWeek", 1)
                .containsKeys("proteinG", "carbsG", "fatG");
        assertThat(store.plan(account)).contains(new CallStore.Plan(Phase.CUT, PLAN_START, TODAY, 2100, false, null));
        Map<String, Object> application = (Map<String, Object>) map(send(account, "GET", "/v1/decisions/" + call)).get("application");
        assertThat(application).containsEntry("state", "APPLIED").containsKey("appliedAt").doesNotContainKey("undoneAt");
    }

    @Test
    void appliedTwiceTheTargetMovesOnce() throws Exception {
        AccountId account = onACut();
        UUID call = pending(account, new Action.AdjustCalories(-500));

        send(account, "POST", "/v1/decisions/" + call + "/apply");
        MvcTestResult again = send(account, "POST", "/v1/decisions/" + call + "/apply");

        assertThat(again).hasStatusOk();
        assertThat(map(again)).containsEntry("targetKcal", 2100);
    }

    @Test
    void twoAppliesAtTheSameMomentMoveTheTargetOnce() throws Exception {
        AccountId account = onACut();
        UUID call = pending(account, new Action.AdjustCalories(-500));
        CountDownLatch start = new CountDownLatch(1);
        Callable<Integer> apply = () -> {
            start.await();
            return send(account, "POST", "/v1/decisions/" + call + "/apply").getResponse().getStatus();
        };

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Integer> first = pool.submit(apply);
            Future<Integer> second = pool.submit(apply);
            start.countDown();
            assertThat(List.of(first.get(), second.get())).containsOnly(200);
        } finally {
            pool.shutdown();
        }

        assertThat(store.plan(account).orElseThrow().targetKcal()).isEqualTo(2100);
    }

    @Test
    void undoPutsThePlanBackAsItWasAndKeepsWhen() throws Exception {
        AccountId account = onACut();
        UUID call = pending(account, new Action.AdjustCalories(-500));
        send(account, "POST", "/v1/decisions/" + call + "/apply");

        MvcTestResult undone = send(account, "POST", "/v1/decisions/" + call + "/undo");

        assertThat(undone).hasStatusOk();
        assertThat(map(undone)).containsEntry("targetKcal", 2600);
        assertThat(store.plan(account)).contains(new CallStore.Plan(Phase.CUT, PLAN_START, PLAN_START, 2600, false, null));
        Map<String, Object> application = (Map<String, Object>) map(send(account, "GET", "/v1/decisions/" + call)).get("application");
        assertThat(application).containsEntry("state", "UNDONE").containsKeys("appliedAt", "undoneAt");
        assertThat(send(account, "POST", "/v1/decisions/" + call + "/undo")).as("undone twice").hasStatusOk();
        assertThat(send(account, "POST", "/v1/decisions/" + call + "/apply")).as("an undone call stays undone").hasStatus(409);
    }

    @Test
    void theUsersExportCarriesWhenACallWasAppliedAndThePlansAroundIt() throws Exception {
        AccountId account = onACut();
        UUID call = pending(account, new Action.AdjustCalories(-500));
        send(account, "POST", "/v1/decisions/" + call + "/apply");

        Map<String, Object> export = map(send(account, "GET", "/v1/account/export"));

        Map<String, Object> decision = (Map<String, Object>) ((Map<String, Object>) export.get("sections")).get("decision");
        assertThat((List<Map<String, Object>>) decision.get("calls")).singleElement().satisfies(kept -> {
            assertThat((Map<String, Object>) kept.get("application")).containsEntry("state", "APPLIED").containsKey("appliedAt");
            assertThat((Map<String, Object>) kept.get("planBefore")).containsEntry("targetKcal", 2600);
            assertThat((Map<String, Object>) kept.get("planAfter")).containsEntry("targetKcal", 2100);
        });
    }

    @Test
    void moreMovementRaisesOnlyTheStepTarget() throws Exception {
        AccountId account = onACut();
        UUID call = pending(account, new Action.ChangeMovement());

        assertThat(map(send(account, "POST", "/v1/decisions/" + call + "/apply"))).containsEntry("targetKcal", 2600)
                .containsEntry("stepsPerDay", steps(ParameterKey.STEPS_TARGET_RAISED));
        assertThat(store.plan(account)).contains(new CallStore.Plan(Phase.CUT, PLAN_START, PLAN_START, 2600, false, steps(ParameterKey.STEPS_TARGET_RAISED)));
    }

    @Test
    void onlyTheLatestCallThatChangesSomethingHereIsApplied() {
        AccountId account = onACut();
        UUID older = pending(account, new Action.AdjustCalories(-500), TODAY.minusWeeks(1), Instant.now().minusSeconds(3600));
        UUID deload = pending(account, new Action.Deload(new BigDecimal("0.5")));

        assertThat(send(account, "POST", "/v1/decisions/" + older + "/apply")).as("history").hasStatus(409);
        assertThat(send(account, "POST", "/v1/decisions/" + deload + "/apply")).as("the program's (K-217)").hasStatus(409);
        assertThat(send(account, "POST", "/v1/decisions/" + deload + "/undo")).as("never applied").hasStatus(409);
        assertThat(send(account, "POST", "/v1/decisions/" + UUID.randomUUID() + "/apply")).hasStatus(404);
        assertThat(store.plan(account).orElseThrow().targetKcal()).isEqualTo(2600);
    }

    @Test
    void theTargetsAreHealthDataAndStartWithTheFirstEstimate() throws Exception {
        AccountId account = onACut();
        assertThat(map(send(account, "GET", "/v1/targets"))).containsEntry("targetKcal", 2600);
        // The food budget reads the same target (K-209's DailyTargets, provided here).
        assertThat(map(send(account, "GET", "/v1/days/" + TODAY + "/budget"))).containsEntry("targetKcal", 2600);

        AccountId noPlan = ready();
        assertThat(send(noPlan, "GET", "/v1/targets")).hasStatus(404);
        send(account, "DELETE", "/v1/consents/HEALTH_DATA");
        assertThat(send(account, "GET", "/v1/targets")).hasStatus(403);
    }

    @Test
    void theEngineJudgesThePlansTargetWithTheExerciseNotKnown() {
        AccountId account = onACut();

        assertThat(send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "weekOf",
                CheckInWeek.weekOf(TODAY, java.time.DayOfWeek.MONDAY).toString(), "answers", List.of()))).hasStatusOk();

        String snapshot = jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single();
        assertThat(JSON.readValue(snapshot, StoredSnapshot.class).energy()).isEqualTo(new StoredSnapshot.Energy(2600, null));
    }

    /** A male cut six weeks in, 2600 kcal, past the maintenance watch, one weigh-in today, training on Mondays. */
    private AccountId onACut() {
        AccountId account = ready();
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :start, :start, 2600, false)""").param("a", account.value()).param("start", PLAN_START).update();
        return account;
    }

    private AccountId ready() {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"));
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt",
                Instant.now().minusSeconds(60).toString(), "kg", 80.0, "source", "MANUAL")).getResponse().getStatus()).isLessThan(300);
        return account;
    }

    private UUID pending(AccountId account, Action action) {
        return pending(account, action, CheckInWeek.weekOf(TODAY, java.time.DayOfWeek.MONDAY), Instant.now());
    }

    private UUID pending(AccountId account, Action action, LocalDate weekOf, Instant at) {
        Decision decision = new Decision(action, List.of(new Reason(new RuleId("r"), new Source("arastirma/x.md#1", SourceTag.LITERATURE))),
                Confidence.MEDIUM, TODAY.plusDays(7), new CopyKey("decision.continue"));
        CallStore.Call call = new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), weekOf, TODAY, at, parameters.versionHash(),
                StoredSnapshot.of(new Snapshot(TODAY, Sex.MALE, Phase.CUT, PLAN_START, new WeightSeries(List.of()))), DecisionJson.of(decision),
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
