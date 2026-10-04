package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;
import tools.jackson.databind.json.JsonMapper;

/**
 * A parameter the phone reads (data/parameters/*.json, ADR-029) that the engine reads too (data/parameters/*.yaml) is
 * one value: the session summary's estimated max (K-406) is the engine's (K-218). The YAML is the source; the JSON
 * mirrors it, and a change to one without the other is red here.
 */
class MobileParameterMirrorTests {

    private static final Path PARAMETERS = Path.of("../data/parameters");

    @Test
    void aParameterInBothPlacesHasOneValue() throws IOException {
        Map<String, Object> engine = values(".yaml", file -> {
            try (Reader reader = Files.newBufferedReader(file)) {
                return new Yaml().<Map<String, Object>>load(reader);
            }
        });
        Map<String, Object> phone = values(".json", file -> JsonMapper.builder().build().readValue(Files.readString(file), Map.class));

        assertThat(phone).as("the e1RM parameters the summary reads (K-406), the strength chart's window (K-604)").containsKeys("e1rm_epley_divisor",
                "e1rm_max_reps_to_failure", "target_rir_max", "evaluation_window_days");
        // Both sides: a key gone from the engine would leave nothing compared, and the test green for nothing.
        assertThat(engine).containsKeys("e1rm_epley_divisor", "e1rm_max_reps_to_failure", "target_rir_max", "evaluation_window_days");
        phone.forEach((key, value) -> {
            if (engine.containsKey(key)) {
                assertThat(new BigDecimal(value.toString())).as(key).isEqualByComparingTo(new BigDecimal(engine.get(key).toString()));
            }
        });
    }

    private interface Reading {
        Map<String, Object> read(Path file) throws IOException;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> values(String extension, Reading reading) throws IOException {
        Map<String, Object> values = new HashMap<>();
        try (Stream<Path> files = Files.list(PARAMETERS)) {
            for (Path file : files.filter(p -> p.toString().endsWith(extension)).toList()) {
                for (Map<String, Object> parameter : (List<Map<String, Object>>) reading.read(file).get("parameters")) {
                    if (parameter.containsKey("value") && !(parameter.get("value") instanceof List)) {
                        values.put((String) parameter.get("key"), parameter.get("value"));
                    }
                }
            }
        }
        return values;
    }
}
