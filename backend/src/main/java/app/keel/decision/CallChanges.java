package app.keel.decision;

import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.BiFunction;

/**
 * What a call changes in the plan, old to new (K-1000, ADR-077 #3 "the targets that change"; contract DecisionChange),
 * read from the call as kept: the plan before and after it, set once it was applied. A call never applied, or one that
 * left every target where it was (advice, a program call), changes none. Declined or undone, each change also says the
 * value the plan follows now, last week's (K-963): the plan was put back as it was before the call.
 *
 * <p>A target is read as the plan holds it in force: the step target before any was set is the starting one, so the first
 * "more movement" call is a change from it; a plan begun without a calorie target (no weigh-in yet) had none in force,
 * said by an empty value, not by leaving the change out.
 */
final class CallChanges {

    private CallChanges() {
    }

    /** One target: its kind in the contract, its field in a ChangeValue, how the plan holds it in force (none: null). */
    private record Target(String what, String field, BiFunction<CallStore.Plan, Parameters, Object> value) {
    }

    private static final List<Target> TARGETS = List.of(
            new Target("CALORIES", "targetKcal", (plan, parameters) -> plan.targetKcal()),
            new Target("STEPS", "stepsPerDay", (plan, parameters) -> PlanChange.steps(plan, parameters)),
            new Target("PHASE", "phase", (plan, parameters) -> plan.phase().name()));

    static List<Map<String, Object>> of(CallStore.Call call, Parameters parameters) {
        CallStore.Plan before = call.planBefore();
        CallStore.Plan after = call.planAfter();
        if (before == null || after == null) {
            return List.of();
        }
        boolean planPutBack = call.application() == CallStore.Application.DECLINED || call.application() == CallStore.Application.UNDONE;
        List<Map<String, Object>> changes = new ArrayList<>();
        for (Target target : TARGETS) {
            Object old = target.value().apply(before, parameters);
            Object now = target.value().apply(after, parameters);
            if (now == null || Objects.equals(old, now)) {
                continue;
            }
            Map<String, Object> change = new LinkedHashMap<>();
            change.put("what", target.what());
            change.put("before", value(target, old));
            change.put("after", value(target, now));
            if (planPutBack) {
                change.put("inForce", value(target, old)); // last week's plan, the one kept (K-963)
            }
            changes.add(change);
        }
        return List.copyOf(changes);
    }

    // A target's value in its field; none in force is the empty value.
    private static Map<String, Object> value(Target target, Object value) {
        return value == null ? Map.of() : Map.of(target.field(), value);
    }

    /**
     * On the call that closes the first week (its snapshot keeps that week, K-962): the days the scale is watched before
     * the first calorie call, the engine's maintenance_observation_days for the user's sex (ADR-077 #4). Empty on any other.
     */
    static Optional<Integer> observationDays(StoredSnapshot snapshot, ParameterSet parameters) {
        if (snapshot == null || snapshot.firstWeek() == null) {
            return Optional.empty();
        }
        return Optional.of(parameters.forSex(snapshot.sex()).wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS));
    }
}
