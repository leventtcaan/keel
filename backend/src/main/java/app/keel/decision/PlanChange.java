package app.keel.decision;

import app.keel.engine.Action;
import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import java.time.LocalDate;
import java.util.Optional;

/**
 * What applying a call does to the plan (K-216, U3: one variable at a time). A calorie call moves the target and nothing
 * else — the day it began moves with it, since the ladder waits from there (K-107), and the formula's starting estimate
 * is no longer what is being watched (K-114). More movement raises the step target to steps_target_raised (G2 K-42),
 * never lowers it.
 *
 * <p>Not applied here: the training calls change the program (K-217); a phase change, a mini cut and the hard stop need
 * what the engine cannot read yet (the fat estimate, DURUM 11, 17, 18), so the engine cannot make them today.
 */
final class PlanChange {

    private PlanChange() {
    }

    /** The plan after the call; empty when this kind of call has nothing to apply here. */
    static Optional<CallStore.Plan> after(CallStore.Plan before, Action action, LocalDate today, Parameters parameters) {
        return switch (action) {
            case Action.AdjustCalories(int kcalPerDay) -> calories(before, kcalPerDay, today);
            case Action.IncreaseCalories(int kcalPerDay) -> calories(before, kcalPerDay, today);
            case Action.ChangeMovement() -> Optional.of(new CallStore.Plan(before.phase(), before.phaseStart(), before.planStart(),
                    before.targetKcal(), before.observingMaintenance(),
                    Math.max(steps(before, parameters), parameters.wholeNumber(ParameterKey.STEPS_TARGET_RAISED))));
            case Action.NoDecisionYet _, Action.Continue _, Action.FixTraining _, Action.FixRecovery _, Action.FixAdherence _,
                 Action.StopLoadIncrease _, Action.Deload _, Action.FullRestWeek _, Action.ChangePhase _, Action.MiniCut _,
                 Action.HardStop _ -> Optional.empty();
        };
    }

    /** The step target in force: the plan's, or the starting one before any was set. */
    static int steps(CallStore.Plan plan, Parameters parameters) {
        return plan.stepsPerDay() != null ? plan.stepsPerDay() : parameters.wholeNumber(ParameterKey.STEPS_TARGET_START);
    }

    // The engine makes a calorie call only on a plan with a target (DecisionPipeline: plan_target_needed), and its floors
    // keep the result positive; a plan without one has nothing to move.
    private static Optional<CallStore.Plan> calories(CallStore.Plan before, int kcalPerDay, LocalDate today) {
        if (before.targetKcal() == null || before.targetKcal() + kcalPerDay <= 0) {
            return Optional.empty();
        }
        LocalDate start = today.isAfter(before.planStart()) ? today : before.planStart();
        return Optional.of(new CallStore.Plan(before.phase(), before.phaseStart(), start, before.targetKcal() + kcalPerDay, false,
                before.stepsPerDay()));
    }
}
