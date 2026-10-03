package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/**
 * The coach's words are the app's copy (K-505, K-529): the engine's own answers, a sentence for every topic the model
 * classifies into — no number in it (U1: the only numbers are the call's, on its card), and the line that the call stands.
 */
class CoachCopyKeysTests {

    @Test
    void theDeterministicAnswersAreInTheCopyFile() throws Exception {
        for (String key : new String[] {Explanation.CALL_WORDS, Explanation.NO_CALL_WORDS, Explanation.DAILY_LIMIT_WORDS, "coach.answer.stands"}) {
            assertThat(words(key)).as(key).isInstanceOf(String.class);
        }
        assertThat((String) words("coach.answer.stands")).contains("{date}");
    }

    @Test
    void everyTopicHasItsSentenceWithoutANumber() throws Exception {
        for (Topic topic : Topic.values()) {
            String key = "coach.topic." + topic.name().toLowerCase(Locale.ROOT);
            assertThat(words(key)).as(key).isInstanceOf(String.class);
            assertThat((String) words(key)).as(key).isNotBlank().doesNotContainPattern("\\d");
        }
        assertThat(((Map<?, ?>) words("coach.topic")).keySet()).hasSize(Topic.values().length);
    }

    @SuppressWarnings("unchecked")
    private static Object words(String key) throws Exception {
        Object node = JsonMapper.builder().build().readValue(Files.readString(Path.of("../data/copy/en.json")), Map.class);
        for (String part : key.split("\\.")) {
            node = node instanceof Map<?, ?> map ? ((Map<String, Object>) map).get(part) : null;
        }
        return node;
    }
}
