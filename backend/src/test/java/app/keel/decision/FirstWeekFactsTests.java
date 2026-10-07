package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Experience;
import app.keel.engine.FirstWeekAdjustment;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * The first week the call that closes it reads (K-962, ADR-077 #4): from the account's first day to the day before the
 * first check-in day after it; planned on the training weekdays, done on the days with a session, missed in the week's order.
 */
class FirstWeekFactsTests {

    // A Wednesday; the check-in day Monday: the first week is Wednesday to Sunday, closed by the check-in of the 12th.
    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 7);
    private static final LocalDate NEXT_MONDAY = LocalDate.of(2026, 10, 12);
    private static final Set<DayOfWeek> MON_WED_FRI = Set.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
    private static final Optional<Experience> EXPERIENCED = Optional.of(Experience.Y1_3);

    @Test
    void theFirstCheckInDayAfterTheFirstDayClosesIt() {
        assertThat(FirstWeekFacts.closingCheckIn(WEDNESDAY, DayOfWeek.MONDAY)).isEqualTo(NEXT_MONDAY);
        // Begun on the check-in day itself: that day's check-in is not the first week's, the next one is (day seven).
        assertThat(FirstWeekFacts.closingCheckIn(NEXT_MONDAY, DayOfWeek.MONDAY)).isEqualTo(NEXT_MONDAY.plusWeeks(1));
    }

    @Test
    void plannedDoneAndMissedOnTheUsersCalendar() {
        // Planned Wednesday and Friday (Monday is not in the week); Friday's session done, and one on Saturday.
        Optional<FirstWeekAdjustment.Week> week = FirstWeekFacts.of(WEDNESDAY, DayOfWeek.MONDAY, NEXT_MONDAY, MON_WED_FRI,
                Set.of(WEDNESDAY.plusDays(2), WEDNESDAY.plusDays(3)), 3, EXPERIENCED);

        assertThat(week).contains(new FirstWeekAdjustment.Week(2, 2, 3, List.of(DayOfWeek.WEDNESDAY), EXPERIENCED));
    }

    @Test
    void missedDaysComeInTheWeeksOrderNotTheWeekdays() {
        // Begun on a Friday, check-in Thursday: Friday comes before Monday and Wednesday.
        LocalDate friday = LocalDate.of(2026, 10, 9);
        Optional<FirstWeekAdjustment.Week> week = FirstWeekFacts.of(friday, DayOfWeek.THURSDAY, LocalDate.of(2026, 10, 15), MON_WED_FRI, Set.of(),
                3, Optional.empty());

        assertThat(week.map(FirstWeekAdjustment.Week::missed)).contains(List.of(DayOfWeek.FRIDAY, DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY));
    }

    @Test
    void aSessionOnTheCheckInDayItselfIsNextWeeks() {
        Optional<FirstWeekAdjustment.Week> week = FirstWeekFacts.of(WEDNESDAY, DayOfWeek.MONDAY, NEXT_MONDAY, MON_WED_FRI, Set.of(NEXT_MONDAY), 3,
                EXPERIENCED);

        assertThat(week.map(FirstWeekAdjustment.Week::done)).contains(0);
    }

    @Test
    void anyOtherCheckInIsNotTheFirstWeeks() {
        assertThat(FirstWeekFacts.of(WEDNESDAY, DayOfWeek.MONDAY, NEXT_MONDAY.plusWeeks(1), MON_WED_FRI, Set.of(), 3, EXPERIENCED)).isEmpty();
        assertThat(FirstWeekFacts.of(NEXT_MONDAY, DayOfWeek.MONDAY, NEXT_MONDAY, MON_WED_FRI, Set.of(), 3, EXPERIENCED))
                .as("the account's own first day").isEmpty();
    }
}
