package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * When the check-in asks whether a declared state is still so (K-516, ADR-038 #5): the third paused week running — and,
 * once the user said it is, again only that many weeks later (K-525, ADR-041 #62: every three weeks).
 */
class StillSoTests {

    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 7);
    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 5);

    @Test
    void aDayInEachOfTheLastThreeWeeksAndOneInForceToday() {
        Set<LocalDate> declared = Set.of(MONDAY.minusWeeks(2), MONDAY.minusDays(1), WEDNESDAY);

        assertThat(CheckInQuestions.asksWhetherStillSo(true, declared, WEDNESDAY, 3, Optional.empty())).isTrue();
        assertThat(CheckInQuestions.asksWhetherStillSo(false, declared, WEDNESDAY, 3, Optional.empty())).as("over already: nothing to ask").isFalse();
    }

    @Test
    void aWeekWithoutADeclaredDayBreaksTheRun() {
        // Sunday 27 Sep is the week before the three: weeks of 21 Sep (none), 28 Sep, 5 Oct.
        Set<LocalDate> declared = Set.of(MONDAY.minusWeeks(2).minusDays(1), MONDAY.minusDays(1), WEDNESDAY);

        assertThat(CheckInQuestions.asksWhetherStillSo(true, declared, WEDNESDAY, 3, Optional.empty())).isFalse();
    }

    @Test
    void twoWeeksAreNotThree() {
        assertThat(CheckInQuestions.asksWhetherStillSo(true, Set.of(MONDAY.minusDays(1), WEDNESDAY), WEDNESDAY, 3, Optional.empty())).isFalse();
        assertThat(CheckInQuestions.asksWhetherStillSo(true, Set.of(MONDAY.minusDays(1), WEDNESDAY), WEDNESDAY, 2, Optional.empty())).isTrue();
    }

    @Test
    void stillSoQuietsTheQuestionForAsManyWeeksAsItTakesToAsk() {
        // Six paused weeks running; "still so" said on a Wednesday: asked again in the week three weeks on, not before.
        Set<LocalDate> sixWeeks = java.util.stream.IntStream.rangeClosed(0, 5).mapToObj(weeks -> MONDAY.minusWeeks(weeks).plusDays(1))
                .collect(java.util.stream.Collectors.toSet());
        LocalDate saidOn = WEDNESDAY.minusWeeks(3);

        assertThat(CheckInQuestions.asksWhetherStillSo(true, sixWeeks, WEDNESDAY, 3, Optional.of(saidOn))).as("three weeks on").isTrue();
        assertThat(CheckInQuestions.asksWhetherStillSo(true, sixWeeks, WEDNESDAY, 3, Optional.of(saidOn.plusWeeks(1)))).as("two weeks on")
                .isFalse();
        assertThat(CheckInQuestions.asksWhetherStillSo(true, sixWeeks, WEDNESDAY, 3, Optional.of(WEDNESDAY))).as("this week").isFalse();
    }

    @Test
    void theWeeksAreCountedMondayToSundayNotDayToDay() {
        // Said on the Sunday that ends a week: that week counts as the answer's — three weeks on is this Monday's week,
        // though only 15 days have passed; said on the Monday after, it is not yet.
        Set<LocalDate> sixWeeks = java.util.stream.IntStream.rangeClosed(0, 5).mapToObj(weeks -> MONDAY.minusWeeks(weeks).plusDays(1))
                .collect(java.util.stream.Collectors.toSet());

        assertThat(CheckInQuestions.asksWhetherStillSo(true, sixWeeks, MONDAY, 3, Optional.of(MONDAY.minusWeeks(2).minusDays(1)))).isTrue();
        assertThat(CheckInQuestions.asksWhetherStillSo(true, sixWeeks, MONDAY, 3, Optional.of(MONDAY.minusWeeks(2)))).isFalse();
    }

    @Test
    void stillSoNeverAsksWithoutTheRun() {
        // A "still so" long ago does not make a question where the paused weeks are not three in a row.
        assertThat(CheckInQuestions.asksWhetherStillSo(true, Set.of(WEDNESDAY), WEDNESDAY, 3, Optional.of(WEDNESDAY.minusWeeks(10)))).isFalse();
    }
}
