package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * The days of the week with cardio logged (K-1019, ADR-074 Ek 1): the one walk over the week's sessions that both
 * {@code doneThisWeek} and {@code loggedDays} come from, so the two cannot part. Weeks run Monday to Sunday; 12 Oct 2026
 * is a Monday.
 */
class CardioLoggedWeekTests {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 12);
    private static final LocalDate WEDNESDAY = MONDAY.plusDays(2);
    private static final LocalDate SUNDAY = MONDAY.plusDays(6);

    @Test
    void noSessionsIsNoDay() {
        CardioWeek.LoggedWeek week = CardioWeek.logged(List.of(), MONDAY, WEDNESDAY);

        assertThat(week.days()).isEmpty();
        assertThat(week.today()).isEmpty();
        assertThat(week.doneThisWeek()).isZero();
    }

    @Test
    void aTypedAndAWatchSessionOnOneDayAreThatDaysOneSession() {
        CardioWeek.LoggedWeek week = CardioWeek.logged(List.of(session(WEDNESDAY, CardioStore.Source.MANUAL),
                session(WEDNESDAY, CardioStore.Source.APPLE_HEALTH)), MONDAY, WEDNESDAY);

        assertThat(week.days()).containsExactly(WEDNESDAY);
        assertThat(week.doneThisWeek()).isEqualTo(1);
    }

    @Test
    void theDaysComeOldestFirstWhateverTheOrderTheyWereLoggedIn() {
        CardioWeek.LoggedWeek week = CardioWeek.logged(List.of(session(SUNDAY, CardioStore.Source.MANUAL), session(MONDAY, CardioStore.Source.APPLE_HEALTH),
                session(WEDNESDAY, CardioStore.Source.MANUAL)), MONDAY, WEDNESDAY);

        assertThat(week.days()).containsExactly(MONDAY, WEDNESDAY, SUNDAY);
    }

    @Test
    void lastSundayAndNextMondayAreOtherWeeks() {
        CardioWeek.LoggedWeek week = CardioWeek.logged(List.of(session(MONDAY.minusDays(1), CardioStore.Source.MANUAL),
                session(SUNDAY.plusDays(1), CardioStore.Source.APPLE_HEALTH), session(MONDAY, CardioStore.Source.MANUAL),
                session(SUNDAY, CardioStore.Source.MANUAL)), MONDAY, WEDNESDAY);

        assertThat(week.days()).containsExactly(MONDAY, SUNDAY);
    }

    @Test
    void doneThisWeekIsAlwaysTheNumberOfLoggedDays() {
        List<CardioStore.Logged> sessions = List.of(session(MONDAY, CardioStore.Source.MANUAL), session(MONDAY, CardioStore.Source.MANUAL),
                session(MONDAY, CardioStore.Source.APPLE_HEALTH), session(WEDNESDAY, CardioStore.Source.APPLE_HEALTH), session(SUNDAY, CardioStore.Source.MANUAL));

        CardioWeek.LoggedWeek week = CardioWeek.logged(sessions, MONDAY, WEDNESDAY);

        assertThat(week.doneThisWeek()).isEqualTo(week.days().size()).isEqualTo(3);
    }

    @Test
    void todaysSessionIsTheTypedOneWhenThereAreBothBecauseThatOneCanBeTakenBack() {
        CardioStore.Logged typed = session(WEDNESDAY, CardioStore.Source.MANUAL);
        CardioStore.Logged watch = session(WEDNESDAY, CardioStore.Source.APPLE_HEALTH);

        assertThat(CardioWeek.logged(List.of(watch, typed), MONDAY, WEDNESDAY).today()).contains(typed);
        assertThat(CardioWeek.logged(List.of(typed, watch), MONDAY, WEDNESDAY).today()).contains(typed);
    }

    @Test
    void todaysSessionIsTheWatchsWhenThatIsAll() {
        CardioStore.Logged watch = session(WEDNESDAY, CardioStore.Source.APPLE_HEALTH);

        assertThat(CardioWeek.logged(List.of(watch), MONDAY, WEDNESDAY).today()).contains(watch);
    }

    @Test
    void anotherDaysSessionIsNotTodays() {
        CardioWeek.LoggedWeek week = CardioWeek.logged(List.of(session(MONDAY, CardioStore.Source.MANUAL)), MONDAY, WEDNESDAY);

        assertThat(week.days()).containsExactly(MONDAY);
        assertThat(week.today()).isEmpty();
    }

    @Test
    void twoTypedSessionsTodayGiveTheSameOneEveryTimeSoTakingThemBackGoesOneByOne() {
        CardioStore.Logged first = new CardioStore.Logged(UUID.fromString("00000000-0000-0000-0000-000000000001"), UUID.randomUUID(), WEDNESDAY, 20,
                CardioStore.Source.MANUAL, null);
        CardioStore.Logged second = new CardioStore.Logged(UUID.fromString("00000000-0000-0000-0000-000000000002"), UUID.randomUUID(), WEDNESDAY, 25,
                CardioStore.Source.MANUAL, null);

        assertThat(CardioWeek.logged(List.of(second, first), MONDAY, WEDNESDAY).today()).contains(first);
        assertThat(CardioWeek.logged(List.of(first, second), MONDAY, WEDNESDAY).today()).contains(first);
    }

    private static CardioStore.Logged session(LocalDate day, CardioStore.Source source) {
        return new CardioStore.Logged(UUID.randomUUID(), UUID.randomUUID(), day, 30, source, null);
    }
}
