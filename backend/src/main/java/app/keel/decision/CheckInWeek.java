package app.keel.decision;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/**
 * The check-in week on the user's calendar (K-212, L3 P13): named by its check-in day, the latest one up to today in the
 * user's own time zone — so a trip does not move the week, and the week turns on the user's chosen day.
 */
final class CheckInWeek {

    private CheckInWeek() {
    }

    static LocalDate weekOf(LocalDate today, DayOfWeek checkInDay) {
        return today.with(TemporalAdjusters.previousOrSame(checkInDay));
    }

    /** Whether this week already has its call: the last call's week and this one overlap (one call a week, K-212). */
    static boolean taken(LocalDate weekOf, java.util.Optional<LocalDate> lastCallWeek) {
        return lastCallWeek.filter(last -> weekOf.isBefore(last.plusWeeks(1))).isPresent();
    }
}
