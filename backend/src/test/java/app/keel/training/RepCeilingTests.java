package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.RepRange;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import tools.jackson.databind.json.JsonMapper;

/**
 * The rep ceiling on a sparse rack (K-534, ADR-045 #73): the shared cases in contracts/fixtures/rep-ceiling.json — the
 * server's target here (oneMore), the phone's note there (atCeiling, rep-ceiling.test.ts) — so the two agree.
 */
class RepCeilingTests {

    private static final Path CASES = Path.of("../contracts/fixtures/rep-ceiling.json");

    @SuppressWarnings("unchecked")
    static Stream<Map<String, Object>> cases() throws IOException {
        Map<String, Object> fixture = JsonMapper.builder().build().readValue(Files.readString(CASES), Map.class);
        return ((List<Map<String, Object>>) fixture.get("cases")).stream();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("cases")
    @SuppressWarnings("unchecked")
    void theSharedCases(Map<String, Object> c) {
        Map<String, Integer> range = (Map<String, Integer>) c.get("range");
        RepRange reps = new RepRange(range.get("min"), range.get("max"));
        int above = (int) c.get("ceilingAbove");

        assertThat(NextTargets.oneMore(reps, (int) c.get("weakest"), above)).as((String) c.get("case")).isEqualTo(c.get("oneMore"));
    }
}
