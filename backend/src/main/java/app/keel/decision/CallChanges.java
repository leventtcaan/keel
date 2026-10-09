package app.keel.decision;

import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;

/**
 * What a call changes in the plan, old to new (K-1000, ADR-077 #3 "the targets that change"; contract DecisionChange),
 * read from the call as kept: the plan before and after it, set once it was applied. A call never applied, or one that
 * left every target where it was (advice, a program call), changes none. Declined, each change also says the value the
 * plan follows now, last week's (K-963).
 */
final class CallChanges {

    private CallChanges() {
    }

    /** One target: its kind in the contract, its field in a ChangeValue, how the plan holds it. */
    private record Target(String what, String field, Function<CallStore.Plan, Object> value) {
    }

    private static final List<Target> TARGETS = List.of(
            new Target("CALORIES", "targetKcal", CallStore.Plan::targetKcal),
            new Target("STEPS", "stepsPerDay", CallStore.Plan::stepsPerDay),
            new Target("PHASE", "phase", plan -> plan.phase().name()));

    static List<Map<String, Object>> of(CallStore.Call call) {
        CallStore.Plan before = call.planBefore();
        CallStore.Plan after = call.planAfter();
        if (before == null || after == null) {
            return List.of();
        }
        List<Map<String, Object>> changes = new ArrayList<>();
        for (Target target : TARGETS) {
            Object old = target.value().apply(before);
            Object now = target.value().apply(after);
            if (old == null || now == null || Objects.equals(old, now)) {
                continue;
            }
            Map<String, Object> change = new LinkedHashMap<>();
            change.put("what", target.what());
            change.put("before", Map.of(target.field(), old));
            change.put("after", Map.of(target.field(), now));
            if (call.application() == CallStore.Application.DECLINED) {
                change.put("inForce", Map.of(target.field(), old)); // last week's plan, the one kept (K-963)
            }
            changes.add(change);
        }
        return List.copyOf(changes);
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
