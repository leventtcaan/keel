package app.keel.engine;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Objects;

/**
 * One week's four kinds of planned action (K-111) and how many of each were done. A week with nothing planned is left
 * out of the count, but it must still be passed: a missing week is not the same as an empty one.
 */
public record WeekTally(LocalDate weekStart, ActionTally training, ActionTally protein, ActionTally steps, ActionTally weighIns) {

    public WeekTally {
        Objects.requireNonNull(weekStart, "weekStart");
        Objects.requireNonNull(training, "training");
        Objects.requireNonNull(protein, "protein");
        Objects.requireNonNull(steps, "steps");
        Objects.requireNonNull(weighIns, "weighIns");
        if (weekStart.getDayOfWeek() != Consistency.WEEK_STARTS_ON) {
            throw new IllegalArgumentException("A week starts on " + Consistency.WEEK_STARTS_ON + ", got " + weekStart);
        }
    }

    public int planned() {
        return training.planned() + protein.planned() + steps.planned() + weighIns.planned();
    }

    /** Done actions, each kind counted up to its own plan. */
    public int done() {
        return training.counted() + protein.counted() + steps.counted() + weighIns.counted();
    }
}
