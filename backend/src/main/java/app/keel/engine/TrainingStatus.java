package app.keel.engine;

/**
 * Where training stands for the deload ladder (K-110), summarised by the training module from the set log.
 * All counts are about the same lift: the most-stalled compound lift.
 *
 * @param stalledSessions consecutive sessions with neither more reps nor more load
 * @param weeksLoadHeld completed weekly reviews since the ladder's first rung (stop adding load) took effect; 0 = not held
 * @param monthsStalled whole months that lift has been stalled (so never more than 0 without a stalled session)
 * @param restedLastWeek whether last week was a deload or a full week off: the return is gradual (G7 K-72), and
 *     neither week can add load or follow the plan, so without this the ladder would call for rest every week
 * @param loadsBelowLastWeek this week's sessions could not lift last week's loads: going backwards, not stalling
 *     (G7 K-68 rung 3)
 * @param weeksPlanMissed consecutive weeks, up to this one, in which the planned sessions were not done as planned
 *     (G7 K-73: that is what overtraining means operationally); 0 = this week went to plan
 */
public record TrainingStatus(int stalledSessions, int weeksLoadHeld, int monthsStalled, boolean restedLastWeek,
        boolean loadsBelowLastWeek, int weeksPlanMissed) {

    public TrainingStatus {
        if (stalledSessions < 0 || weeksLoadHeld < 0 || monthsStalled < 0 || weeksPlanMissed < 0) {
            throw new IllegalArgumentException("Counts are 0 or more, got " + stalledSessions + ", " + weeksLoadHeld + ", "
                    + monthsStalled + ", " + weeksPlanMissed);
        }
        if (monthsStalled > 0 && stalledSessions == 0) {
            throw new IllegalArgumentException("Months stalled need a stalled lift; got " + monthsStalled + " months and no stalled session");
        }
    }

    /** A status with the plan kept and last week's loads lifted: only the stall counters say anything. */
    public TrainingStatus(int stalledSessions, int weeksLoadHeld, int monthsStalled, boolean restedLastWeek) {
        this(stalledSessions, weeksLoadHeld, monthsStalled, restedLastWeek, false, 0);
    }

    public TrainingStatus withLoadsBelowLastWeek(boolean below) {
        return new TrainingStatus(stalledSessions, weeksLoadHeld, monthsStalled, restedLastWeek, below, weeksPlanMissed);
    }

    public TrainingStatus withWeeksPlanMissed(int weeks) {
        return new TrainingStatus(stalledSessions, weeksLoadHeld, monthsStalled, restedLastWeek, loadsBelowLastWeek, weeks);
    }
}
