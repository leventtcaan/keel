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

    /**
     * The day the call after one made in the check-in week {@code lastCallWeek} opens (K-1024): the first check-in day on or
     * after a week from that week's name. The same rule as {@link #taken}, read the other way: a week is open once its name,
     * the latest check-in day up to a day, is not before {@code lastCallWeek + 1 week}; that first happens on this day. The day
     * the call itself was made on does not move it (a call made on Thursday of a Monday week still opens the next on Monday).
     */
    static LocalDate nextCallOn(LocalDate lastCallWeek, DayOfWeek checkInDay) {
        return lastCallWeek.plusWeeks(1).with(TemporalAdjusters.nextOrSame(checkInDay));
    }
}
