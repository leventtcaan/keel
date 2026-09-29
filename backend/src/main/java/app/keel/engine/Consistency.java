package app.keel.engine;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Objects;

/**
 * The daily number: consistency (U15, Levent 29 Sep). Weekly, cumulative, never reset, one missed week forgiven
 * (U7; 04-faz3 §7.3: gym data's one-week tolerance, Lally 2010, Duolingo's streak freeze).
 */
public final class Consistency {

    /** Weeks run Monday to Sunday: the weekly check-in is on Monday (Levent, 29 Sep). */
    static final DayOfWeek WEEK_STARTS_ON = DayOfWeek.MONDAY;

    private Consistency() {
    }

    /** Done over planned, capped at 1: extra work is welcome but does not make up for another week. */
    public static BigDecimal weekRatio(WeekTally week) {
        if (week.planned() == 0) {
            throw new IllegalArgumentException("A week with nothing planned has no ratio");
        }
        return BigDecimal.valueOf(Math.min(week.done(), week.planned()))
                .divide(BigDecimal.valueOf(week.planned()), MathContext.DECIMAL64);
    }

    /**
     * The record over weeks given oldest first. A week is on track at on_track_min_ratio or above (Güray G2 K-60:
     * 70 % of the plan is success).
     */
    public static ConsistencyRecord record(List<WeekTally> weeks, Parameters parameters) {
        Objects.requireNonNull(weeks, "weeks");
        for (int i = 1; i < weeks.size(); i++) {
            if (!weeks.get(i).weekStart().isAfter(weeks.get(i - 1).weekStart())) {
                throw new IllegalArgumentException("Weeks must be oldest first, one tally per week: " + weeks.get(i).weekStart());
            }
        }
        BigDecimal onTrackLine = BigDecimal.valueOf(parameters.number(ParameterKey.ON_TRACK_MIN_RATIO));
        int onTrack = 0;
        int counted = 0;
        int run = 0;
        int missesInARow = 0;
        for (WeekTally week : weeks) {
            if (week.planned() == 0) {
                continue; // nothing planned: neither a success nor a miss
            }
            counted++;
            if (weekRatio(week).compareTo(onTrackLine) >= 0) {
                onTrack++;
                run++;
                missesInARow = 0;
            } else if (++missesInARow >= 2) {
                run = 0; // a second missed week in a row ends the run; the cumulative count stays
            }
        }
        return new ConsistencyRecord(onTrack, counted, run);
    }

    /**
     * The Monday that starts the week containing {@code moment} in the user's home time zone. The home zone, not the
     * phone's current zone, so a trip never moves a week (L3 P13); the engine never reads the machine's zone.
     */
    public static LocalDate weekStartOf(Instant moment, ZoneId homeZone) {
        return moment.atZone(homeZone).toLocalDate().with(TemporalAdjusters.previousOrSame(WEEK_STARTS_ON));
    }
}
