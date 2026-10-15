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
 * the phone's own call to generate a program, EASE_BACK is what the program does anyway).
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

    private static Optional<Answer> pickedUp(int daysAgo) {
        return Optional.of(new Answer(Choice.PICK_UP, LAST_LOG, TODAY.minusDays(daysAgo).atTime(9, 0).toInstant(ZoneOffset.UTC)));
    }
}
