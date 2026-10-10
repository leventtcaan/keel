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
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import app.keel.engine.WeightSeries;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.profile.TestOnboarding;
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
        assertThat(map(send(account, "GET", "/v1/days/" + TODAY + "/budget"))).as("the food budget reads the plan as it is now")
                .containsEntry("targetKcal", 2100);
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
        assertThat(store.byId(account, call).orElseThrow().planBefore().targetKcal()).as("the plan before is the one before either").isEqualTo(2600);
    }

    @Test
    void onlyAPendingCallBecomesAppliedAndOnlyAnAppliedOneUndone() {
        // The guard two requests at once rely on (K-216 review): the second one finds the state already moved.
        AccountId account = onACut();
        UUID call = pending(account, new Action.AdjustCalories(-500));
        CallStore.Plan before = store.plan(account).orElseThrow();
        CallStore.Plan after = new CallStore.Plan(Phase.CUT, PLAN_START, TODAY, 2100, false, null);

        assertThat(store.markUndone(account, call, Instant.now())).as("never applied").isFalse();
        assertThat(store.markApplied(account, call, Instant.now(), before, after)).isTrue();
        Instant appliedAt = store.byId(account, call).orElseThrow().appliedAt();
        assertThat(store.markApplied(account, call, Instant.now().plusSeconds(60), after, after)).as("applied already").isFalse();
        assertThat(store.byId(account, call).orElseThrow().appliedAt()).isEqualTo(appliedAt);
        assertThat(store.markUndone(account, call, Instant.now())).isTrue();
        assertThat(store.markUndone(account, call, Instant.now())).as("undone already").isFalse();
    }

    @Test
    void anOlderCallIsNotUndoneOverANewerOne() throws Exception {
        // Undo writes the plan before the call over the whole plan: over a newer call it would erase what that one did.
        AccountId account = onACut();
        UUID older = pending(account, new Action.AdjustCalories(-500), TODAY.minusWeeks(1), Instant.now().minusSeconds(3600));
        assertThat(send(account, "POST", "/v1/decisions/" + older + "/apply")).hasStatusOk();
        pending(account, new Action.Continue());

        assertThat(send(account, "POST", "/v1/decisions/" + older + "/undo")).hasStatus(409);
        assertThat(store.plan(account).orElseThrow().targetKcal()).isEqualTo(2100);
        assertThat(store.byId(account, older).orElseThrow()).satisfies(call -> {
            assertThat(call.application()).isEqualTo(CallStore.Application.APPLIED);
            assertThat(call.undoneAt()).isNull();
        });
    }

    @Test
    void aCallIsAppliedEvenWhenNoMacroSplitFitsItsTargetAndTheTargetsSaySo() throws Exception {
        // 1300 − 500 = 800 kcal at 80 kg holds neither 2 g/kg protein nor the fat floor (K-108). An approved call is not
        // refused over how the targets are shown (K-216 review): applied, carbs and fat left out.
        AccountId account = onAPlanOf(1300);
        UUID call = pending(account, new Action.AdjustCalories(-500), 1300);

        Map<String, Object> targets = map(send(account, "POST", "/v1/decisions/" + call + "/apply"));

        assertThat(targets).containsEntry("targetKcal", 800).containsEntry("proteinG", 160).doesNotContainKeys("carbsG", "fatG");
        assertThat(map(send(account, "POST", "/v1/decisions/" + call + "/undo"))).containsEntry("targetKcal", 1300);
    }

    @Test
    void aCallMadeOnAnotherTargetIsNotApplied() {
        // The call judged 2600; the plan now holds 2400 (a call applied while this one was being made): its step would
        // land twice (K-216 review). CONFLICT, nothing moves.
        AccountId account = onAPlanOf(2400);
        UUID call = pending(account, new Action.AdjustCalories(-500), 2600);

        assertThat(send(account, "POST", "/v1/decisions/" + call + "/apply")).hasStatus(409);
        assertThat(store.plan(account).orElseThrow().targetKcal()).isEqualTo(2400);
        assertThat(store.byId(account, call).orElseThrow().application()).isEqualTo(CallStore.Application.PENDING);
    }

    @Test
    void aPlanStartedWithoutAWeighInGetsItsEstimateAtTheNextCheckIn() {
        // The first check-in came before any weigh-in: no estimate, no target. Once there is a weight the next check-in
        // starts the estimate and its watch (K-114) — else the plan would stay without a target for good (K-216 review).
        AccountId account = ready();
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, observing_maintenance)
                values (:a, 'CUT', :start, :start, true)""").param("a", account.value()).param("start", PLAN_START).update();

        assertThat(send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "weekOf",
                CheckInWeek.weekOf(TODAY, java.time.DayOfWeek.MONDAY).toString(), "answers", List.of()))).hasStatusOk();

        assertThat(store.plan(account)).hasValueSatisfying(plan -> {
            assertThat(plan.targetKcal()).isNotNull().isPositive();
            assertThat(plan.observingMaintenance()).isTrue();
            assertThat(plan.planStart()).isEqualTo(TODAY);
            assertThat(plan.phaseStart()).isEqualTo(PLAN_START);
        });
    }

    @Test
    void theTargetsAndTheUndoNeedOnlyTheLastWeighInEver() throws Exception {
        // A user who stopped weighing in months ago can still read the targets and take a call back: the macros split
        // the target at the last weight known (K-216 review: undo failed with 409 once the window had no weigh-in).
        AccountId account = onACut(Instant.now().minus(java.time.Duration.ofDays(200)));
        UUID call = pending(account, new Action.AdjustCalories(-500));

        assertThat(map(send(account, "POST", "/v1/decisions/" + call + "/apply"))).containsEntry("targetKcal", 2100);
        assertThat(map(send(account, "POST", "/v1/decisions/" + call + "/undo"))).containsEntry("targetKcal", 2600);
        assertThat(map(send(account, "GET", "/v1/targets"))).containsEntry("targetKcal", 2600);
    }

    @Test
    void anotherAccountsCallIsNotFound() {
        AccountId owner = onACut();
        UUID call = pending(owner, new Action.AdjustCalories(-500));
        AccountId other = onACut();

        assertThat(send(other, "POST", "/v1/decisions/" + call + "/apply")).hasStatus(404);
        assertThat(send(other, "POST", "/v1/decisions/" + call + "/undo")).hasStatus(404);
        assertThat(store.byId(owner, call).orElseThrow().application()).isEqualTo(CallStore.Application.PENDING);
        assertThat(store.plan(other).orElseThrow().targetKcal()).isEqualTo(2600);
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
    void aCallOnTheSafetyNetIsAppliedAndNotTakenBack() throws Exception {
        // U13 (K-1000): applied by default and never declined; undoing it would be declining it by another name: CONFLICT.
        AccountId account = onACut();
        UUID call = pending(account, new Action.IncreaseCalories(500), CheckInWeek.weekOf(TODAY, java.time.DayOfWeek.MONDAY), Instant.now(), 2600,
                "low_energy_availability");
        assertThat(map(send(account, "POST", "/v1/decisions/" + call + "/apply"))).containsEntry("targetKcal", 3100);

        assertThat(send(account, "POST", "/v1/decisions/" + call + "/undo")).hasStatus(409);
        assertThat(send(account, "POST", "/v1/decisions/" + call + "/decline")).hasStatus(409);
        assertThat(store.plan(account).orElseThrow().targetKcal()).isEqualTo(3100);
        assertThat(store.byId(account, call).orElseThrow()).satisfies(kept -> {
            assertThat(kept.application()).isEqualTo(CallStore.Application.APPLIED);
            assertThat(kept.undoneAt()).isNull();
        });
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
    void aMiniCutCutsFromTodayUntilItsLongestWeeksAndUndoPutsTheBulkBack() throws Exception {
        // K-227, G7 K-102.
        AccountId account = onABulkOf(2600);
        UUID miniCut = pending(account, new Action.MiniCut(4, 6));

        assertThat(send(account, "POST", "/v1/decisions/" + miniCut + "/apply")).hasStatusOk();

        assertThat(store.plan(account)).hasValueSatisfying(plan -> {
            assertThat(plan.phase()).isEqualTo(Phase.CUT);
            assertThat(plan.phaseStart()).isEqualTo(TODAY);
            assertThat(plan.planStart()).isEqualTo(TODAY);
            assertThat(plan.observingMaintenance()).isFalse();
            assertThat(plan.miniCutUntil()).isEqualTo(TODAY.plusWeeks(6));
            assertThat(plan.targetKcal()).isLessThan(2600);
        });
        assertThat(send(account, "POST", "/v1/decisions/" + miniCut + "/undo")).hasStatusOk();
        assertThat(store.plan(account)).contains(new CallStore.Plan(Phase.BULK, PLAN_START, PLAN_START, 2600, false, null, null));
    }

    @Test
    void theMiniCutIsOneMinimumCutStepUnderTheMaintenanceItsEndGoesBackTo() throws Exception {
        // Its end is a change of phase to building, which starts at the maintenance estimate (K-222): the step between
        // the two is the mini cut's, cut_step_min_kcal (G7 K-97) — the body here is far from any floor.
        AccountId account = onABulkOf(2600);
        send(account, "POST", "/v1/decisions/" + pending(account, new Action.MiniCut(4, 6), TODAY.minusWeeks(1), Instant.now().minusSeconds(3600))
                + "/apply");
        CallStore.Plan onIt = store.plan(account).orElseThrow();
        UUID over = pending(account, new Action.ChangePhase(Phase.BULK), CheckInWeek.weekOf(TODAY, java.time.DayOfWeek.MONDAY), Instant.now(),
                onIt.targetKcal());

        assertThat(send(account, "POST", "/v1/decisions/" + over + "/apply")).hasStatusOk();

        CallStore.Plan back = store.plan(account).orElseThrow();
        assertThat(back.phase()).isEqualTo(Phase.BULK);
        assertThat(back.miniCutUntil()).isNull();
        assertThat(back.targetKcal() - onIt.targetKcal()).isEqualTo(steps(ParameterKey.CUT_STEP_MIN_KCAL));
        Map<String, Object> export = map(send(account, "GET", "/v1/account/export"));
        assertThat(JSON.writeValueAsString(export)).contains("\"miniCutUntil\":\"" + TODAY.plusWeeks(6) + "\"");
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
        assertThat(send(account, "POST", "/v1/decisions/" + deload + "/apply")).as("no program to lighten (K-217)").hasStatus(409);
        assertThat(send(account, "POST", "/v1/decisions/" + deload + "/undo")).as("never applied").hasStatus(409);
        assertThat(send(account, "POST", "/v1/decisions/" + UUID.randomUUID() + "/apply")).hasStatus(404);
        assertThat(store.plan(account).orElseThrow().targetKcal()).isEqualTo(2600);
    }

    @Test
    void aLighterWeekLowersTheProgramsSetsUntilTheCallsNextReviewAndUndoingItRestoresThem() throws Exception {
        // K-217: deload_volume_factor on the sets, from today to the day before the next review; the plan does not move.
        AccountId account = onACut();
        send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY")));
        UUID deload = pending(account, new Action.Deload(new BigDecimal("0.5")));

        assertThat(send(account, "POST", "/v1/decisions/" + deload + "/apply")).hasStatusOk();

        Map<String, Object> program = map(send(account, "GET", "/v1/program"));
        assertThat((Map<String, Object>) program.get("deload")).containsEntry("until", TODAY.plusDays(6).toString());
        List<Map<String, Object>> exercises = (List<Map<String, Object>>) ((List<Map<String, Object>>) program.get("days")).getFirst().get("exercises");
        assertThat(exercises).allSatisfy(planned -> assertThat((Integer) planned.get("sets"))
                .isEqualTo(Math.max(1, (Integer) planned.get("baseSets") / 2)));
        assertThat(store.plan(account).orElseThrow().targetKcal()).as("the plan does not move").isEqualTo(2600);

        assertThat(send(account, "POST", "/v1/decisions/" + deload + "/undo")).hasStatusOk();
        Map<String, Object> restored = map(send(account, "GET", "/v1/program"));
        assertThat(restored).doesNotContainKey("deload");
        assertThat((List<Map<String, Object>>) ((List<Map<String, Object>>) restored.get("days")).getFirst().get("exercises"))
                .allSatisfy(planned -> assertThat(planned.get("sets")).isEqualTo(planned.get("baseSets")));
    }

    @Test
    void holdingTheLoadShowsOnTheProgramAndTheNextRungEndsIt() throws Exception {
        AccountId account = onACut();
        send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY")));
        UUID hold = pending(account, new Action.StopLoadIncrease(), TODAY.minusWeeks(1).with(java.time.DayOfWeek.MONDAY), Instant.now().minusSeconds(60));
        assertThat(send(account, "POST", "/v1/decisions/" + hold + "/apply")).hasStatusOk();
        assertThat(map(send(account, "GET", "/v1/program"))).containsEntry("loadHeldSince", TODAY.toString());

        UUID rest = pending(account, new Action.FullRestWeek());
        assertThat(send(account, "POST", "/v1/decisions/" + rest + "/apply")).hasStatusOk();

        assertThat(map(send(account, "GET", "/v1/program"))).doesNotContainKey("loadHeldSince").containsEntry("restUntil", TODAY.plusDays(6).toString());
    }

    @Test
    void eachCallOfTheLadderNeedsAProgramAndLeavesNothingBehindWithoutOne() throws Exception {
        // No program: CONFLICT, the call still PENDING, no change kept — then with a program the same call applies.
        for (Action action : List.of(new Action.StopLoadIncrease(), new Action.Deload(new BigDecimal("0.5")), new Action.FullRestWeek())) {
            AccountId account = onACut();
            UUID call = pending(account, action);

            assertThat(send(account, "POST", "/v1/decisions/" + call + "/apply")).as(action.type().name()).hasStatus(409);
            assertThat(store.byId(account, call).orElseThrow().application()).isEqualTo(CallStore.Application.PENDING);
            assertThat(jdbc.sql("select count(*) from training.program_change where account_id = :a").param("a", account.value())
                    .query(Integer.class).single()).isZero();
            send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY")));
            assertThat(send(account, "POST", "/v1/decisions/" + call + "/apply")).as(action.type().name()).hasStatusOk();
        }
    }

    @Test
    void undoingTheRungThatEndedAHoldOpensTheHoldAgain() throws Exception {
        // Both applied the same day (last week's hold on this week's check-in day): the rest week ends the hold — it was
        // left open for good before the K-217 review — and undoing the rest week brings the hold back.
        AccountId account = onACut();
        send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY")));
        UUID hold = pending(account, new Action.StopLoadIncrease(), TODAY.minusWeeks(1).with(java.time.DayOfWeek.MONDAY), Instant.now().minusSeconds(60));
        send(account, "POST", "/v1/decisions/" + hold + "/apply");
        UUID rest = pending(account, new Action.FullRestWeek());
        send(account, "POST", "/v1/decisions/" + rest + "/apply");
        assertThat(map(send(account, "GET", "/v1/program"))).doesNotContainKey("loadHeldSince");

        assertThat(send(account, "POST", "/v1/decisions/" + rest + "/undo")).hasStatusOk();

        assertThat(map(send(account, "GET", "/v1/program"))).containsEntry("loadHeldSince", TODAY.toString()).doesNotContainKey("restUntil");
    }

    @Test
    void aLighterWeekOrAWeekOffEndsOnItsOwnLastDay() throws Exception {
        AccountId account = onACut();
        send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY")));
        change(account, "LIGHTER_WEEK", TODAY.minusDays(10), TODAY.minusDays(1), new BigDecimal("0.5"));
        change(account, "REST_WEEK", TODAY.minusDays(10), TODAY.minusDays(1), null);
        assertThat(map(send(account, "GET", "/v1/program"))).doesNotContainKeys("deload", "restUntil");

        change(account, "LIGHTER_WEEK", TODAY.minusDays(6), TODAY, new BigDecimal("0.5"));
        change(account, "REST_WEEK", TODAY.minusDays(6), TODAY, null);
        Map<String, Object> program = map(send(account, "GET", "/v1/program"));
        assertThat(program).containsEntry("restUntil", TODAY.toString());
        assertThat((Map<String, Object>) program.get("deload")).containsEntry("until", TODAY.toString());
    }

    @Test
    void aCallOfTheLadderAppliesOnAPlanWithoutACalorieTargetYet() throws Exception {
        // The ladder speaks before the first estimate (training data, no weigh-in): applied, answered with what is known.
        AccountId account = ready();
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, observing_maintenance)
                values (:a, 'CUT', :start, :start, true)""").param("a", account.value()).param("start", PLAN_START).update();
        send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY")));
        Decision decision = new Decision(new Action.Deload(new BigDecimal("0.5")), List.of(new Reason(new RuleId("r"),
                new Source("arastirma/x.md#1", SourceTag.LITERATURE))), Confidence.MEDIUM, TODAY.plusDays(7), new CopyKey("decision.continue"));
        CallStore.Call call = new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), CheckInWeek.weekOf(TODAY, java.time.DayOfWeek.MONDAY), TODAY,
                Instant.now(), parameters.versionHash(), StoredSnapshot.of(new Snapshot(TODAY, Sex.MALE, Phase.CUT, PLAN_START,
                new WeightSeries(List.of()))), DecisionJson.of(decision), CallStore.Application.PENDING);
        store.keep(account, call);

        MvcTestResult applied = send(account, "POST", "/v1/decisions/" + call.id() + "/apply");

        assertThat(applied).hasStatusOk();
        assertThat(map(applied)).containsEntry("trainingSessionsPerWeek", 1).containsKey("stepsPerDay").doesNotContainKeys("targetKcal", "proteinG");
        assertThat(send(account, "POST", "/v1/decisions/" + call.id() + "/undo")).hasStatusOk();
    }

    @Test
    void theTargetsTrainingSessionsAreTheProgramsDays() throws Exception {
        // K-530 (ADR-043 #74): a program on four days, a profile saying three — the targets say the program's four.
        AccountId account = onACut();
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY", "WEDNESDAY", "FRIDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        assertThat(map(send(account, "GET", "/v1/targets"))).as("no program: the profile's").containsEntry("trainingSessionsPerWeek", 3);

        assertThat(send(account, "PUT", "/v1/program", Map.of("days", List.of("MONDAY", "TUESDAY", "THURSDAY", "SATURDAY").stream()
                .map(weekday -> Map.of("name", "Full body", "weekday", weekday, "exercises",
                        List.of(Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 6, "max", 10))))).toList()))).hasStatusOk();

        assertThat(map(send(account, "GET", "/v1/targets"))).containsEntry("trainingSessionsPerWeek", 4);
    }

    @Test
    void beforeTheFirstEstimateTheTargetsTrainingSessionsAreTheProgramsDaysToo() throws Exception {
        AccountId account = ready();
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, observing_maintenance)
                values (:a, 'CUT', :start, :start, true)""").param("a", account.value()).param("start", PLAN_START).update();
        // The profile trains on Mondays; the program was generated on two days.
        send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY", "THURSDAY")));
        Decision decision = new Decision(new Action.Deload(new BigDecimal("0.5")), List.of(new Reason(new RuleId("r"),
                new Source("arastirma/x.md#1", SourceTag.LITERATURE))), Confidence.MEDIUM, TODAY.plusDays(7), new CopyKey("decision.continue"));
        CallStore.Call call = new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), CheckInWeek.weekOf(TODAY, java.time.DayOfWeek.MONDAY), TODAY,
                Instant.now(), parameters.versionHash(), StoredSnapshot.of(new Snapshot(TODAY, Sex.MALE, Phase.CUT, PLAN_START,
                new WeightSeries(List.of()))), DecisionJson.of(decision), CallStore.Application.PENDING);
        store.keep(account, call);

        assertThat(map(send(account, "POST", "/v1/decisions/" + call.id() + "/apply"))).containsEntry("trainingSessionsPerWeek", 2)
                .doesNotContainKey("targetKcal");
    }

    private void change(AccountId account, String kind, LocalDate from, LocalDate until, BigDecimal factor) {
        jdbc.sql("""
                insert into training.program_change (id, account_id, call_id, kind, starts_on, ends_on, sets_factor)
                values (:id, :a, :call, :kind, :from, :until, :factor)""").param("id", UUID.randomUUID()).param("a", account.value())
                .param("call", UUID.randomUUID()).param("kind", kind).param("from", from).param("until", until).param("factor", factor).update();
    }

    @Test
    void theTargetsAreHealthDataAndStartWithTheFirstEstimate() throws Exception {
        AccountId account = onACut();
        assertThat(map(send(account, "GET", "/v1/targets"))).containsEntry("targetKcal", 2600);
        // The food budget reads the same target (K-209's DailyTargets, provided here).
        assertThat(map(send(account, "GET", "/v1/days/" + TODAY + "/budget"))).containsEntry("targetKcal", 2600);

        AccountId noPlan = ready();
        assertThat(send(noPlan, "GET", "/v1/targets")).hasStatus(404);
        send(account, "DELETE", "/v1/consents/HEALTH_DATA?confirmDataDeletion=true");
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
        return onACut(Instant.now().minusSeconds(60));
    }

    private AccountId onACut(Instant weighedAt) {
        return onAPlanOf(ready(weighedAt), 2600);
    }

    private AccountId onAPlanOf(int targetKcal) {
        return onAPlanOf(ready(), targetKcal);
    }

    private AccountId onAPlanOf(AccountId account, int targetKcal) {
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :start, :start, :target, false)""").param("a", account.value()).param("start", PLAN_START)
                .param("target", targetKcal).update();
        return account;
    }

    private AccountId onABulkOf(int targetKcal) {
        AccountId account = ready();
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'BULK', :start, :start, :target, false)""").param("a", account.value()).param("start", PLAN_START)
                .param("target", targetKcal).update();
        return account;
    }

    private AccountId ready() {
        return ready(Instant.now().minusSeconds(60));
    }

    private AccountId ready(Instant weighedAt) {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        TestOnboarding.finishedTwoWeeksAgo(context, account);
        assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", weighedAt.toString(), "kg", 80.0,
                "source", "MANUAL")).getResponse().getStatus()).isLessThan(300);
        return account;
    }

    private UUID pending(AccountId account, Action action) {
        return pending(account, action, 2600);
    }

    private UUID pending(AccountId account, Action action, int judgedKcal) {
        return pending(account, action, CheckInWeek.weekOf(TODAY, java.time.DayOfWeek.MONDAY), Instant.now(), judgedKcal);
    }

    private UUID pending(AccountId account, Action action, LocalDate weekOf, Instant at) {
        return pending(account, action, weekOf, at, 2600);
    }

    /** A call as the engine would have kept it, made on a plan of {@code judgedKcal}. */
    private UUID pending(AccountId account, Action action, LocalDate weekOf, Instant at, int judgedKcal) {
        return pending(account, action, weekOf, at, judgedKcal, "r");
    }

    private UUID pending(AccountId account, Action action, LocalDate weekOf, Instant at, int judgedKcal, String rule) {
        Decision decision = new Decision(action, List.of(new Reason(new RuleId(rule), new Source("arastirma/x.md#1", SourceTag.LITERATURE))),
                Confidence.MEDIUM, TODAY.plusDays(7), new CopyKey("decision.continue"));
        CallStore.Call call = new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), weekOf, TODAY, at, parameters.versionHash(),
                StoredSnapshot.of(new Snapshot(TODAY, Sex.MALE, Phase.CUT, PLAN_START, new WeightSeries(List.of()))
                        .withEnergy(app.keel.engine.EnergyBudget.exerciseUnknown(judgedKcal))), DecisionJson.of(decision),
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
