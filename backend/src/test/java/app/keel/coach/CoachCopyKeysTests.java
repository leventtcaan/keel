package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** The engine's own words the coach answers with (K-505) are in the app's copy file. */
class CoachCopyKeysTests {

    @Test
    @SuppressWarnings("unchecked")
    void theDeterministicAnswersAreInTheCopyFile() throws Exception {
        Map<String, Object> copy = JsonMapper.builder().build().readValue(Files.readString(Path.of("../data/copy/en.json")), Map.class);
        for (String key : new String[] {Explanation.CALL_WORDS, Explanation.NO_CALL_WORDS}) {
            Object node = copy;
            for (String part : key.split("\\.")) {
                node = ((Map<String, Object>) node).get(part);
            }
            assertThat(node).as(key).isInstanceOf(String.class);
        }
    }
}
