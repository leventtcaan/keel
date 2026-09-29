package app.keel.engine;

/**
 * What the engine decided to do (U3). Sealed: the compiler knows every kind, so a {@code switch} over an Action
 * must handle all of them. Each kind is a record so it can carry its own data when a rule needs it
 * (e.g. the calorie step in K-107) — an enum constant cannot.
 */
public sealed interface Action {

    ActionType type();

    /** Not enough data, or the window is not full: say so instead of guessing (U3). */
    record NoDecisionYet() implements Action {
        @Override
        public ActionType type() {
            return ActionType.NO_DECISION_YET;
        }
    }

    /** Moving toward the goal and looking right: change nothing. */
    record Continue() implements Action {
        @Override
        public ActionType type() {
            return ActionType.CONTINUE;
        }
    }

    /** Move calories one step in the working direction (K-107 adds the step). */
    record AdjustCalories() implements Action {
        @Override
        public ActionType type() {
            return ActionType.ADJUST_CALORIES;
        }
    }

    /** Safety net: losing too fast, raise calories (U13, K-104). */
    record IncreaseCalories() implements Action {
        @Override
        public ActionType type() {
            return ActionType.INCREASE_CALORIES;
        }
    }

    /** Calories are at the floor: change activity instead of eating less (spec WC-12). */
    record ChangeMovement() implements Action {
        @Override
        public ActionType type() {
            return ActionType.CHANGE_MOVEMENT;
        }
    }

    /** Training is the problem; no calorie decision this week. */
    record FixTraining() implements Action {
        @Override
        public ActionType type() {
            return ActionType.FIX_TRAINING;
        }
    }

    /** Training is fine, recovery is not: protein, sleep. */
    record FixRecovery() implements Action {
        @Override
        public ActionType type() {
            return ActionType.FIX_RECOVERY;
        }
    }

    /** The plan is not being followed; changing it would not help. */
    record FixAdherence() implements Action {
        @Override
        public ActionType type() {
            return ActionType.FIX_ADHERENCE;
        }
    }

    /** Safety net: stop the deficit (rapid loss, low energy availability; U13, K-104). */
    record HardStop() implements Action {
        @Override
        public ActionType type() {
            return ActionType.HARD_STOP;
        }
    }

    /** First rung of the deload ladder: hold the load (K-110). */
    record StopLoadIncrease() implements Action {
        @Override
        public ActionType type() {
            return ActionType.STOP_LOAD_INCREASE;
        }
    }

    /** Second rung: cut volume or load for a week (K-110). */
    record Deload() implements Action {
        @Override
        public ActionType type() {
            return ActionType.DELOAD;
        }
    }

    /** Last rung: a full week off (K-110). */
    record FullRestWeek() implements Action {
        @Override
        public ActionType type() {
            return ActionType.FULL_REST_WEEK;
        }
    }

    /** A short cut inside a bulk. */
    record MiniCut() implements Action {
        @Override
        public ActionType type() {
            return ActionType.MINI_CUT;
        }
    }
}
