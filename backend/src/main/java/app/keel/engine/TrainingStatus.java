package app.keel.engine;

/**
 * Where training stands for the deload ladder (K-110), summarised from the set log by the training module.
 *
 * @param stalledSessions consecutive sessions of the most-stalled compound lift with neither more reps nor more load
 * @param loadHeld whether the ladder's first rung (stop adding load) is already in place
 * @param monthsWithoutProgress whole months at the same loads
 */
public record TrainingStatus(int stalledSessions, boolean loadHeld, int monthsWithoutProgress) {

    public TrainingStatus {
        if (stalledSessions < 0 || monthsWithoutProgress < 0) {
            throw new IllegalArgumentException("Counts are 0 or more, got " + stalledSessions + " sessions, " + monthsWithoutProgress + " months");
        }
    }
}
