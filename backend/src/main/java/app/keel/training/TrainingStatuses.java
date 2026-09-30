package app.keel.training;

import app.keel.engine.TrainingStatus;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Where training stands for the deload ladder (K-221, K-110), summarised from the set log and the ladder's own changes:
 *
 * <ul>
 *   <li><b>Stalled sessions</b>: from the latest back, sessions with neither more load nor, at the same load, more reps
 *       than the one before (H3 B5) — for the most-stalled compound lift.</li>
 *   <li><b>Months stalled</b>: whole months since that lift's last session that went up.</li>
 *   <li><b>Loads below last week</b>: this week's top load of that lift under last week's (G7 K-68 rung 3).</li>
 *   <li><b>Weeks load held</b>: whole weeks since the hold in force began (K-217).</li>
 *   <li><b>Rested last week</b>: a lighter week or a week off in force on any of the last seven days (G7 K-72).</li>
 *   <li><b>Weeks plan missed</b>: Monday weeks, back from the week just over, with fewer training days than asked,
 *       counted no further back than the program (G7 K-73).</li>
 * </ul>
 */
final class TrainingStatuses {

    /** One session of a lift: its day, the top load and the most reps done at it. */
    record Session(LocalDate day, BigDecimal topLoadKg, int repsAtTop) {
    }

    private static final int DAYS_PER_WEEK = 7;

    private TrainingStatuses() {
    }

    /** Sessions oldest first. */
    static int stalledSessions(List<Session> sessions) {
        int stalled = 0;
        for (int i = sessions.size() - 1; i > 0 && !wentUp(sessions.get(i - 1), sessions.get(i)); i--) {
            stalled++;
        }
        return stalled;
    }

    static int monthsStalled(List<Session> sessions, LocalDate today) {
        int stalled = stalledSessions(sessions);
        if (stalled == 0) {
            return 0;
        }
        LocalDate lastUp = sessions.get(sessions.size() - 1 - stalled).day();
        return (int) Period.between(lastUp, today).toTotalMonths();
    }

    static boolean loadsBelowLastWeek(List<Session> sessions, LocalDate today) {
        Optional<BigDecimal> thisWeek = top(sessions, today.minusDays(DAYS_PER_WEEK - 1L), today);
        Optional<BigDecimal> lastWeek = top(sessions, today.minusDays(2L * DAYS_PER_WEEK - 1), today.minusDays(DAYS_PER_WEEK));
        return thisWeek.isPresent() && lastWeek.isPresent() && thisWeek.get().compareTo(lastWeek.get()) < 0;
    }

    static int weeksLoadHeld(List<TrainingChanges.Change> changes, LocalDate today) {
        return TrainingChanges.inForce(changes, TrainingChanges.Kind.HOLD_LOAD, today)
                .map(hold -> (int) (ChronoUnit.DAYS.between(hold.startsOn(), today) / DAYS_PER_WEEK)).orElse(0);
    }

    static boolean restedLastWeek(List<TrainingChanges.Change> changes, LocalDate today) {
        LocalDate from = today.minusDays(DAYS_PER_WEEK);
        LocalDate to = today.minusDays(1);
        return changes.stream().filter(change -> change.kind() != TrainingChanges.Kind.HOLD_LOAD)
                .anyMatch(change -> !change.startsOn().isAfter(to) && (change.endsOn() == null || !change.endsOn().isBefore(from)));
    }

    static int weeksPlanMissed(List<LocalDate> workoutDays, int plannedPerWeek, LocalDate today, LocalDate since) {
        if (plannedPerWeek == 0) {
            return 0;
        }
        int missed = 0;
        LocalDate week = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(1);
        for (; !week.isBefore(since); week = week.minusWeeks(1)) {
            LocalDate monday = week;
            long days = workoutDays.stream().filter(day -> !day.isBefore(monday) && day.isBefore(monday.plusWeeks(1))).distinct().count();
            if (days >= plannedPerWeek) {
                break;
            }
            missed++;
        }
        return missed;
    }

    /** The status of the most-stalled compound lift, with the ladder's changes and the plan kept. */
    static TrainingStatus of(Map<String, List<Session>> compoundLifts, List<TrainingChanges.Change> changes, List<LocalDate> workoutDays,
            int plannedPerWeek, LocalDate today, LocalDate since) {
        List<Session> worst = compoundLifts.values().stream()
                .max(Comparator.<List<Session>>comparingInt(TrainingStatuses::stalledSessions).thenComparingInt(lift -> monthsStalled(lift, today)))
                .orElse(List.of());
        return new TrainingStatus(stalledSessions(worst), weeksLoadHeld(changes, today), monthsStalled(worst, today), restedLastWeek(changes, today),
                loadsBelowLastWeek(worst, today), weeksPlanMissed(workoutDays, plannedPerWeek, today, since));
    }

    private static boolean wentUp(Session before, Session after) {
        int load = after.topLoadKg().compareTo(before.topLoadKg());
        return load > 0 || (load == 0 && after.repsAtTop() > before.repsAtTop());
    }

    private static Optional<BigDecimal> top(List<Session> sessions, LocalDate from, LocalDate to) {
        return sessions.stream().filter(session -> !session.day().isBefore(from) && !session.day().isAfter(to)).map(Session::topLoadKg)
                .max(Comparator.naturalOrder());
    }
}
