package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Experience;
import app.keel.engine.FirstWeekAdjustment;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * The first week the call that closes it reads (K-962, ADR-077 #4): from the first day — the day onboarding finished (K-990,
 * ADR-077 Ek 2) — to the day before the first check-in day after it; planned on the training weekdays, done on the days with
 * a session, missed in the week's order. No check-in before that day.
 */
class FirstWeekFactsTests {

    // A Wednesday; the check-in day Monday: the first week is Wednesday to Sunday, closed by the check-in of the 12th.
    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 7);
    private static final LocalDate NEXT_MONDAY = LocalDate.of(2026, 10, 12);
    private static final Set<DayOfWeek> MON_WED_FRI = Set.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
    private static final Optional<Experience> EXPERIENCED = Optional.of(Experience.Y1_3);

    @Test
    void aSessionMovedOffItsWeekdayIsPlannedWhereItWasMoved() {
        // Begun on a Tuesday, Mon/Wed/Fri; Wednesday's session moved to Thursday (K-964) and done there, Friday's done.
        LocalDate tuesday = WEDNESDAY.minusDays(1);
        LocalDate thursday = WEDNESDAY.plusDays(1);
        Predicate<LocalDate> moved = day -> !day.equals(WEDNESDAY) && (day.equals(thursday) || MON_WED_FRI.contains(day.getDayOfWeek()));

        Optional<FirstWeekAdjustment.Week> week = FirstWeekFacts.of(tuesday, DayOfWeek.MONDAY, NEXT_MONDAY, moved,
                Set.of(thursday, WEDNESDAY.plusDays(2)), 3, EXPERIENCED);

        assertThat(week).contains(new FirstWeekAdjustment.Week(2, 2, 3, List.of(), EXPERIENCED));
    }

    @Test
    void theFirstCheckInDayAfterTheFirstDayClosesIt() {
        assertThat(FirstWeekFacts.closingCheckIn(WEDNESDAY, DayOfWeek.MONDAY)).isEqualTo(NEXT_MONDAY);
        // Begun on the check-in day itself: that day's check-in is not the first week's, the next one is (day seven).
        assertThat(FirstWeekFacts.closingCheckIn(NEXT_MONDAY, DayOfWeek.MONDAY)).isEqualTo(NEXT_MONDAY.plusWeeks(1));
    }

    @ParameterizedTest(name = "signed in {0}, finished {1}: on {2} the first call is {3}, open {4}")
    @CsvSource(nullValues = "-", value = {
            // Sunday 23:58 sign-in, Monday finish: the week counts from Monday, so Monday itself has no call; the next one does.
            "2026-10-11T23:58, 2026-10-12T00:05, 2026-10-12, 2026-10-19, false",
            "2026-10-11T23:58, 2026-10-12T00:05, 2026-10-18, 2026-10-19, false",
            "2026-10-11T23:58, 2026-10-12T00:05, 2026-10-19, 2026-10-19, true",
            // Days between sign-in and finish: they are not the first week; it starts on Wednesday, the finishing day.
            "2026-10-09T10:00, 2026-10-14T18:00, 2026-10-12, 2026-10-19, false",
            // A Wednesday finish: no check-in that day or any day to Sunday; Monday has one.
            "2026-10-14T09:00, 2026-10-14T09:20, 2026-10-14, 2026-10-19, false",
            "2026-10-14T09:00, 2026-10-14T09:20, 2026-10-16, 2026-10-19, false",
            "2026-10-14T09:00, 2026-10-14T09:20, 2026-10-19, 2026-10-19, true",
            // Monday came and went without a call (onboarding resumed late, or no check-in yet): open, today.
            "2026-10-14T09:00, 2026-10-14T09:20, 2026-10-21, 2026-10-21, true",
            // Onboarded before the day was kept: counted from the first sign-in, as before (Wednesday: Monday).
            "2026-10-14T09:00, -, 2026-10-14, 2026-10-19, false",
            "2026-10-14T09:00, -, 2026-10-19, 2026-10-19, true",
    })
    void theFirstCallComesOnTheFirstCheckInDayAfterOnboardingFinished(String signedIn, String finished, LocalDate today, LocalDate firstCall,
            boolean open) {
        ZoneId istanbul = ZoneId.of("Europe/Istanbul");
        Optional<Instant> onboarded = Optional.ofNullable(finished).map(at -> LocalDateTime.parse(at).atZone(istanbul).toInstant());

        LocalDate firstDay = FirstWeekFacts.firstDay(onboarded, () -> LocalDateTime.parse(signedIn).atZone(istanbul).toInstant(), istanbul);

        assertThat(FirstWeekFacts.firstCallOn(firstDay, DayOfWeek.MONDAY, today)).isEqualTo(firstCall);
        assertThat(FirstWeekFacts.firstCallOpen(firstDay, DayOfWeek.MONDAY, today)).isEqualTo(open);
    }

    @Test
    void theFirstDayIsTheUsersCalendarsNotUtcs() {
        // Monday 00:05 in Istanbul is Sunday 21:05 UTC: the first day is Monday where the user lives.
        Instant finished = LocalDateTime.parse("2026-10-12T00:05").atZone(ZoneId.of("Europe/Istanbul")).toInstant();

        assertThat(FirstWeekFacts.firstDay(Optional.of(finished), () -> finished, ZoneId.of("Europe/Istanbul"))).isEqualTo(NEXT_MONDAY);
        assertThat(FirstWeekFacts.firstDay(Optional.of(finished), () -> finished, ZoneId.of("UTC"))).isEqualTo(NEXT_MONDAY.minusDays(1));
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
