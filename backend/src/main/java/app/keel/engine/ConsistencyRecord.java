package app.keel.engine;

/**
 * The consistency number (U15): "{@code onTrackWeeks} of {@code countedWeeks}", never reset (U7), and the current run
 * of on-track weeks, in which one missed week is forgiven and two in a row end the run (04-faz3 §7.3).
 */
public record ConsistencyRecord(int onTrackWeeks, int countedWeeks, int currentRun) {
}
