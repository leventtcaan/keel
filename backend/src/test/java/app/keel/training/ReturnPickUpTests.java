package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import app.keel.training.ReturnAnswers.Answer;
import app.keel.training.ReturnAnswers.Choice;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * Picking up where the user left off (K-1020, ADR-077 #5 and Ek 8): the answer PICK_UP keeps the break from being eased
 * for the session it was given on, and ends with the next session done; no other answer touches the program (REBUILD is
 * the phone's own call to generate a program; EASE_BACK steps a short break back too, K-1026, below).
 */
class ReturnPickUpTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);
    private static final LocalDate LAST_SESSION = TODAY.minusDays(40);
    private static final LocalDate LAST_LOG = TODAY.minusDays(30);

    private static Optional<Answer> answer(Choice choice) {
        return Optional.of(new Answer(choice, LAST_LOG, Instant.parse("2026-10-14T08:00:00Z")));
    }

    private static boolean longBreak(Optional<LocalDate> lastSession, Optional<Answer> answer) {
        return BackAfterBreak.of(ReturnAnswers.breakFrom(lastSession, answer, TODAY, ZoneOffset.UTC, P), TODAY, ZoneOffset.UTC, P).longBreak();
    }

    @Test
    void withoutAnAnswerALongBreakIsEasedAsItAlwaysWas() {
        assertThat(longBreak(Optional.of(LAST_SESSION), Optional.empty())).isTrue();
    }

    @Test
    void pickingUpKeepsTheTargetsAsTheyWere() {
        assertThat(longBreak(Optional.of(LAST_SESSION), answer(Choice.PICK_UP))).isFalse();
        // The session can be the log the gap began from itself.
        assertThat(longBreak(Optional.of(LAST_LOG), answer(Choice.PICK_UP))).isFalse();
    }

    @Test
    void easingBackAndRebuildingLeaveTheStepBackAlone() {
        assertThat(longBreak(Optional.of(LAST_SESSION), answer(Choice.EASE_BACK))).isTrue();
        assertThat(longBreak(Optional.of(LAST_SESSION), answer(Choice.REBUILD))).isTrue();
    }

    @Test
    void aSessionDoneAfterTheAnswerEndsThePickUp() {
        // Picked up yesterday from a gap that began 30 days ago; a session is logged for 22 days ago (after that gap), none since:
        // the answer was for the gap before it, so that break is eased as any other.
        LocalDate newSession = TODAY.minusDays(22);
        Answer pickedUpBefore = new Answer(Choice.PICK_UP, TODAY.minusDays(30), Instant.parse("2026-10-14T08:00:00Z"));

        assertThat(longBreak(Optional.of(newSession), Optional.of(pickedUpBefore))).isTrue();
    }

    @Test
    void withNoSessionThereIsNoBreakEitherWay() {
        assertThat(longBreak(Optional.empty(), answer(Choice.PICK_UP))).isFalse();
        assertThat(longBreak(Optional.empty(), Optional.empty())).isFalse();
    }

    @Test
    void aPickUpHoldsForAsLongAsTheStepBackWaitsForASession() {
        // The answer is kept for the first session back, within return_step_back_after_weeks of it; without one in that time it falls
        // and the usual step back applies (no new number: the same weeks ReturnLoad breaks on).
        int window = 7 * P.wholeNumber(ParameterKey.RETURN_STEP_BACK_AFTER_WEEKS);

        assertThat(longBreak(Optional.of(LAST_SESSION), pickedUp(window - 1))).as("a day inside the window").isFalse();
        assertThat(longBreak(Optional.of(LAST_SESSION), pickedUp(window))).as("the window is out").isTrue();
        assertThat(longBreak(Optional.of(LAST_SESSION), pickedUp(window + 30))).as("long out").isTrue();
        assertThat(longBreak(Optional.of(LAST_SESSION), pickedUp(0))).as("picked up today").isFalse();
    }

    // ── easing back in (K-1026): the choice steps the break back whatever its length ───────────────────────────

    private static final LocalDate SHORT_BREAK_SESSION = TODAY.minusDays(10);

    /** As the program reads it: the break measured as the answer allows, eased if long or if the user chose to ease back in. */
    private static boolean steppedBack(Optional<LocalDate> lastSession, Optional<Answer> answer) {
        Optional<LocalDate> from = ReturnAnswers.breakFrom(lastSession, answer, TODAY, ZoneOffset.UTC, P);
        return BackAfterBreak.of(from, ReturnAnswers.easedBack(from, answer, TODAY, ZoneOffset.UTC, P), TODAY, ZoneOffset.UTC, P).longBreak();
    }

    private static Optional<Answer> eased(LocalDate gapFrom, int daysAgo) {
        return Optional.of(new Answer(Choice.EASE_BACK, gapFrom, TODAY.minusDays(daysAgo).atTime(9, 0).toInstant(ZoneOffset.UTC)));
    }

    @Test
    void easingBackStepsAShortBreakBackThoughNothingElseWould() {
        // A gap of ten days (asked at return_prompt_days), a session ten days ago: under return_step_back_after_weeks.
        assertThat(steppedBack(Optional.of(SHORT_BREAK_SESSION), Optional.empty())).as("no answer: nothing eased").isFalse();
        assertThat(steppedBack(Optional.of(SHORT_BREAK_SESSION), eased(SHORT_BREAK_SESSION, 1))).as("ease back in: a step lighter").isTrue();
    }

    @Test
    void theOtherAnswersLeaveAShortBreakAlone() {
        assertThat(steppedBack(Optional.of(SHORT_BREAK_SESSION), Optional.of(new Answer(Choice.PICK_UP, SHORT_BREAK_SESSION, Instant.parse("2026-10-14T08:00:00Z")))))
                .isFalse();
        assertThat(steppedBack(Optional.of(SHORT_BREAK_SESSION), Optional.of(new Answer(Choice.REBUILD, SHORT_BREAK_SESSION, Instant.parse("2026-10-14T08:00:00Z")))))
                .isFalse();
    }

    @Test
    void aLongBreakIsSteppedBackWithOrWithoutTheChoice() {
        assertThat(steppedBack(Optional.of(LAST_SESSION), Optional.empty())).isTrue();
        assertThat(steppedBack(Optional.of(LAST_SESSION), eased(LAST_LOG, 1))).as("no second step: one, as ever").isTrue();
        assertThat(BackAfterBreak.of(Optional.of(LAST_SESSION), true, TODAY, ZoneOffset.UTC, P).longBreak()).isTrue();
        assertThat(BackAfterBreak.of(Optional.of(SHORT_BREAK_SESSION), true, TODAY, ZoneOffset.UTC, P).longBreak()).as("chosen on a short one").isTrue();
        assertThat(BackAfterBreak.of(Optional.empty(), true, TODAY, ZoneOffset.UTC, P).longBreak()).as("no session").isFalse();
    }

    @Test
    void theChoiceEndsWithTheNextSession() {
        // Eased back in from a gap that began 10 days ago; a session is then done 4 days ago (after the gap): the answer was for the gap before it.
        LocalDate newSession = TODAY.minusDays(4);

        assertThat(steppedBack(Optional.of(newSession), eased(SHORT_BREAK_SESSION, 5))).isFalse();
    }

    @Test
    void theChoiceHoldsForAsLongAsPickingUpDoes() {
        int window = 7 * P.wholeNumber(ParameterKey.RETURN_STEP_BACK_AFTER_WEEKS);

        assertThat(steppedBack(Optional.of(SHORT_BREAK_SESSION), eased(SHORT_BREAK_SESSION, window - 1))).as("inside the window").isTrue();
        // Out of it, with no session since, the break is long by itself (the answer is older than the weeks and so is the session).
        assertThat(steppedBack(Optional.of(TODAY.minusDays(window + 5)), eased(TODAY.minusDays(window + 5), window))).isTrue();
        assertThat(ReturnAnswers.easedBack(Optional.of(SHORT_BREAK_SESSION), eased(SHORT_BREAK_SESSION, window), TODAY, ZoneOffset.UTC, P))
                .as("the answer itself falls at the window").isFalse();
    }

    @Test
    void noSessionIsNothingToEaseBackInto() {
        assertThat(steppedBack(Optional.empty(), eased(SHORT_BREAK_SESSION, 1))).isFalse();
    }

    private static Optional<Answer> pickedUp(int daysAgo) {
        return Optional.of(new Answer(Choice.PICK_UP, LAST_LOG, TODAY.minusDays(daysAgo).atTime(9, 0).toInstant(ZoneOffset.UTC)));
    }
}
