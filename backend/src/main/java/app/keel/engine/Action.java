package app.keel.engine;

/**
 * What the engine decided to do (U3). Sealed: the compiler knows every kind, so a {@code switch} over an Action
 * must handle all of them. Each kind is a record so it can carry its own data when a rule needs it
 * (e.g. the calorie step in K-107) — an enum constant cannot.
 *
 * <p>Engine code switches on the Action (it can see the data); storage and copy use {@link #type()}, persisted by
 * name, never by ordinal.
 */
public sealed interface Action {

    /** The stable identifier of this kind of action. No default branch: a new record must be added here to compile. */
    default ActionType type() {
        return switch (this) {
            case NoDecisionYet _ -> ActionType.NO_DECISION_YET;
            case Continue _ -> ActionType.CONTINUE;
            case AdjustCalories _ -> ActionType.ADJUST_CALORIES;
            case IncreaseCalories _ -> ActionType.INCREASE_CALORIES;
            case ChangeMovement _ -> ActionType.CHANGE_MOVEMENT;
            case FixTraining _ -> ActionType.FIX_TRAINING;
            case FixRecovery _ -> ActionType.FIX_RECOVERY;
            case FixAdherence _ -> ActionType.FIX_ADHERENCE;
            case HardStop _ -> ActionType.HARD_STOP;
            case StopLoadIncrease _ -> ActionType.STOP_LOAD_INCREASE;
            case Deload _ -> ActionType.DELOAD;
            case FullRestWeek _ -> ActionType.FULL_REST_WEEK;
            case MiniCut _ -> ActionType.MINI_CUT;
        };
    }

    /** Not enough data, or the window is not full: say so instead of guessing (U3). */
    record NoDecisionYet() implements Action {
    }

    /** Moving toward the goal and looking right: change nothing. */
    record Continue() implements Action {
    }

    /** Move calories one step in the working direction (K-107 adds the step). */
    record AdjustCalories() implements Action {
    }

    /** Safety net: losing too fast, raise calories (U13, K-104). */
    record IncreaseCalories() implements Action {
    }

    /** Calories are at the floor: change activity instead of eating less (spec WC-12). */
    record ChangeMovement() implements Action {
    }

    /** Training is the problem; no calorie decision this week. */
    record FixTraining() implements Action {
    }

    /** Training is fine, recovery is not: protein, sleep. */
    record FixRecovery() implements Action {
    }

    /** The plan is not being followed; changing it would not help. */
    record FixAdherence() implements Action {
    }

    /** Safety net: stop the deficit (rapid loss, low energy availability; U13, K-104). */
    record HardStop() implements Action {
    }

    /** First rung of the deload ladder: hold the load (K-110). */
    record StopLoadIncrease() implements Action {
    }

    /** Second rung: cut volume or load for a week (K-110). */
    record Deload() implements Action {
    }

    /** Last rung: a full week off (K-110). */
    record FullRestWeek() implements Action {
    }

    /** A short cut inside a bulk. */
    record MiniCut() implements Action {
    }
}
