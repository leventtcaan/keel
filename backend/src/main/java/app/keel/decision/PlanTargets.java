package app.keel.decision;

import com.fasterxml.jackson.annotation.JsonInclude;
import app.keel.engine.MacroResult;
import app.keel.engine.MacroTargets;
import app.keel.engine.Parameters;
import app.keel.engine.Sex;
import java.math.BigDecimal;
import java.util.Optional;

/**
 * Contract Targets: what the user follows today, each a plan number set by calls (K-216, ADR-020 L-13). The macros are
 * the engine's split of the calorie target at today's bodyweight (K-108); protein does not depend on calories, so it is
 * always there. When no split fits the target — the engine never sets one, but a heavier trend or a birthday can move
 * the floor later — carbs and fat are left out rather than guessed. Training sessions are the program's days, or the
 * profile's without a program (PlannedSessions, K-530). Before the first estimate there are no calories and no macros:
 * only steps and training sessions ({@link #withoutCalories}).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
record PlanTargets(Integer targetKcal, Integer proteinG, Integer carbsG, Integer fatG, int stepsPerDay, int trainingSessionsPerWeek) {

    /** What is known before the first estimate: the steps and the training sessions (a training call applied, K-217). */
    static PlanTargets withoutCalories(CallStore.Plan plan, int trainingSessionsPerWeek, Parameters parameters) {
        return new PlanTargets(null, null, null, null, PlanChange.steps(plan, parameters), trainingSessionsPerWeek);
    }

    /** Empty before the first estimate. */
    static Optional<PlanTargets> of(CallStore.Plan plan, BigDecimal bodyweightKg, Sex sex, int ageYears, int trainingSessionsPerWeek,
            Parameters parameters) {
        if (plan.targetKcal() == null) {
            return Optional.empty();
        }
        int steps = PlanChange.steps(plan, parameters);
        if (MacroTargets.forTarget(plan.targetKcal(), bodyweightKg, sex, ageYears, parameters) instanceof MacroResult.Split(var macros)) {
            return Optional.of(new PlanTargets(plan.targetKcal(), macros.proteinG(), macros.carbsG(), macros.fatG(), steps, trainingSessionsPerWeek));
        }
        return Optional.of(new PlanTargets(plan.targetKcal(), MacroTargets.proteinG(bodyweightKg, sex, ageYears, parameters), null, null, steps,
                trainingSessionsPerWeek));
    }
}
