package app.keel.engine.spec;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ActionType;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** The engine's action vocabulary and the specification's (spec/weekly-checkin.yaml › actions) are the same list (K-101). */
class ActionVocabularyTests {

    @Test
    void engineActionsMatchTheSpecification() throws IOException {
        List<String> engineActions = Arrays.stream(ActionType.values()).map(Enum::name).toList();

        assertThat(engineActions).containsExactlyInAnyOrderElementsOf(WeeklyCheckinSpec.actions());
    }
}
