package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** When the check-in asks whether a declared state is still so (K-516, ADR-038 #5): the third paused week running. */
class StillSoTests {

    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 7);
    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 5);

    @Test
    void aDayInEachOfTheLastThreeWeeksAndOneInForceToday() {
        Set<LocalDate> declared = Set.of(MONDAY.minusWeeks(2), MONDAY.minusDays(1), WEDNESDAY);

        assertThat(CheckInQuestions.asksWhetherStillSo(true, declared, WEDNESDAY, 3)).isTrue();
        assertThat(CheckInQuestions.asksWhetherStillSo(false, declared, WEDNESDAY, 3)).as("over already: nothing to ask").isFalse();
    }

    @Test
    void aWeekWithoutADeclaredDayBreaksTheRun() {
        // Sunday 27 Sep is the week before the three: weeks of 21 Sep (none), 28 Sep, 5 Oct.
        Set<LocalDate> declared = Set.of(MONDAY.minusWeeks(2).minusDays(1), MONDAY.minusDays(1), WEDNESDAY);

        assertThat(CheckInQuestions.asksWhetherStillSo(true, declared, WEDNESDAY, 3)).isFalse();
    }

    @Test
    void twoWeeksAreNotThree() {
        assertThat(CheckInQuestions.asksWhetherStillSo(true, Set.of(MONDAY.minusDays(1), WEDNESDAY), WEDNESDAY, 3)).isFalse();
        assertThat(CheckInQuestions.asksWhetherStillSo(true, Set.of(MONDAY.minusDays(1), WEDNESDAY), WEDNESDAY, 2)).isTrue();
    }
}
