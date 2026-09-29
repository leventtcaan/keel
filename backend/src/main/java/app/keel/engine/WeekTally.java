package app.keel.engine;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Objects;

/**
 * One week's planned actions (training sessions, protein days, step days, weigh-ins) and how many were done. Each
 * action counts once; a week with nothing planned is left out of the count.
 */
public record WeekTally(LocalDate weekStart, int planned, int done) {

    public WeekTally {
        Objects.requireNonNull(weekStart, "weekStart");
        if (weekStart.getDayOfWeek() != Consistency.WEEK_STARTS_ON) {
            throw new IllegalArgumentException("A week starts on " + Consistency.WEEK_STARTS_ON + ", got " + weekStart);
        }
        if (planned < 0 || done < 0) {
            throw new IllegalArgumentException("Planned and done are 0 or more, got " + planned + " and " + done);
        }
    }
}
