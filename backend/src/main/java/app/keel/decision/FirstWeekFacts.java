package app.keel.decision;

import app.keel.engine.Experience;
import app.keel.engine.FirstWeekAdjustment;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * The first week as the call that closes it reads it (K-962, ADR-077 #4). The first week runs from the account's first
 * day to the day before the first check-in day after it — so the first call comes on day seven at the latest (ADR-071
 * #1) — and the check-in of that day closes it. The signup day is not planned: the plan was only just made. Planned: the
 * training weekdays after it, and the signup day itself only when a session was done on it; done: the days with a
 * session, a day off's included; missed: the planned days without one, in the week's order.
 */
final class FirstWeekFacts {

    private FirstWeekFacts() {
    }

    /** The check-in day that closes the first week: the first one after the account's first day. */
    static LocalDate closingCheckIn(LocalDate began, DayOfWeek checkInDay) {
        return began.with(TemporalAdjusters.next(checkInDay));
    }

    /** The first week, when the check-in of {@code weekOf} closes it; empty for any other check-in. */
    static Optional<FirstWeekAdjustment.Week> of(LocalDate began, DayOfWeek checkInDay, LocalDate weekOf, Set<DayOfWeek> trainingDays,
            Set<LocalDate> sessionDays, int daysPerWeek, Optional<Experience> experience) {
        if (!weekOf.equals(closingCheckIn(began, checkInDay))) {
            return Optional.empty();
        }
        List<LocalDate> after = began.plusDays(1).datesUntil(weekOf).toList();
        List<LocalDate> planned = after.stream().filter(day -> trainingDays.contains(day.getDayOfWeek())).toList();
        int signupDay = sessionDays.contains(began) ? 1 : 0;
        int done = (int) after.stream().filter(sessionDays::contains).count() + signupDay;
        List<DayOfWeek> missed = planned.stream().filter(day -> !sessionDays.contains(day)).map(LocalDate::getDayOfWeek).toList();
        return Optional.of(new FirstWeekAdjustment.Week(planned.size() + signupDay, done, daysPerWeek, missed, experience));
    }
}
