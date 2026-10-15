package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

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
        return BackAfterBreak.of(ReturnAnswers.breakFrom(lastSession, answer), TODAY, ZoneOffset.UTC, P).longBreak();
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
        // Picked up from a gap that began 30 days ago... then a session 22 days ago, not one since: that new break is eased as any other.
        LocalDate newSession = TODAY.minusDays(22);
        Answer pickedUpBefore = new Answer(Choice.PICK_UP, TODAY.minusDays(30), Instant.parse("2026-09-20T08:00:00Z"));

        assertThat(longBreak(Optional.of(newSession), Optional.of(pickedUpBefore))).isTrue();
    }

    @Test
    void withNoSessionThereIsNoBreakEitherWay() {
        assertThat(longBreak(Optional.empty(), answer(Choice.PICK_UP))).isFalse();
        assertThat(longBreak(Optional.empty(), Optional.empty())).isFalse();
    }
}
