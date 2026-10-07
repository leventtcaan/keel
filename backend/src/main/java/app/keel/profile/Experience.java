package app.keel.profile;

/**
 * Contract Experience: how long the user has trained (ADR-072 #3). It changes the onboarding's flow and hints, and one
 * engine rule: the first week's "add a day" is only for someone not just starting (ADR-077 #4). A level is still not
 * counted in years (G1 K-73).
 */
public enum Experience { NEW, UNDER_1Y, Y1_3, Y3_PLUS }
