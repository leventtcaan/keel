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
            case ChangePhase _ -> ActionType.CHANGE_PHASE;
            case AddTrainingDay _ -> ActionType.ADD_TRAINING_DAY;
            case MoveMissedSessions _ -> ActionType.MOVE_MISSED_SESSIONS;
        };
    }

    /** Not enough data, or the window is not full: say so instead of guessing (U3). */
    record NoDecisionYet() implements Action {
    }

    /** Moving toward the goal and looking right: change nothing. */
    record Continue() implements Action {
    }

    /**
     * Move calories one step (K-107): {@code kcalPerDay} is the signed change to the daily target, e.g. -500 on a
     * stalled cut, +250 on a stalled bulk. Macros follow from the new target (K-108), so a bulk step lands on carbs.
     */
    record AdjustCalories(int kcalPerDay) implements Action {

        public AdjustCalories {
            if (kcalPerDay == 0) {
                throw new IllegalArgumentException("A calorie adjustment changes the target; 0 kcal is not one");
            }
        }
    }

    /**
     * Safety net: narrow the deficit — losing too fast, or too little energy left after training (U13, K-104).
     * {@code kcalPerDay} is how much the daily target goes up (K-107).
     */
    record IncreaseCalories(int kcalPerDay) implements Action {

        public IncreaseCalories {
            if (kcalPerDay <= 0) {
                throw new IllegalArgumentException("An increase is positive, was " + kcalPerDay);
            }
        }
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

    /**
     * The one hard stop (U13, K-104): a reported loss of the menstrual cycle ends any deficit — calories at least at
     * maintenance, and a doctor is suggested (J1 C6, ADR-020 L-1). Rapid loss and low energy availability narrow the
     * deficit instead ({@link IncreaseCalories}).
     */
    record HardStop() implements Action {
    }

    /** First rung of the deload ladder: hold the load (K-110). */
    record StopLoadIncrease() implements Action {
    }

    /** Second rung: a lighter week. {@code setsFactor} scales the weekly sets (deload_volume_factor; G7 K-68, K-110). */
    record Deload(java.math.BigDecimal setsFactor) implements Action {

        public Deload {
            java.util.Objects.requireNonNull(setsFactor, "setsFactor");
        }
    }

    /** Last rung: a full week off (K-110). */
    record FullRestWeek() implements Action {
    }

    /**
     * A short cut inside a long bulk whose appetite has gone (G7 K-102): minWeeks to maxWeeks of deficit, then the bulk
     * resumes with appetite back.
     */
    record MiniCut(int minWeeks, int maxWeeks) implements Action {

        public MiniCut {
            if (minWeeks <= 0 || maxWeeks < minWeeks) {
                throw new IllegalArgumentException("A mini cut lasts a positive range of weeks, got " + minWeeks + "-" + maxWeeks);
            }
        }
    }

    /**
     * The phase gate turns the direction: a bulk above the fat ceiling becomes a cut, a cut below the working band
     * becomes a bulk (K-105). Staying at maintenance is not a direction (coaching experience, 03 §2.1). The first action that
     * carries data: the phase to switch to.
     */
    record ChangePhase(Phase to) implements Action {

        public ChangePhase {
            java.util.Objects.requireNonNull(to, "to");
        }
    }

    /**
     * The first week's call (ADR-077 #4, G6 K-36): every planned session done and "I could do more", so one more training
     * day a week. {@code toDays} is the new count; {@code idealDays} the count it moves toward (training_days_ideal_min),
     * for the words; which day is the user's to pick. {@code suggested}: the days proposed for it, none a training day
     * already (K-1000, ADR-077 Ek 3); empty when the training weekdays are not known.
     */
    record AddTrainingDay(int toDays, int idealDays, java.util.List<java.time.DayOfWeek> suggested) implements Action {

        /** Without a suggestion (a call kept before K-1000). */
        public AddTrainingDay(int toDays, int idealDays) {
            this(toDays, idealDays, java.util.List.of());
        }

        public AddTrainingDay {
            suggested = java.util.List.copyOf(suggested);
            if (toDays < 1 || toDays > idealDays) {
                throw new IllegalArgumentException("One more day is at least one and at most the ideal " + idealDays + ", was " + toDays);
            }
        }
    }

    /**
     * The first week's call (ADR-077 #4, 03 §2.9: adherence before a new plan): most of the week's sessions didn't happen,
     * so the {@code missed} weekdays — planned, without a session, in the week's order — move to days that fit. The number
     * of training days stays. {@code suggested}: a day for a missed one, in the same order, as many as there are free days,
     * none a training day already and none twice (K-1000, ADR-077 Ek 3); empty when the training weekdays are not known.
     */
    record MoveMissedSessions(java.util.List<java.time.DayOfWeek> missed, java.util.List<java.time.DayOfWeek> suggested) implements Action {

        /** Without a suggestion (a call kept before K-1000). */
        public MoveMissedSessions(java.util.List<java.time.DayOfWeek> missed) {
            this(missed, java.util.List.of());
        }

        public MoveMissedSessions {
            missed = java.util.List.copyOf(missed);
            suggested = java.util.List.copyOf(suggested);
            if (missed.isEmpty()) {
                throw new IllegalArgumentException("Moving missed sessions needs a missed day");
            }
        }
    }
}
