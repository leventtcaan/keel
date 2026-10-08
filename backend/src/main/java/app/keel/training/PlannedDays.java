package app.keel.training;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The days a session is planned on (K-964, ADR-073 Ek 3): the training weekdays, except that a session moved in its week
 * is planned on the day it was moved to and not on its weekday. A skipped session stays planned: it is a session not done,
 * nothing is planned again (U7). What the missed-session question and the first week read.
 */
public record PlannedDays(Set<DayOfWeek> weekdays, Set<LocalDate> movedFrom, Set<LocalDate> movedTo) {

    public PlannedDays {
        weekdays = Set.copyOf(weekdays);
        movedFrom = Set.copyOf(movedFrom);
        movedTo = Set.copyOf(movedTo);
    }

    /** The same weekdays every week, nothing moved (the profile's days, without a program). */
    public static PlannedDays weekly(Set<DayOfWeek> weekdays) {
        return new PlannedDays(weekdays, Set.of(), Set.of());
    }

    /** Whether a session is planned on {@code day}. */
    public boolean on(LocalDate day) {
        return movedTo.contains(day) || weekdays.contains(day.getDayOfWeek()) && !movedFrom.contains(day);
    }

    /** The program's days and the week changes kept for them; a change to a day the program no longer has is not read. */
    static PlannedDays of(List<ProgramStore.Day> days, List<SessionChangeStore.Row> changes) {
        Map<UUID, ProgramStore.Day> byId = days.stream().collect(Collectors.toMap(ProgramStore.Day::id, Function.identity()));
        Set<LocalDate> from = new HashSet<>();
        Set<LocalDate> to = new HashSet<>();
        for (SessionChangeStore.Row row : changes) {
            ProgramStore.Day day = byId.get(row.programDayId());
            LocalDate on = row.change().onDate();
            if (day == null || on == null) {
                continue;
            }
            LocalDate planned = TodayChanges.plannedDate(day, row.weekOf());
            if (!on.equals(planned)) {
                to.add(on);
                if (planned != null) {
                    from.add(planned);
                }
            }
        }
        return new PlannedDays(days.stream().map(ProgramStore.Day::weekday).filter(Objects::nonNull).collect(Collectors.toSet()), from, to);
    }
}
