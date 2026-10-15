package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.decision.ReturnGap.Suggestion;
import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.Sex;
import app.keel.training.ReturnAnswers;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The return question's rules (K-1020, ADR-077 #5 and Ek 8), pure: the gap from the last log to today, when it is asked,
 * when it is not asked again, what is offered first, and the day of the next call. The thresholds are read from the
 * parameter files; the expected decisions are literal.
 */
class ReturnGapTests {

    private static final Parameters P = RepositoryParameters.set().forSex(Sex.MALE);
    private static final int PROMPT_DAYS = P.wholeNumber(ParameterKey.RETURN_PROMPT_DAYS);
    private static final int STEP_BACK_DAYS = 7 * P.wholeNumber(ParameterKey.RETURN_STEP_BACK_AFTER_WEEKS);
    private static final ZoneId UTC = ZoneOffset.UTC;
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);

    private static Optional<LocalDate> daysAgo(int days) {
        return Optional.of(TODAY.minusDays(days));
    }

    private static Optional<ReturnAnswers.Answer> answered(ReturnAnswers.Choice choice, LocalDate gapFrom) {
        return answered(choice, gapFrom, 1);
    }

    private static Optional<ReturnAnswers.Answer> answered(ReturnAnswers.Choice choice, LocalDate gapFrom, int daysAgo) {
        return Optional.of(new ReturnAnswers.Answer(choice, gapFrom, TODAY.minusDays(daysAgo).atTime(8, 0).toInstant(ZoneOffset.UTC)));
    }

    @Test
    void theQuestionIsAskedAfterSevenDaysForTheProduct() {
        // ADR-077 #5: return_prompt_days lives in windows.yaml, tag urun, 7; the phone never holds the number.
        assertThat(PROMPT_DAYS).isEqualTo(7);
    }

    @ParameterizedTest(name = "{0}: {1} days away is asked: {2}")
    @MethodSource("limit")
    void sixDaysAwayIsNotAskedAndSevenIs(String name, int away, boolean asked) {
        assertThat(ReturnGap.shouldPrompt(daysAgo(away), TODAY, Optional.empty(), UTC, P)).isEqualTo(asked);
        assertThat(ReturnGap.hasGap(daysAgo(away), TODAY, P)).isEqualTo(asked);
        assertThat(ReturnGap.awayDays(daysAgo(away), TODAY)).isEqualTo(away);
    }

    static Stream<Arguments> limit() {
        return Stream.of(
                Arguments.of("today", 0, false),
                Arguments.of("yesterday", 1, false),
                Arguments.of("one below", PROMPT_DAYS - 1, false),
                Arguments.of("exactly", PROMPT_DAYS, true),
                Arguments.of("one over", PROMPT_DAYS + 1, true),
                Arguments.of("months", 90, true));
    }

    @Test
    void aUserWithNoLogIsNewNotReturning() {
        assertThat(ReturnGap.shouldPrompt(Optional.empty(), TODAY, Optional.empty(), UTC, P)).isFalse();
        assertThat(ReturnGap.hasGap(Optional.empty(), TODAY, P)).isFalse();
        assertThat(ReturnGap.awayDays(Optional.empty(), TODAY)).isZero();
    }

    @Test
    void aLogOnADayAfterTodayIsNoGap() {
        // The user's calendar moved west since the log: the gap is not negative.
        assertThat(ReturnGap.awayDays(Optional.of(TODAY.plusDays(1)), TODAY)).isZero();
        assertThat(ReturnGap.shouldPrompt(Optional.of(TODAY.plusDays(1)), TODAY, Optional.empty(), UTC, P)).isFalse();
    }

    @Test
    void theLastLogIsTheLatestOfEveryKind() {
        assertThat(ReturnGap.lastLog(daysAgo(30), daysAgo(9), Optional.empty(), daysAgo(12))).isEqualTo(daysAgo(9));
        assertThat(ReturnGap.lastLog(Optional.empty(), Optional.empty())).isEmpty();
    }

    @Test
    void anAnswerSilencesTheGapItWasGivenFor() {
        LocalDate lastLog = TODAY.minusDays(PROMPT_DAYS + 3);

        for (ReturnAnswers.Choice choice : ReturnAnswers.Choice.values()) {
            assertThat(ReturnGap.shouldPrompt(Optional.of(lastLog), TODAY, answered(choice, lastLog), UTC, P)).as(choice.name()).isFalse();
        }
        // The same gap, a day older (a log deleted since): still the one answered.
        assertThat(ReturnGap.shouldPrompt(Optional.of(lastLog.minusDays(1)), TODAY, answered(ReturnAnswers.Choice.PICK_UP, lastLog), UTC, P)).isFalse();
    }

    @Test
    void aNewLogAndANewGapAreAskedAgainOnceTheAnswerIsAWeekOld() {
        LocalDate answeredFrom = TODAY.minusDays(40);
        LocalDate newLog = TODAY.minusDays(PROMPT_DAYS);

        assertThat(ReturnGap.shouldPrompt(Optional.of(newLog), TODAY, answered(ReturnAnswers.Choice.EASE_BACK, answeredFrom, PROMPT_DAYS), UTC, P)).isTrue();
        // A new log with a short gap since: nothing to ask yet.
        assertThat(ReturnGap.shouldPrompt(Optional.of(TODAY.minusDays(PROMPT_DAYS - 1)), TODAY,
                answered(ReturnAnswers.Choice.EASE_BACK, answeredFrom, PROMPT_DAYS), UTC, P)).isFalse();
    }

    @Test
    void aLogDatedBackAfterTheAnswerDoesNotAskAgainForAWeekFromTheAnswer() {
        // A gap of 10 days answered today, then a meal dated 8 days ago: a new log, a gap of 8 days, but the question was just answered.
        LocalDate gapFrom = TODAY.minusDays(PROMPT_DAYS + 3);
        Optional<LocalDate> backdated = Optional.of(TODAY.minusDays(PROMPT_DAYS + 1));

        assertThat(ReturnGap.shouldPrompt(backdated, TODAY, answered(ReturnAnswers.Choice.PICK_UP, gapFrom, 0), UTC, P)).isFalse();
        assertThat(ReturnGap.shouldPrompt(backdated, TODAY, answered(ReturnAnswers.Choice.PICK_UP, gapFrom, PROMPT_DAYS - 1), UTC, P)).isFalse();
        assertThat(ReturnGap.shouldPrompt(backdated, TODAY, answered(ReturnAnswers.Choice.PICK_UP, gapFrom, PROMPT_DAYS), UTC, P)).isTrue();
    }

    @ParameterizedTest(name = "last session {0} days ago offers {1}")
    @MethodSource("offers")
    void theOfferIsTheProgramsOwnReadingOfTheLastSession(int sessionDaysAgo, Suggestion offered) {
        assertThat(ReturnGap.suggested(daysAgo(sessionDaysAgo), TODAY, P)).isEqualTo(offered);
    }

    static Stream<Arguments> offers() {
        return Stream.of(
                Arguments.of(PROMPT_DAYS, Suggestion.PICK_UP),
                Arguments.of(STEP_BACK_DAYS - 1, Suggestion.PICK_UP),
                Arguments.of(STEP_BACK_DAYS, Suggestion.EASE_BACK),
                Arguments.of(STEP_BACK_DAYS + 30, Suggestion.EASE_BACK));
    }

    @Test
    void withNoSessionThereIsNothingToEaseBackInto() {
        assertThat(ReturnGap.suggested(Optional.empty(), TODAY, P)).isEqualTo(Suggestion.PICK_UP);
    }

    @Test
    void theNextCallIsTodayWhileThisWeeksIsOpen() {
        LocalDate weekOf = LocalDate.of(2026, 10, 12);

        assertThat(ReturnGap.nextCallOn(Optional.empty(), weekOf, true, TODAY, Optional.of(LocalDate.of(2026, 10, 19)))).isEqualTo(TODAY);
        assertThat(ReturnGap.nextCallOn(Optional.empty(), weekOf, true, TODAY, Optional.empty())).isEqualTo(TODAY);
    }

    @Test
    void onceThisWeeksIsMadeTheNextCallIsTheLatestCallsNextReviewWhileItIsAhead() {
        LocalDate weekOf = LocalDate.of(2026, 10, 12);

        // A call made late (Thursday the 15th) reviews on its own day, not the check-in day: the Hero says that day.
        assertThat(ReturnGap.nextCallOn(Optional.empty(), weekOf, false, TODAY, Optional.of(LocalDate.of(2026, 10, 22)))).isEqualTo(LocalDate.of(2026, 10, 22));
        assertThat(ReturnGap.nextCallOn(Optional.empty(), weekOf, false, TODAY, Optional.of(LocalDate.of(2026, 10, 19)))).isEqualTo(LocalDate.of(2026, 10, 19));
    }

    @Test
    void aNextReviewThatIsNotAheadFallsBackToTheNextCheckInDay() {
        LocalDate weekOf = LocalDate.of(2026, 10, 12);

        assertThat(ReturnGap.nextCallOn(Optional.empty(), weekOf, false, TODAY, Optional.of(TODAY))).isEqualTo(LocalDate.of(2026, 10, 19));
        assertThat(ReturnGap.nextCallOn(Optional.empty(), weekOf, false, TODAY, Optional.of(LocalDate.of(2026, 10, 5)))).isEqualTo(LocalDate.of(2026, 10, 19));
        assertThat(ReturnGap.nextCallOn(Optional.empty(), weekOf, false, TODAY, Optional.empty())).isEqualTo(LocalDate.of(2026, 10, 19));
    }

    @Test
    void beforeTheFirstCallTheNextCallIsTheFirstCallsDay() {
        LocalDate first = LocalDate.of(2026, 10, 19);
        LocalDate weekOf = LocalDate.of(2026, 10, 12);

        assertThat(ReturnGap.nextCallOn(Optional.of(first), weekOf, false, TODAY, Optional.empty())).isEqualTo(first);
        assertThat(ReturnGap.nextCallOn(Optional.of(first), weekOf, true, TODAY, Optional.empty())).isEqualTo(first);
    }
}
