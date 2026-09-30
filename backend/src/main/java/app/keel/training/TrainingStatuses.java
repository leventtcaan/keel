package app.keel.training;

import app.keel.engine.TrainingStatus;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * Where training stands for the deload ladder (K-221, K-110), summarised from the set log and the ladder's own changes:
 *
 * <ul>
 *   <li><b>Stalled sessions</b>: from the latest back, sessions with neither more load nor, at the same load, more reps
 *       than the one before (H3 B5) — for the most-stalled compound lift.</li>
 *   <li><b>Months stalled</b>: whole months since that lift's last session that went up.</li>
 *   <li><b>Loads below last week</b>: this week's top load of that lift under last week's (G7 K-68 rung 3).</li>
 *   <li><b>Weeks load held</b>: check-in weeks since the first rung's hold began (K-217).</li>
 *   <li><b>Rested last week</b>: a lighter week or a week off in force on any of the last seven days (G7 K-72).</li>
 *   <li><b>Weeks plan missed</b>: Monday weeks, back from the week just over, with fewer training days than asked,
 *       counted no further back than the program or the first workout logged, a week off skipped (G7 K-73).</li>
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

    /**
     * Completed weekly reviews since the first rung: check-in weeks from the earliest open hold's week to today's. A hold
     * applied days after its call still counts at the next check-in, and a second hold does not restart the count.
     */
    static int weeksLoadHeld(List<TrainingChanges.Change> changes, LocalDate today, DayOfWeek checkInDay) {
        return changes.stream().filter(change -> change.kind() == TrainingChanges.Kind.HOLD_LOAD && !today.isBefore(change.startsOn())
                        && (change.endsOn() == null || !today.isAfter(change.endsOn())))
                .map(TrainingChanges.Change::startsOn).min(Comparator.naturalOrder())
                .map(first -> (int) ChronoUnit.WEEKS.between(first.with(TemporalAdjusters.previousOrSame(checkInDay)),
                        today.with(TemporalAdjusters.previousOrSame(checkInDay))))
                .orElse(0);
    }

    static boolean restedLastWeek(List<TrainingChanges.Change> changes, LocalDate today) {
        LocalDate from = today.minusDays(DAYS_PER_WEEK);
        LocalDate to = today.minusDays(1);
        return changes.stream().filter(change -> change.kind() != TrainingChanges.Kind.HOLD_LOAD)
                .anyMatch(change -> !change.startsOn().isAfter(to) && (change.endsOn() == null || !change.endsOn().isBefore(from)));
    }

    /**
     * Monday weeks back from the week just over with fewer training days than asked. Not before the program, nor before
     * the first workout logged (not logging is not failing to train: U3, U7, as K-220); a week overlapping a week off
     * the ladder ordered is neither kept nor missed.
     */
    static int weeksPlanMissed(List<LocalDate> workoutDays, List<TrainingChanges.Change> changes, int plannedPerWeek, LocalDate today,
            LocalDate since) {
        Optional<LocalDate> firstWorkout = workoutDays.stream().min(Comparator.naturalOrder());
        if (plannedPerWeek == 0 || firstWorkout.isEmpty()) {
            return 0;
        }
        LocalDate from = firstWorkout.get().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        int missed = 0;
        for (LocalDate week = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(1);
                !week.isBefore(since) && !week.isBefore(from); week = week.minusWeeks(1)) {
            LocalDate monday = week;
            LocalDate sunday = week.plusDays(DAYS_PER_WEEK - 1L);
            boolean rested = changes.stream().anyMatch(change -> change.kind() == TrainingChanges.Kind.REST_WEEK
                    && !change.startsOn().isAfter(sunday) && (change.endsOn() == null || !change.endsOn().isBefore(monday)));
            if (rested) {
                continue;
            }
            long days = workoutDays.stream().filter(day -> !day.isBefore(monday) && !day.isAfter(sunday)).distinct().count();
            if (days >= plannedPerWeek) {
                break;
            }
            missed++;
        }
        return missed;
    }

    /** The status of the most-stalled compound lift, with the ladder's changes and the plan kept. */
    static TrainingStatus of(Map<String, List<Session>> compoundLifts, List<TrainingChanges.Change> changes, List<LocalDate> workoutDays,
            int plannedPerWeek, LocalDate today, DayOfWeek checkInDay, LocalDate since) {
        // The most stalled; on a tie the longer stall, then the one going backwards, then by name: the same lift whatever the order.
        List<Session> worst = compoundLifts.entrySet().stream()
                .max(Comparator.<Map.Entry<String, List<Session>>>comparingInt(lift -> stalledSessions(lift.getValue()))
                        .thenComparingInt(lift -> monthsStalled(lift.getValue(), today))
                        .thenComparing(lift -> loadsBelowLastWeek(lift.getValue(), today))
                        .thenComparing(Map.Entry::getKey, Comparator.reverseOrder()))
                .map(Map.Entry::getValue).orElse(List.of());
        return new TrainingStatus(stalledSessions(worst), weeksLoadHeld(changes, today, checkInDay), monthsStalled(worst, today), restedLastWeek(changes, today),
                loadsBelowLastWeek(worst, today), weeksPlanMissed(workoutDays, changes, plannedPerWeek, today, since));
    }

    private static boolean wentUp(Session before, Session after) {
        int load = after.topLoadKg().compareTo(before.topLoadKg());
        return load > 0 || (load == 0 && after.repsAtTop() > before.repsAtTop());
    }

    private static Optional<BigDecimal> top(List<Session> sessions, LocalDate from, LocalDate to) {
        return sessions.stream().filter(session -> !session.day().isBefore(from) && !session.day().isAfter(to)).map(Session::topLoadKg)
                .max(Comparator.naturalOrder());
    }

    /** One session per workout, oldest first: its day on the user's calendar, the top load and the most reps at it. */
    static List<Session> sessions(List<TrainingLog.WorkSet> sets, ZoneId zone) {
        return sets.stream().collect(Collectors.groupingBy(TrainingLog.WorkSet::at, TreeMap::new, Collectors.toList())).entrySet().stream()
                .map(workout -> {
                    BigDecimal top = workout.getValue().stream().map(TrainingLog.WorkSet::loadKg).max(Comparator.naturalOrder()).orElseThrow();
                    int reps = workout.getValue().stream().filter(set -> set.loadKg().compareTo(top) == 0).mapToInt(TrainingLog.WorkSet::reps).max()
                            .orElseThrow();
                    return new Session(workout.getKey().atZone(zone).toLocalDate(), top, reps);
                }).toList();
    }
}
