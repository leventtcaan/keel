package app.keel.engine;

/**
 * How active a user is over a whole day, training included, for the starting calorie estimate (NASEM 2023 Table 7-1
 * via H6 A3: "low active" is daily life plus 60-80 minutes of walking, "very active" adds cycling, running, tennis).
 * How the question is asked is a product call; the engine only needs the answer, or its absence.
 */
public enum ActivityLevel { INACTIVE, LOW_ACTIVE, ACTIVE, VERY_ACTIVE }
