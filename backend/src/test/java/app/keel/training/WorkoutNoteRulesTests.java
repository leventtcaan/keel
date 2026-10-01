package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/** What a note is (K-422), without a database: the user's words without their outer spaces; only spaces are none. */
class WorkoutNoteRulesTests {

    private static final WorkoutController.TrainingLimits LIMITS = new WorkoutController.TrainingLimits(new BigDecimal("1000"), 100, 10, 20,
            20, 60, 5);

    @Test
    void aNoteIsTheWordsWithoutTheirOuterSpacesAndOnlySpacesAreNone() {
        assertThat(WorkoutController.TrainingLimits.note(null)).isNull();
        assertThat(WorkoutController.TrainingLimits.note(" \n\t ")).isNull();
        assertThat(WorkoutController.TrainingLimits.note("  grip slipped \n")).isEqualTo("grip slipped");
    }

    @Test
    void aNoteFitsUpToTheLimitCountedInCharactersAfterItsOuterSpacesGo() {
        assertThat(LIMITS.fits(null)).isTrue();
        assertThat(LIMITS.fits("abcde")).isTrue();
        assertThat(LIMITS.fits("  abcde  ")).isTrue();
        assertThat(LIMITS.fits("abcdef")).isFalse();
        // A character outside the basic plane is one character to the user, two chars to Java.
        assertThat(LIMITS.fits("abcd💪")).isTrue();
    }
}
