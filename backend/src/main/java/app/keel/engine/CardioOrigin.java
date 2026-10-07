package app.keel.engine;

/** Who set a cardio prescription: the engine's default, or the user (ADR-074 #4), which the engine never overwrites. */
public enum CardioOrigin {
    GENERATED,
    USER
}
