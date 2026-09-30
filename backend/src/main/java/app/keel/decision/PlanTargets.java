package app.keel.decision;

import com.fasterxml.jackson.annotation.JsonInclude;
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
 * the engine's split of the calorie target at today's bodyweight (K-108); protein does not depend on calories, so it is
 * always there. When no split fits the target — the engine never sets one, but a heavier trend or a birthday can move
 * the floor later — carbs and fat are left out rather than guessed. Training days are the ones the user chose. Before
 * the first estimate there are no calories and no macros: only steps and training days ({@link #withoutCalories}).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
record PlanTargets(Integer targetKcal, Integer proteinG, Integer carbsG, Integer fatG, int stepsPerDay, int trainingSessionsPerWeek) {

    /** What is known before the first estimate: the steps and the training days (a training call applied, K-217). */
    static PlanTargets withoutCalories(CallStore.Plan plan, Set<DayOfWeek> trainingDays, Parameters parameters) {
        return new PlanTargets(null, null, null, null, PlanChange.steps(plan, parameters), trainingDays.size());
    }

    /** Empty before the first estimate. */
    static Optional<PlanTargets> of(CallStore.Plan plan, BigDecimal bodyweightKg, Sex sex, int ageYears, Set<DayOfWeek> trainingDays,
            Parameters parameters) {
        if (plan.targetKcal() == null) {
            return Optional.empty();
        }
        int steps = PlanChange.steps(plan, parameters);
        if (MacroTargets.forTarget(plan.targetKcal(), bodyweightKg, sex, ageYears, parameters) instanceof MacroResult.Split(var macros)) {
            return Optional.of(new PlanTargets(plan.targetKcal(), macros.proteinG(), macros.carbsG(), macros.fatG(), steps, trainingDays.size()));
        }
        return Optional.of(new PlanTargets(plan.targetKcal(), MacroTargets.proteinG(bodyweightKg, sex, ageYears, parameters), null, null, steps,
                trainingDays.size()));
    }
}
