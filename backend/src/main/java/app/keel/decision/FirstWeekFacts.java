package app.keel.decision;

import app.keel.engine.Experience;
import app.keel.engine.FirstWeekAdjustment;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;
import java.util.function.Supplier;

/**
 * The first week as the call that closes it reads it (K-962, ADR-077 #4). The first week runs from the first day — the day
 * the plan was first shown (K-993), else the day onboarding finished (K-990) — to the day before the first check-in day after it — so the first call comes on day seven at
 * the latest (ADR-071 #1), never before — and the check-in of that day closes it. The first day is not planned: the plan
 * was only just made. Planned: the
 * training weekdays after it, and the signup day itself only when a session was done on it; done: the days with a
 * session, a day off's included; missed: the planned days without one, in the week's order.
 */
final class FirstWeekFacts {

    private FirstWeekFacts() {
    }

    /** The check-in day that closes the first week: the first one after the first day. */
    static LocalDate closingCheckIn(LocalDate began, DayOfWeek checkInDay) {
        return began.with(TemporalAdjusters.next(checkInDay));
    }

    /**
     * The first day on the user's calendar (K-990, ADR-077 Ek 2): the day onboarding finished, the profile's first save; a
     * profile saved before that moment was kept counts from the first sign-in, as it always had.
     */
    static LocalDate firstDay(Optional<Instant> onboarded, Supplier<Instant> firstSignIn, ZoneId zone) {
        return onboarded.orElseGet(firstSignIn).atZone(zone).toLocalDate();
    }

    /**
     * The first day (K-993, ADR-077 Ek 3): the day the plan was first shown; before that was kept, the day onboarding
     * finished, then the first sign-in. The days before it, the plan unseen, are in no week. A plan seen only on or after
     * the first call's day (an old account, a late send) moves nothing: that call closed the first week already.
     */
    static LocalDate firstDay(Optional<Instant> planSeen, Optional<LocalDate> firstCall, Optional<Instant> onboarded, Supplier<Instant> firstSignIn,
            ZoneId zone) {
        return planSeen.map(seen -> seen.atZone(zone).toLocalDate()).filter(seen -> firstCall.map(seen::isBefore).orElse(true))
                .orElseGet(() -> firstDay(onboarded, firstSignIn, zone));
    }

    /** Whether the first call can be made today: from the check-in day that closes the first week on. */
    static boolean firstCallOpen(LocalDate firstDay, DayOfWeek checkInDay, LocalDate today) {
        return !today.isBefore(closingCheckIn(firstDay, checkInDay));
    }

    /** The day the first call is named for: the closing check-in day, or today once it has come without a call. */
    static LocalDate firstCallOn(LocalDate firstDay, DayOfWeek checkInDay, LocalDate today) {
        return firstCallOpen(firstDay, checkInDay, today) ? today : closingCheckIn(firstDay, checkInDay);
    }

    /** The first week, when the check-in of {@code weekOf} closes it; empty for any other check-in. */
    static Optional<FirstWeekAdjustment.Week> of(LocalDate began, DayOfWeek checkInDay, LocalDate weekOf, Set<DayOfWeek> trainingDays,
            Set<LocalDate> sessionDays, int daysPerWeek, Optional<Experience> experience) {
        return of(began, checkInDay, weekOf, day -> trainingDays.contains(day.getDayOfWeek()), sessionDays, daysPerWeek, experience);
    }

    /** As above, planned on the days {@code plannedOn} says: a session moved that week counts where it was moved (K-964). */
    static Optional<FirstWeekAdjustment.Week> of(LocalDate began, DayOfWeek checkInDay, LocalDate weekOf, Predicate<LocalDate> plannedOn,
            Set<LocalDate> sessionDays, int daysPerWeek, Optional<Experience> experience) {
        if (!weekOf.equals(closingCheckIn(began, checkInDay))) {
            return Optional.empty();
        }
        List<LocalDate> after = began.plusDays(1).datesUntil(weekOf).toList();
        List<LocalDate> planned = after.stream().filter(plannedOn).toList();
        int signupDay = sessionDays.contains(began) ? 1 : 0;
        int done = (int) after.stream().filter(sessionDays::contains).count() + signupDay;
        List<DayOfWeek> missed = planned.stream().filter(day -> !sessionDays.contains(day)).map(LocalDate::getDayOfWeek).toList();
        return Optional.of(new FirstWeekAdjustment.Week(planned.size() + signupDay, done, daysPerWeek, missed, experience));
    }
}
