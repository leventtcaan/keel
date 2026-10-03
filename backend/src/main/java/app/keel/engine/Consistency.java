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
import java.util.Optional;

/**
 * The daily number: consistency (U15, product decision 29 Sep). Weekly, cumulative, never reset, one missed week forgiven
 * (U7; 04-faz3 §7.3: gym data's one-week tolerance, Lally 2010, Duolingo's streak freeze).
 */
public final class Consistency {

    /** Weeks run Monday to Sunday: the weekly check-in is on Monday (product decision, 29 Sep). */
    public static final DayOfWeek WEEK_STARTS_ON = DayOfWeek.MONDAY;

    private Consistency() {
    }

    /** Done over planned, each kind of action counted up to its own plan (so never above 1). */
    public static BigDecimal weekRatio(WeekTally week) {
        if (week.planned() == 0) {
            throw new IllegalArgumentException("A week with nothing planned has no ratio");
        }
        return BigDecimal.valueOf(week.done())
                .divide(BigDecimal.valueOf(week.planned()), MathContext.DECIMAL64);
    }

    /**
     * Adherence over a decision window (ADR-020 L-6: the spine's adherence is this ratio): everything done over
     * everything planned in those weeks, each kind capped at its plan; a paused week (K-516) left out. Empty when nothing
     * was planned.
     */
    public static Optional<BigDecimal> windowRatio(List<WeekTally> weeks) {
        List<WeekTally> counted = weeks.stream().filter(week -> !week.paused()).toList();
        int planned = counted.stream().mapToInt(WeekTally::planned).sum();
        if (planned == 0) {
            return Optional.empty();
        }
        int done = counted.stream().mapToInt(WeekTally::done).sum();
        return Optional.of(BigDecimal.valueOf(done).divide(BigDecimal.valueOf(planned), MathContext.DECIMAL64));
    }

    /**
     * The record over weeks given oldest first. A week is on track at on_track_min_ratio or above (coaching experience, G2 K-60:
     * 70 % of the plan is success).
     */
    public static ConsistencyRecord record(List<WeekTally> weeks, Parameters parameters) {
        Walk walk = walk(weeks, parameters);
        return new ConsistencyRecord(walk.onTrack(), walk.counted(), walk.run());
    }

    /**
     * Whether the last of the weeks, given oldest first, is the one missed week the run forgave (04 §7.3): a miss right
     * after a week on track. A miss with no run before it forgives nothing; a paused or unplanned week is skipped between,
     * and is never itself forgiven. Its use is the leading sign of dropping off (I1 F3; K-513).
     */
    public static boolean lastWeekForgiven(List<WeekTally> weeks, Parameters parameters) {
        return walk(weeks, parameters).lastForgiven();
    }

    /** The run walked once, for both readers. */
    private record Walk(int onTrack, int counted, int run, boolean lastForgiven) {
    }

    private static Walk walk(List<WeekTally> weeks, Parameters parameters) {
        Objects.requireNonNull(weeks, "weeks");
        for (int i = 1; i < weeks.size(); i++) {
            // Consecutive weeks: a week left out would silently count as "nothing planned" and flatter a user who
            // stopped for weeks. The caller passes an empty week explicitly.
            if (!weeks.get(i).weekStart().equals(weeks.get(i - 1).weekStart().plusWeeks(1))) {
                throw new IllegalArgumentException("Weeks must be consecutive, oldest first: " + weeks.get(i - 1).weekStart()
                        + " then " + weeks.get(i).weekStart());
            }
        }
        BigDecimal onTrackLine = BigDecimal.valueOf(parameters.number(ParameterKey.ON_TRACK_MIN_RATIO));
        int onTrack = 0;
        int counted = 0;
        int run = 0;
        int missesInARow = 0;
        boolean forgiven = false;
        for (WeekTally week : weeks) {
            forgiven = false;
            if (week.planned() == 0 || week.paused()) {
                continue; // nothing planned, or paused by a declared state (K-516): neither a success nor a miss
            }
            counted++;
            if (weekRatio(week).compareTo(onTrackLine) >= 0) {
                onTrack++;
                run++;
                missesInARow = 0;
            } else if (++missesInARow >= 2) {
                run = 0; // a second missed week in a row ends the run; the cumulative count stays
            } else {
                forgiven = run > 0; // a lone miss keeps a run going; with no run there is nothing to forgive
            }
        }
        return new Walk(onTrack, counted, run, forgiven);
    }

    /**
     * The Monday that starts the week containing {@code moment} in the user's home time zone. The home zone, not the
     * phone's current zone, so a trip never moves a week (L3 P13); the engine never reads the machine's zone.
     */
    public static LocalDate weekStartOf(Instant moment, ZoneId homeZone) {
        return moment.atZone(homeZone).toLocalDate().with(TemporalAdjusters.previousOrSame(WEEK_STARTS_ON));
    }
}
