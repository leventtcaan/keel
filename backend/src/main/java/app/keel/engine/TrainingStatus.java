package app.keel.engine;

/**
 * Where training stands for the deload ladder (K-110), summarised by the training module from the set log.
 * All counts are about the same lift: the most-stalled compound lift.
 *
 * @param stalledSessions consecutive sessions with neither more reps nor more load
 * @param weeksLoadHeld completed weekly reviews since the ladder's first rung (stop adding load) took effect; 0 = not held
 * @param monthsStalled whole months that lift has been stalled (so never more than 0 without a stalled session)
 * @param deloadedLastWeek whether last week was a deload: the return is gradual (G7 K-72) and the deload week itself
 *     cannot add load, so without this the ladder would call for a deload every week
 */
public record TrainingStatus(int stalledSessions, int weeksLoadHeld, int monthsStalled, boolean deloadedLastWeek) {

    public TrainingStatus {
        if (stalledSessions < 0 || weeksLoadHeld < 0 || monthsStalled < 0) {
            throw new IllegalArgumentException("Counts are 0 or more, got " + stalledSessions + ", " + weeksLoadHeld + ", " + monthsStalled);
        }
        if (monthsStalled > 0 && stalledSessions == 0) {
            throw new IllegalArgumentException("Months stalled need a stalled lift; got " + monthsStalled + " months and no stalled session");
        }
    }
}
