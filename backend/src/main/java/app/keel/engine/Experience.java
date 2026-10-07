package app.keel.engine;

/**
 * How long the user has trained (ADR-072 #3), as the engine reads it. One rule reads it: the first week's "add a day" is
 * for someone not just starting (G6 K-36: three days are enough for a beginner; ADR-077 #4). The profile's names.
 */
public enum Experience { NEW, UNDER_1Y, Y1_3, Y3_PLUS }
