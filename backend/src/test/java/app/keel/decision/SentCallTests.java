package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * A kept call as the app reads it (contract Decision): what the contract requires is always there, even on a call kept
 * before the field existed (K-1000: the first week's {@code suggested} days). The phone has no case for a missing field.
 */
class SentCallTests {

    @Test
    @SuppressWarnings("unchecked")
    void aFirstWeekCallKeptBeforeTheSuggestedDaysIsSentSuggestingNone() {
        Map<String, Object> moved = Map.of("action", Map.of("type", "MOVE_MISSED_SESSIONS", "missed", List.of("WEDNESDAY")), "reasons", List.of());
        Map<String, Object> added = Map.of("action", Map.of("type", "ADD_TRAINING_DAY", "toDays", 3, "idealDays", 4), "reasons", List.of());

        assertThat((Map<String, Object>) SourceView.sent(moved).get("action"))
                .isEqualTo(Map.of("type", "MOVE_MISSED_SESSIONS", "missed", List.of("WEDNESDAY"), "suggested", List.of()));
        assertThat((Map<String, Object>) SourceView.sent(added).get("action"))
                .isEqualTo(Map.of("type", "ADD_TRAINING_DAY", "toDays", 3, "idealDays", 4, "suggested", List.of()));
    }

    @Test
    @SuppressWarnings("unchecked")
    void theDaysACallDidSuggestAreSentAsKept() {
        Map<String, Object> moved = Map.of("action", Map.of("type", "MOVE_MISSED_SESSIONS", "missed", List.of("WEDNESDAY"), "suggested", List.of("FRIDAY")),
                "reasons", List.of());

        assertThat((Map<String, Object>) SourceView.sent(moved).get("action"))
                .isEqualTo(Map.of("type", "MOVE_MISSED_SESSIONS", "missed", List.of("WEDNESDAY"), "suggested", List.of("FRIDAY")));
        assertThat(SourceView.sent(Map.of("action", Map.of("type", "CONTINUE"), "reasons", List.of())).get("action")).isEqualTo(Map.of("type", "CONTINUE"));
    }
}
