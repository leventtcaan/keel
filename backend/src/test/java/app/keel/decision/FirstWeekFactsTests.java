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
    void theSignupDayIsNotPlannedSoWednesdayNeverDidntHappen() {
        // Signed up on a Wednesday, a Mon/Wed/Fri plan, Friday done: the week planned Friday only, and it happened.
        Optional<FirstWeekAdjustment.Week> week = FirstWeekFacts.of(WEDNESDAY, DayOfWeek.MONDAY, NEXT_MONDAY, MON_WED_FRI,
                Set.of(WEDNESDAY.plusDays(2)), 3, EXPERIENCED);

        assertThat(week).contains(new FirstWeekAdjustment.Week(1, 1, 3, List.of(), EXPERIENCED));
    }

    @Test
    void aSessionOnTheSignupDayCountsAsPlannedAndDone() {
        // Done on the day the account began, planned or not: it counts, and so does the day.
        Optional<FirstWeekAdjustment.Week> week = FirstWeekFacts.of(WEDNESDAY, DayOfWeek.MONDAY, NEXT_MONDAY, Set.of(DayOfWeek.FRIDAY),
                Set.of(WEDNESDAY), 1, EXPERIENCED);

        assertThat(week).contains(new FirstWeekAdjustment.Week(2, 1, 1, List.of(DayOfWeek.FRIDAY), EXPERIENCED));
    }

    @Test
    void plannedDoneAndMissedOnTheUsersCalendar() {
        // Begun on a Tuesday: Wednesday and Friday planned; Friday's session done, and one on Saturday.
        LocalDate tuesday = WEDNESDAY.minusDays(1);
        Optional<FirstWeekAdjustment.Week> week = FirstWeekFacts.of(tuesday, DayOfWeek.MONDAY, NEXT_MONDAY, MON_WED_FRI,
                Set.of(WEDNESDAY.plusDays(2), WEDNESDAY.plusDays(3)), 3, EXPERIENCED);

        assertThat(week).contains(new FirstWeekAdjustment.Week(2, 2, 3, List.of(DayOfWeek.WEDNESDAY), EXPERIENCED));
    }

    @Test
    void begunTheDayBeforeTheCheckInNothingIsPlanned() {
        // A Sunday signup with a Monday check-in: no day after the signup day in the week, so nothing to adjust.
        LocalDate sunday = NEXT_MONDAY.minusDays(1);

        assertThat(FirstWeekFacts.of(sunday, DayOfWeek.MONDAY, NEXT_MONDAY, MON_WED_FRI, Set.of(), 3, EXPERIENCED).map(FirstWeekAdjustment.Week::planned))
                .contains(0);
    }

    @Test
    void theNamesOfExperienceAreTheProfilesOwn() {
        // DecisionService maps the profile's answer to the engine's by name (ADR-072 #3).
        assertThat(java.util.Arrays.stream(Experience.values()).map(Enum::name).toList())
                .isEqualTo(java.util.Arrays.stream(app.keel.profile.Experience.values()).map(Enum::name).toList());
    }

    @Test
    void missedDaysComeInTheWeeksOrderNotTheWeekdays() {
        // Begun on a Thursday, check-in Thursday: Friday comes before Monday and Wednesday.
        LocalDate thursday = LocalDate.of(2026, 10, 8);
        Optional<FirstWeekAdjustment.Week> week = FirstWeekFacts.of(thursday, DayOfWeek.THURSDAY, LocalDate.of(2026, 10, 15), MON_WED_FRI, Set.of(),
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
