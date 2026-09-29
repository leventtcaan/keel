package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** A copy key points into data/copy/en.json (K2, ADR-010): the engine returns keys, never words. */
class CopyKeyTests {

    @ParameterizedTest
    @ValueSource(strings = {"decision.continue", "decision.adjust_calories", "decision.no_decision_yet.data_insufficient",
            "screens.today.title"})
    void acceptsDottedLowercaseKeysOfAnyDepth(String value) {
        assertThat(new CopyKey(value).value()).isEqualTo(value);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "decision", "Decision.Adjust", "decision.adjust calories", "decision..x",
            ".decision", "decision.", "decision.1x", "decision.adjust-calories"})
    void rejectsAnythingElse(String value) {
        assertThatThrownBy(() -> new CopyKey(value))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("CopyKey");
    }

    @Test
    void rejectsNull() {
        assertThatThrownBy(() -> new CopyKey(null)).isInstanceOf(NullPointerException.class);
    }
}
