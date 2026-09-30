package app.keel.decision;

import app.keel.engine.MacroResult;
import app.keel.engine.MacroTargets;
import app.keel.engine.Parameters;
import app.keel.engine.Sex;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.util.Optional;
import java.util.Set;

/**
 * Contract Targets: what the user follows today, each a plan number set by calls (K-216, ADR-020 L-13). The macros are
 * the engine's split of the calorie target at today's bodyweight (K-108); training days are the ones the user chose.
 */
record PlanTargets(int targetKcal, int proteinG, int carbsG, int fatG, int stepsPerDay, int trainingSessionsPerWeek) {

    /** Empty before the first estimate, or when no split fits the target (the engine would not have set it). */
    static Optional<PlanTargets> of(CallStore.Plan plan, BigDecimal bodyweightKg, Sex sex, int ageYears, Set<DayOfWeek> trainingDays,
            Parameters parameters) {
        if (plan.targetKcal() == null
                || !(MacroTargets.forTarget(plan.targetKcal(), bodyweightKg, sex, ageYears, parameters) instanceof MacroResult.Split(var macros))) {
            return Optional.empty();
        }
        return Optional.of(new PlanTargets(plan.targetKcal(), macros.proteinG(), macros.carbsG(), macros.fatG(),
                PlanChange.steps(plan, parameters), trainingDays.size()));
    }
}
