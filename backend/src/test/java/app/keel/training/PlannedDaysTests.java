package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * The days the program plans a session on (K-964), as the missed-session question and the first week read them: each day
 * on its weekday, unless that week moved it; a skipped session stays planned (not done, nothing planned again: U7).
 */
class PlannedDaysTests {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 5);
    private static final ProgramStore.Day UPPER = day(DayOfWeek.MONDAY);
    private static final ProgramStore.Day LOWER = day(DayOfWeek.TUESDAY);
    private static final ProgramStore.Day PUSH = day(DayOfWeek.THURSDAY);
    private static final ProgramStore.Day ANYDAY = day(null);

    @Test
    void withoutChangesTheWeekdays() {
        PlannedDays planned = PlannedDays.of(List.of(UPPER, PUSH, ANYDAY), List.of());

        assertThat(MONDAY.datesUntil(MONDAY.plusWeeks(1)).filter(planned::on)).containsExactly(MONDAY, MONDAY.plusDays(3));
        assertThat(PlannedDays.weekly(Set.of(DayOfWeek.FRIDAY)).on(MONDAY.plusDays(4))).isTrue();
    }

    @Test
    void aMovedSessionIsPlannedOnItsNewDayOnlyThatWeek() {
        // Monday's moved to Tuesday, Tuesday's on to Wednesday (the week re-laid itself).
        PlannedDays planned = PlannedDays.of(List.of(UPPER, LOWER, PUSH), List.of(row(UPPER, MONDAY.plusDays(1)), row(LOWER, MONDAY.plusDays(2))));

        assertThat(MONDAY.datesUntil(MONDAY.plusWeeks(1)).filter(planned::on)).containsExactly(MONDAY.plusDays(1), MONDAY.plusDays(2), MONDAY.plusDays(3));
        assertThat(planned.on(MONDAY.plusWeeks(1))).as("next week's Monday").isTrue();
        assertThat(planned.on(MONDAY.minusWeeks(1))).as("last week's Monday").isTrue();
    }

    @Test
    void aSkippedSessionStaysPlannedAndADayOnNoWeekdayCountsWhereItWasPut() {
        TodayChanges.Change skipped = TodayChanges.Change.NONE.skip();
        PlannedDays planned = PlannedDays.of(List.of(UPPER, ANYDAY), List.of(new SessionChangeStore.Row(UPPER.id(), MONDAY, skipped),
                row(ANYDAY, MONDAY.plusDays(5))));

        assertThat(MONDAY.datesUntil(MONDAY.plusWeeks(1)).filter(planned::on)).containsExactly(MONDAY, MONDAY.plusDays(5));
    }

    @Test
    void aChangeToADayNoLongerInTheProgramIsNotRead() {
        PlannedDays planned = PlannedDays.of(List.of(UPPER), List.of(row(LOWER, MONDAY.plusDays(4))));

        assertThat(MONDAY.datesUntil(MONDAY.plusWeeks(1)).filter(planned::on)).containsExactly(MONDAY);
    }

    private static SessionChangeStore.Row row(ProgramStore.Day day, LocalDate on) {
        return new SessionChangeStore.Row(day.id(), MONDAY, TodayChanges.Change.NONE.on(on));
    }

    private static ProgramStore.Day day(DayOfWeek weekday) {
        return new ProgramStore.Day(UUID.randomUUID(), null, "Day", weekday, List.of(new ProgramStore.PlannedExercise("squat", 3, 6, 10, 1)));
    }
}
