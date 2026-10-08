package app.keel.decision;

import app.keel.engine.InitialTarget;
import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;

/**
 * Contract StartingTarget (K-989, ADR-072 #6): where the plan's calories start before the first call — the first plan's
 * target, one number (U5: a target may be); the maintenance estimate it comes from, a range (U5); and how many days the
 * scale watches it before a calorie call (maintenance_observation_days, G2 K-8: observation beats the formula).
 */
record StartingTarget(int targetKcal, Range maintenanceKcal, int observationDays) {

    /** Contract KcalRange. */
    record Range(int low, int high) {
    }

    /** The first plan as the first call would start it, the estimate its target comes from, and the parameters for the user's sex. */
    static StartingTarget of(CallStore.Plan first, InitialTarget.Estimate estimate, Parameters parameters) {
        return new StartingTarget(first.targetKcal(), new Range(estimate.lowKcal(), estimate.highKcal()),
                parameters.wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS));
    }
}
