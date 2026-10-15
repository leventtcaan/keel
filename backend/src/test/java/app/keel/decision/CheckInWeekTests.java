package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * The check-in week and the day the next call opens (K-212, K-1024): one rule, read as "is this week taken" and as "when
 * is the next call", which must never disagree.
 */
class CheckInWeekTests {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 12);

    @Test
    void theNextCallOpensOnTheCheckInDayAWeekOnWhateverDayTheCallWasMade() {
        // The call's week is named by its check-in day; a call made on the Thursday of it is still that week's.
        assertThat(CheckInWeek.nextCallOn(MONDAY, DayOfWeek.MONDAY)).isEqualTo(LocalDate.of(2026, 10, 19));
    }

    @Test
    void aCheckInDayChangedSinceMovesTheNextCallToTheFirstSuchDayOnOrAfterAWeekOn() {
        // A call kept in the week named Monday 12 Oct; the user now checks in on Fridays: the next opens Friday 23 Oct.
        assertThat(CheckInWeek.nextCallOn(MONDAY, DayOfWeek.FRIDAY)).isEqualTo(LocalDate.of(2026, 10, 23));
        // On Sundays: Sunday 25 Oct. A day equal to a week on counts (Monday to Monday).
        assertThat(CheckInWeek.nextCallOn(MONDAY, DayOfWeek.SUNDAY)).isEqualTo(LocalDate.of(2026, 10, 25));
        assertThat(CheckInWeek.nextCallOn(MONDAY, DayOfWeek.MONDAY)).isEqualTo(MONDAY.plusWeeks(1));
    }

    @Test
    void theWeekIsTakenUntilTheDayTheNextCallOpensAndOpenFromThen() {
        // Every check-in day, a call kept in a Monday week, each day for three weeks after: taken exactly before nextCallOn.
        for (DayOfWeek checkInDay : DayOfWeek.values()) {
            LocalDate opens = CheckInWeek.nextCallOn(MONDAY, checkInDay);
            for (LocalDate day = MONDAY; day.isBefore(MONDAY.plusWeeks(3)); day = day.plusDays(1)) {
                boolean taken = CheckInWeek.taken(CheckInWeek.weekOf(day, checkInDay), Optional.of(MONDAY));
                assertThat(taken).as("check-in day %s, day %s, opens %s", checkInDay, day, opens).isEqualTo(day.isBefore(opens));
            }
        }
    }
}
