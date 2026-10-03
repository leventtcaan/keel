package app.keel.engine;

/**
 * The consistency number (U15): "{@code onTrackWeeks} of {@code countedWeeks}", never reset (U7), and the current run
 * of on-track weeks, in which one missed week is forgiven and two in a row end the run (04-faz3 §7.3).
 * {@code forgivenWeeks}: the missed weeks a run forgave, over the whole record, never reset (K-608).
 */
public record ConsistencyRecord(int onTrackWeeks, int countedWeeks, int currentRun, int forgivenWeeks) {

    /** Without forgiven weeks. */
    public ConsistencyRecord(int onTrackWeeks, int countedWeeks, int currentRun) {
        this(onTrackWeeks, countedWeeks, currentRun, 0);
    }
}
