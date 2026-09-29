package app.keel.engine;

/**
 * How active a user is beyond training, for the starting calorie estimate (NASEM 2023 categories via H6 A3). How the
 * question is asked is a product call; the engine only needs the answer, or its absence.
 */
public enum ActivityLevel { INACTIVE, LOW_ACTIVE, ACTIVE, VERY_ACTIVE }
