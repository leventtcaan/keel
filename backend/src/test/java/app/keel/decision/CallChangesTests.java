package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Action;
import app.keel.engine.Confidence;
import app.keel.engine.CopyKey;
import app.keel.engine.Decision;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.Reason;
import app.keel.engine.RuleId;
import app.keel.engine.Sex;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import app.keel.training.HeldMove;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * What a call changes, old to new (K-1000, ADR-077 #3 "the targets that change"), read from the call as kept: the plan
 * before and after it once applied. Declined, each change also says what the plan follows now (last week's). The first
 * week's call says how many days the scale is watched (ADR-077 #4), by the user's sex.
 */
class CallChangesTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 12, 28);
    private static final Instant AT = Instant.parse("2026-12-28T08:00:00Z");
    private static final Parameters PARAMS = RepositoryParameters.set().forSex(Sex.MALE);
    private static final CallStore.Plan BEFORE = new CallStore.Plan(Phase.CUT, TODAY.minusDays(60), TODAY.minusDays(21), 2600, false, 8000);

    @Test
    void aCalorieCallAppliedSaysTheTargetBeforeAndAfter() {
        CallStore.Plan after = new CallStore.Plan(Phase.CUT, BEFORE.phaseStart(), TODAY, 2100, false, 8000);

        assertThat(CallChanges.of(applied(BEFORE, after), PARAMS)).containsExactly(
                Map.of("what", "CALORIES", "before", Map.of("targetKcal", 2600), "after", Map.of("targetKcal", 2100)));
    }

    @Test
    void aStepCallAndAChangeOfPhaseSayTheirsAndNothingElse() {
        CallStore.Plan steps = new CallStore.Plan(Phase.CUT, BEFORE.phaseStart(), BEFORE.planStart(), 2600, false, 10000);
        CallStore.Plan bulk = new CallStore.Plan(Phase.BULK, TODAY, TODAY, 2900, true, 8000);

        assertThat(CallChanges.of(applied(BEFORE, steps), PARAMS)).containsExactly(
                Map.of("what", "STEPS", "before", Map.of("stepsPerDay", 8000), "after", Map.of("stepsPerDay", 10000)));
        assertThat(CallChanges.of(applied(BEFORE, bulk), PARAMS)).containsExactly(
                Map.of("what", "CALORIES", "before", Map.of("targetKcal", 2600), "after", Map.of("targetKcal", 2900)),
                Map.of("what", "PHASE", "before", Map.of("phase", "CUT"), "after", Map.of("phase", "BULK")));
    }

    @Test
    void declinedEachChangeSaysWhatThePlanFollowsNow() {
        CallStore.Plan after = new CallStore.Plan(Phase.CUT, BEFORE.phaseStart(), TODAY, 2100, false, 8000);
        CallStore.Call declined = with(applied(BEFORE, after), CallStore.Application.DECLINED);

        assertThat(CallChanges.of(declined, PARAMS)).containsExactly(Map.of("what", "CALORIES", "before", Map.of("targetKcal", 2600),
                "after", Map.of("targetKcal", 2100), "inForce", Map.of("targetKcal", 2600)));
    }

    @Test
    void aCallNeverAppliedOrOneThatChangesNoTargetSaysNone() {
        assertThat(CallChanges.of(call(CallStore.Application.NOT_NEEDED, null, null), PARAMS)).isEmpty();
        assertThat(CallChanges.of(call(CallStore.Application.PENDING, null, null), PARAMS)).isEmpty();
        // A program call (the deload ladder) leaves the plan as it was: its change is the program's, in its words.
        assertThat(CallChanges.of(applied(BEFORE, BEFORE), PARAMS)).isEmpty();
    }

    @Test
    void theFirstStepTargetIsTheStartingOneNotNothing() {
        // The first plan has no step target set (the starting one applies, K-216): "more movement" raises it from there.
        CallStore.Plan first = new CallStore.Plan(Phase.CUT, BEFORE.phaseStart(), BEFORE.planStart(), 2600, false, null);
        CallStore.Plan raised = new CallStore.Plan(Phase.CUT, BEFORE.phaseStart(), BEFORE.planStart(), 2600, false,
                PARAMS.wholeNumber(ParameterKey.STEPS_TARGET_RAISED));

        assertThat(CallChanges.of(applied(first, raised), PARAMS)).containsExactly(Map.of("what", "STEPS",
                "before", Map.of("stepsPerDay", PARAMS.wholeNumber(ParameterKey.STEPS_TARGET_START)),
                "after", Map.of("stepsPerDay", PARAMS.wholeNumber(ParameterKey.STEPS_TARGET_RAISED))));
        // Still unset after the call: the target is the same one, nothing changed.
        assertThat(CallChanges.of(applied(first, first), PARAMS)).isEmpty();
    }

    @Test
    void aPlanWithoutACalorieTargetSaysNoneWasInForceNotThatNothingChanged() {
        // A plan begun before any weigh-in has no target; a change of direction starts one at the maintenance estimate.
        CallStore.Plan none = new CallStore.Plan(Phase.CUT, BEFORE.phaseStart(), BEFORE.planStart(), null, true, null);
        CallStore.Plan bulk = new CallStore.Plan(Phase.BULK, TODAY, TODAY, 2900, true, null);

        assertThat(CallChanges.of(applied(none, bulk), PARAMS)).containsExactly(
                Map.of("what", "CALORIES", "before", Map.of(), "after", Map.of("targetKcal", 2900)),
                Map.of("what", "PHASE", "before", Map.of("phase", "CUT"), "after", Map.of("phase", "BULK")));
        assertThat(CallChanges.of(with(applied(none, bulk), CallStore.Application.DECLINED), PARAMS).getFirst())
                .as("declined: none in force, as it was").containsEntry("inForce", Map.of());
    }

    @Test
    void undoneOrDeclinedEachChangeSaysWhatThePlanFollowsNow() {
        CallStore.Plan after = new CallStore.Plan(Phase.CUT, BEFORE.phaseStart(), TODAY, 2100, false, 8000);

        // An undo puts the plan before the call back, as declining an applied call does: last week's value is in force.
        assertThat(CallChanges.of(with(applied(BEFORE, after), CallStore.Application.UNDONE), PARAMS)).containsExactly(Map.of("what", "CALORIES",
                "before", Map.of("targetKcal", 2600), "after", Map.of("targetKcal", 2100), "inForce", Map.of("targetKcal", 2600)));
        assertThat(CallChanges.of(applied(BEFORE, after), PARAMS).getFirst()).as("applied: the call's own, no inForce").doesNotContainKey("inForce");
    }

    @Test
    void theFirstWeeksCallSaysTheWatchDaysByTheUsersSex() {
        ParameterSet parameters = RepositoryParameters.set();
        StoredSnapshot.FirstWeek week = new StoredSnapshot.FirstWeek(3, 3, 3, List.of(), null, List.of());

        assertThat(CallChanges.observationDays(snapshot(Sex.FEMALE, week), parameters))
                .contains(parameters.forSex(Sex.FEMALE).wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS));
        assertThat(CallChanges.observationDays(snapshot(Sex.MALE, week), parameters))
                .contains(parameters.forSex(Sex.MALE).wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS));
        assertThat(CallChanges.observationDays(snapshot(Sex.MALE, null), parameters)).as("any other call").isEmpty();
    }

    private static final HeldMove BENCH = new HeldMove("bench_press", new HeldMove.Target(new BigDecimal("72.5"), 9),
            new HeldMove.Target(new BigDecimal("72.5"), 8));

    @Test
    void aHoldOfTheLoadSaysTheMovesTargetBeforeAndAfterAndThatTheLoadIsHeld() {
        // K-1009: 72.5 x 9 before the hold, 72.5 x 8 with it; "held" so the phone does not write it as a target cut.
        assertThat(CallChanges.move(BENCH, hold(CallStore.Application.APPLIED, BEFORE, BEFORE))).isEqualTo(Map.of("what", "MOVE",
                "exerciseId", "bench_press", "held", true,
                "before", Map.of("target", Map.of("loadKg", new BigDecimal("72.5"), "reps", 9)),
                "after", Map.of("target", Map.of("loadKg", new BigDecimal("72.5"), "reps", 8))));
    }

    @Test
    void aHoldDeclinedOrUndoneSaysTheTargetInForceTheOneBeforeTheCall() {
        for (CallStore.Application off : List.of(CallStore.Application.DECLINED, CallStore.Application.UNDONE)) {
            assertThat(CallChanges.move(BENCH, hold(off, BEFORE, BEFORE))).as(off.name())
                    .containsEntry("inForce", Map.of("target", Map.of("loadKg", new BigDecimal("72.5"), "reps", 9)));
        }
        assertThat(CallChanges.move(BENCH, hold(CallStore.Application.APPLIED, BEFORE, BEFORE))).doesNotContainKey("inForce");
    }

    @Test
    void onlyTheLatestAppliedOrKeptOffHoldReadsTheProgramsMove() {
        // The program's target is today's: an older call's hold says nothing true of it, a call never applied changed nothing.
        assertThat(CallChanges.readsMove(hold(CallStore.Application.APPLIED, BEFORE, BEFORE), true)).isTrue();
        assertThat(CallChanges.readsMove(hold(CallStore.Application.DECLINED, BEFORE, BEFORE), true)).isTrue();
        assertThat(CallChanges.readsMove(hold(CallStore.Application.UNDONE, BEFORE, BEFORE), true)).isTrue();
        assertThat(CallChanges.readsMove(hold(CallStore.Application.APPLIED, BEFORE, BEFORE), false)).as("an older call").isFalse();
        assertThat(CallChanges.readsMove(hold(CallStore.Application.PENDING, null, null), true)).as("never applied").isFalse();
        assertThat(CallChanges.readsMove(hold(CallStore.Application.DECLINED, null, null), true)).as("declined before it was applied").isFalse();
    }

    @Test
    void aCallThatIsNotAHoldOfTheLoadReadsNoMove() {
        CallStore.Plan after = new CallStore.Plan(Phase.CUT, BEFORE.phaseStart(), TODAY, 2100, false, 8000);
        assertThat(CallChanges.readsMove(of(new Action.Deload(new BigDecimal("0.5")), CallStore.Application.APPLIED, BEFORE, BEFORE), true))
                .as("a lighter week changes the sets, not a target").isFalse();
        assertThat(CallChanges.readsMove(of(new Action.AdjustCalories(-250), CallStore.Application.APPLIED, BEFORE, after), true)).isFalse();
    }

    private static CallStore.Call hold(CallStore.Application application, CallStore.Plan before, CallStore.Plan after) {
        return of(new Action.StopLoadIncrease(), application, before, after);
    }

    private static CallStore.Call of(Action action, CallStore.Application application, CallStore.Plan before, CallStore.Plan after) {
        Decision decision = new Decision(action, List.of(new Reason(new RuleId("r"), new Source("arastirma/x.md#1", SourceTag.LITERATURE))),
                Confidence.MEDIUM, TODAY.plusDays(7), new CopyKey("decision.continue"));
        return new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), TODAY, TODAY, AT, "hash", null, DecisionJson.of(decision), application,
                before == null ? null : AT, null, before, after, null);
    }

    private static CallStore.Call applied(CallStore.Plan before, CallStore.Plan after) {
        return call(CallStore.Application.APPLIED, before, after);
    }

    private static CallStore.Call with(CallStore.Call call, CallStore.Application application) {
        return new CallStore.Call(call.id(), call.clientId(), call.weekOf(), call.madeOn(), call.decidedAt(), call.parametersHash(), call.snapshot(),
                call.decision(), application, call.appliedAt(), call.undoneAt(), call.planBefore(), call.planAfter(), AT);
    }

    private static CallStore.Call call(CallStore.Application application, CallStore.Plan before, CallStore.Plan after) {
        return new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), TODAY, TODAY, AT, "hash", null, Map.of(), application,
                before == null ? null : AT, null, before, after, null);
    }

    private static StoredSnapshot snapshot(Sex sex, StoredSnapshot.FirstWeek week) {
        return new StoredSnapshot(TODAY, sex, Phase.CUT, TODAY, List.of(), null, null, null, null, false, TODAY, null, null, false, null, null, null, week);
    }
}
