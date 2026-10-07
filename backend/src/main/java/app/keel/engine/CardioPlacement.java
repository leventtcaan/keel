package app.keel.engine;

/**
 * Where a cardio session sits in the week (ADR-074 #1, #3). There is no "before lifting": cardio right before a weight
 * session costs that session's performance (G2 K-35), so the model cannot say it.
 */
public enum CardioPlacement {
    /** On a training day, after the weights. */
    AFTER_LIFT,
    /** On a day without weights, at a very low pace (G2 K-36). */
    OFF_DAY_LOW_INTENSITY
}
