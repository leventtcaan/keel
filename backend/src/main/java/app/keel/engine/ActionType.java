package app.keel.engine;

/**
 * The closed vocabulary of what the engine can decide. Same list as spec/weekly-checkin.yaml › actions
 * (ActionVocabularyTests). Stored with decisions and used to pick copy, so names are stable identifiers.
 */
public enum ActionType {
    NO_DECISION_YET,
    CONTINUE,
    ADJUST_CALORIES,
    INCREASE_CALORIES,
    CHANGE_MOVEMENT,
    FIX_TRAINING,
    FIX_RECOVERY,
    FIX_ADHERENCE,
    HARD_STOP,
    STOP_LOAD_INCREASE,
    DELOAD,
    FULL_REST_WEEK,
    MINI_CUT,
    CHANGE_PHASE
}
