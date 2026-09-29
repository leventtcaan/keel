package app.keel.engine;

/**
 * How far this user's logs run under (positive) or over (negative) what their weight shows, in kcal a day, and over how
 * many windows it was learned (K-115). A property of logging, not of the person: it is never shown as blame (U7).
 */
public record IntakeBias(int kcalPerDay, int windows) {

    /** A logged day's intake as the weight trend says it really was. */
    public int corrected(int loggedKcal) {
        return loggedKcal + kcalPerDay;
    }
}
