package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/**
 * How long a session left without a finish stays open (ADR-075 #5, plan/yeni-yuz-kurallar.md R6): the phone's
 * data/parameters/workout.json › unfinished_session_close_hours, read by the server as it is — one value, one file. A
 * value that is not a whole number of hours, at least one, stops the server from starting.
 */
class SessionAutoCloseParameterTests {

    @Test
    void theServerClosesAfterTheHoursTheRepositoryFileGives() throws IOException {
        // The expected value is read from the repository's file here, not from the classpath copy the code reads.
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> parameters = (List<Map<String, Object>>) JsonMapper.builder().build()
                .readValue(Files.readString(Path.of("../data/parameters/workout.json")), Map.class).get("parameters");
        Object hours = parameters.stream().filter(p -> "unfinished_session_close_hours".equals(p.get("key"))).findFirst().orElseThrow()
                .get("value");

        assertThat(SessionAutoClose.closeAfterFromClasspath()).isEqualTo(Duration.ofHours(((Number) hours).longValue()));
    }

    @Test
    void aWholeNumberOfHoursIsTheTimeOpen() {
        assertThat(SessionAutoClose.closeAfter(file("6"))).isEqualTo(Duration.ofHours(6));
    }

    @Test
    void anythingButAWholeNumberOfAtLeastOneHourIsRefused() {
        for (String value : List.of("0", "-24", "1.5", "\"24\"", "null")) {
            assertThatIllegalStateException().as(value).isThrownBy(() -> SessionAutoClose.closeAfter(file(value)));
        }
        assertThatIllegalStateException().as("missing").isThrownBy(() -> SessionAutoClose.closeAfter(stream("""
                {"parameters": [{"key": "rest_seconds_min", "value": 120}]}""")));
    }

    private static InputStream file(String value) {
        return stream("""
                {"parameters": [{"key": "rest_seconds_min", "value": 120}, {"key": "unfinished_session_close_hours", "value": %s}]}"""
                .formatted(value));
    }

    private static InputStream stream(String json) {
        return new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8));
    }
}
