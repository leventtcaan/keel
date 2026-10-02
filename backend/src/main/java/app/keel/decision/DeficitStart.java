package app.keel.decision;

import app.keel.engine.Phase;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * The first day of the cut's deficit (ADR-039 T-2): the day its first target under maintenance began. A cut begins
 * watched at the maintenance estimate (K-114) — no deficit yet; the first calorie call sets the target under it, and a
 * mini cut begins there. A later step down the ladder is the same deficit, not a new one; the same cut begun again
 * (watched again) starts a new one.
 */
final class DeficitStart {

    private DeficitStart() {
    }

    /**
     * From the plan in force and the applied calls' steps, oldest first: none on a plan watched, building, or with no
     * applied call to say when.
     */
    static Optional<LocalDate> of(CallStore.Plan plan, List<CallStore.PlanStep> steps) {
        if (plan.phase() != Phase.CUT || plan.observingMaintenance()) {
            return Optional.empty();
        }
        return steps.stream().filter(step -> into(step.before(), step.after()) && step.after().phaseStart().equals(plan.phaseStart()))
                .reduce((earlier, later) -> later).map(step -> step.after().planStart());
    }

    /** A call that turned a plan with no deficit — watched, or building — into a cut under maintenance. */
    private static boolean into(CallStore.Plan before, CallStore.Plan after) {
        boolean noDeficitBefore = before.phase() != Phase.CUT || before.observingMaintenance();
        return noDeficitBefore && after.phase() == Phase.CUT && !after.observingMaintenance();
    }
}
