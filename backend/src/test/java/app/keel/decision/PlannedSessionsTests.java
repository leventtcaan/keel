package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.training.ProgramPeriod;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Size;
import org.junit.jupiter.api.Test;

/**
 * The sessions a week asks (K-535, ADR-045 #79): each week by the program it had — the profile's training days before
 * the first program. A week in which the program changed is judged by the fewest any program in it asked: neither a
 * program raised mid-week nor one lowered asks for more than the user had planned (U7).
 */
class PlannedSessionsTests {

    private static final ZoneId ISTANBUL = ZoneId.of("Europe/Istanbul");
    private static final LocalDate MON_28_SEP = LocalDate.of(2026, 9, 28);
    private static final int PROFILE_DAYS = 2;

    @Test
    void withoutAProgramTheProfilesDaysAreAsked() {
        assertThat(PlannedSessions.inWeek(List.of(), PROFILE_DAYS, MON_28_SEP, ISTANBUL)).isEqualTo(2);
    }

    @Test
    void aWeekIsJudgedByTheProgramItHadNotTodays() {
        // Three days from 1 Sep, five from Sunday 11 Oct: the weeks before keep three; the week of 12 Oct is five.
        List<ProgramPeriod> history = List.of(at(LocalDate.of(2026, 9, 1), 12, 3), at(LocalDate.of(2026, 10, 11), 9, 5));

        assertThat(PlannedSessions.inWeek(history, PROFILE_DAYS, MON_28_SEP, ISTANBUL)).isEqualTo(3);
        assertThat(PlannedSessions.inWeek(history, PROFILE_DAYS, MON_28_SEP.plusWeeks(1), ISTANBUL)).isEqualTo(3);
        assertThat(PlannedSessions.inWeek(history, PROFILE_DAYS, MON_28_SEP.plusWeeks(2), ISTANBUL)).isEqualTo(5);
    }

    @Test
    void weeksBeforeTheFirstProgramAreTheProfiles() {
        List<ProgramPeriod> history = List.of(at(LocalDate.of(2026, 10, 11), 9, 4));

        assertThat(PlannedSessions.inWeek(history, PROFILE_DAYS, MON_28_SEP, ISTANBUL)).isEqualTo(2);
        assertThat(PlannedSessions.inWeek(history, PROFILE_DAYS, LocalDate.of(2026, 10, 12), ISTANBUL)).isEqualTo(4);
    }

    @Test
    void aWeekTheProgramChangedInAsksTheFewest() {
        // Raised from three to five on Wednesday: that week three, the next five.
        List<ProgramPeriod> raised = List.of(at(LocalDate.of(2026, 9, 1), 12, 3), at(MON_28_SEP.plusDays(2), 18, 5));
        assertThat(PlannedSessions.inWeek(raised, PROFILE_DAYS, MON_28_SEP, ISTANBUL)).isEqualTo(3);
        assertThat(PlannedSessions.inWeek(raised, PROFILE_DAYS, MON_28_SEP.plusWeeks(1), ISTANBUL)).isEqualTo(5);
        // Lowered from five to three on Wednesday: three that week too — the week before, five.
        List<ProgramPeriod> lowered = List.of(at(LocalDate.of(2026, 9, 1), 12, 5), at(MON_28_SEP.plusDays(2), 18, 3));
        assertThat(PlannedSessions.inWeek(lowered, PROFILE_DAYS, MON_28_SEP, ISTANBUL)).isEqualTo(3);
        assertThat(PlannedSessions.inWeek(lowered, PROFILE_DAYS, MON_28_SEP.minusWeeks(1), ISTANBUL)).isEqualTo(5);
        // The first program, of four, on Wednesday of a week the profile asked two: two.
        assertThat(PlannedSessions.inWeek(List.of(at(MON_28_SEP.plusDays(2), 18, 4)), PROFILE_DAYS, MON_28_SEP, ISTANBUL)).isEqualTo(2);
    }

    @Test
    void theWeekRunsMondayToMondayOnTheUsersCalendar() {
        // Made at 00:00 on Monday in Istanbul: in force when that week began, the week is its alone; the week before ended
        // as it began.
        List<ProgramPeriod> atMidnight = List.of(at(LocalDate.of(2026, 9, 1), 12, 3), at(MON_28_SEP, 0, 0, 5));
        assertThat(PlannedSessions.inWeek(atMidnight, PROFILE_DAYS, MON_28_SEP, ISTANBUL)).isEqualTo(5);
        assertThat(PlannedSessions.inWeek(atMidnight, PROFILE_DAYS, MON_28_SEP.minusWeeks(1), ISTANBUL)).isEqualTo(3);
        // At 01:00 on Monday in Istanbul it is 22:00 on Sunday in UTC: the same instant changes the week of 28 Sep for a
        // user in Istanbul, and the week before for a user in UTC.
        List<ProgramPeriod> atOne = List.of(at(LocalDate.of(2026, 9, 1), 12, 3), at(MON_28_SEP, 1, 0, 5));
        assertThat(PlannedSessions.inWeek(atOne, PROFILE_DAYS, MON_28_SEP, ISTANBUL)).isEqualTo(3);
        assertThat(PlannedSessions.inWeek(atOne, PROFILE_DAYS, MON_28_SEP, java.time.ZoneOffset.UTC)).isEqualTo(5);
        assertThat(PlannedSessions.inWeek(atOne, PROFILE_DAYS, MON_28_SEP.minusWeeks(1), java.time.ZoneOffset.UTC)).isEqualTo(3);
    }

    @Test
    void twoProgramsAtTheSameMomentTheLaterInTheListIsInForce() {
        // Replaced twice within one instant (the list is oldest first): the second is the program from then on.
        Instant same = MON_28_SEP.minusDays(3).atStartOfDay(ISTANBUL).toInstant();
        List<ProgramPeriod> history = List.of(new ProgramPeriod(same, 2), new ProgramPeriod(same, 4));

        assertThat(PlannedSessions.inWeek(history, PROFILE_DAYS, MON_28_SEP, ISTANBUL)).isEqualTo(4);
    }

    @Property
    void aWeekAsksOneOfItsProgramsAndNoMoreThanAny(@ForAll @Size(max = 6) List<@IntRange(min = 0, max = 7) Integer> sessions,
            @ForAll @Size(min = 6, max = 6) List<@IntRange(min = 0, max = 400) Integer> hoursApart, @ForAll @IntRange(min = 0, max = 7) int profile,
            @ForAll @IntRange(min = -3, max = 3) int weekOffset) {
        List<ProgramPeriod> history = new ArrayList<>();
        Instant from = MON_28_SEP.minusWeeks(2).atStartOfDay(ISTANBUL).toInstant();
        for (int i = 0; i < sessions.size(); i++) {
            from = from.plusSeconds(3600L * hoursApart.get(i));
            history.add(new ProgramPeriod(from, sessions.get(i)));
        }
        LocalDate monday = MON_28_SEP.plusWeeks(weekOffset);
        Instant start = monday.atStartOfDay(ISTANBUL).toInstant();
        Instant end = monday.plusWeeks(1).atStartOfDay(ISTANBUL).toInstant();
        int atStart = history.stream().filter(period -> !period.from().isAfter(start)).reduce((a, b) -> b).map(ProgramPeriod::sessionsPerWeek)
                .orElse(profile);

        int asked = PlannedSessions.inWeek(history, profile, monday, ISTANBUL);

        List<Integer> inForce = new ArrayList<>(List.of(atStart));
        history.stream().filter(period -> period.from().isAfter(start) && period.from().isBefore(end)).map(ProgramPeriod::sessionsPerWeek)
                .forEach(inForce::add);
        assertThat(inForce).allSatisfy(planned -> assertThat(asked).isLessThanOrEqualTo(planned)).contains(asked);
    }

    private static ProgramPeriod at(LocalDate day, int hour, int sessions) {
        return at(day, hour, 0, sessions);
    }

    private static ProgramPeriod at(LocalDate day, int hour, int minute, int sessions) {
        return new ProgramPeriod(LocalDateTime.of(day, java.time.LocalTime.of(hour, minute)).atZone(ISTANBUL).toInstant(), sessions);
    }
}
