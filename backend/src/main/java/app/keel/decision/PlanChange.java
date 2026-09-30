package app.keel.decision;

import app.keel.engine.Action;
import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import java.time.LocalDate;
import java.util.Optional;

/**
 * What applying a call does to the plan (K-216, U3: one variable at a time). A calorie call moves the target and nothing
 * else — the day it began moves with it, since the ladder waits from there (K-107), and the formula's starting estimate
 * is no longer what is being watched (K-114). More movement raises the step target to steps_target_raised (G2 K-42),
 * never lowers it.
 *
 * <p>A new direction (K-222) starts like a first plan (K-114): today, at the maintenance estimate, watched before it is
 * judged; the steps stay. The hard stop (ADR-020 L-1) ends the deficit: the plan turns to building — maintenance is not a
 * direction (03 §2.1), and a cut would take the deficit back at its next step — at no less than maintenance, watched.
 * How long it holds is not decided (DURUM question 23): after the watch the phase gate may turn a body over the bulk
 * ceiling back to a cut.
 *
 * <p>Not applied here: the training calls change the program (K-217); the mini cut needs the appetite question the engine
 * has not asked yet (K-227).
 */
final class PlanChange {

    private PlanChange() {
    }

    /**
     * The plan after the call; empty when this kind of call has nothing to apply here. {@code maintenanceKcal}: today's
     * maintenance estimate (K-114), none without a weigh-in in the window.
     */
    static Optional<CallStore.Plan> after(CallStore.Plan before, Action action, LocalDate today, Parameters parameters, Optional<Integer> maintenanceKcal) {
        return switch (action) {
            case Action.AdjustCalories(int kcalPerDay) -> calories(before, kcalPerDay, today);
            case Action.IncreaseCalories(int kcalPerDay) -> calories(before, kcalPerDay, today);
            case Action.ChangeMovement() -> Optional.of(new CallStore.Plan(before.phase(), before.phaseStart(), before.planStart(),
                    before.targetKcal(), before.observingMaintenance(),
                    Math.max(steps(before, parameters), parameters.wholeNumber(ParameterKey.STEPS_TARGET_RAISED))));
            case Action.ChangePhase(Phase to) -> Optional.of(direction(before, to, maintenanceKcal.orElse(before.targetKcal()), today));
            case Action.HardStop() -> Optional.of(direction(before, Phase.BULK, maintenanceKcal
                    .map(maintenance -> before.targetKcal() == null ? maintenance : Math.max(before.targetKcal(), maintenance))
                    .orElse(before.targetKcal()), today));
            case Action.NoDecisionYet _, Action.Continue _, Action.FixTraining _, Action.FixRecovery _, Action.FixAdherence _,
                 Action.StopLoadIncrease _, Action.Deload _, Action.FullRestWeek _, Action.MiniCut _ -> Optional.empty();
        };
    }

    // The plan begins today (or when the old one did, if that is later on the user's calendar now — a time zone moved
    // west), watched (K-114); the phase with it, unless it goes on.
    private static CallStore.Plan direction(CallStore.Plan before, Phase to, Integer targetKcal, LocalDate today) {
        LocalDate start = today.isAfter(before.planStart()) ? today : before.planStart();
        return new CallStore.Plan(to, before.phase() == to ? before.phaseStart() : start, start, targetKcal, true, before.stepsPerDay());
    }

    /**
     * Whether an applied call can be taken back: all but the hard stop — undone, it would put the deficit back with one
     * tap, against ADR-020 L-1 (no more eating under maintenance; K-222 review).
     */
    static boolean undoable(Action action) {
        return !(action instanceof Action.HardStop);
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
