package app.keel.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

/** SafeLog writes only what its typed fields allow (K-215, V3), even when a caller hands it the wrong thing. */
@ExtendWith(OutputCaptureExtension.class)
class SafeLogTests {

    private static final UUID REQUEST = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Test
    void aRequestLineCarriesItsFieldsAsKeyValueText(CapturedOutput log) {
        SafeLog.request(REQUEST, "GET", "/v1/weigh-ins/{id}", 200, 12);

        assertThat(log.getAll()).contains("request request_id=" + REQUEST
                + " method=GET route=/v1/weigh-ins/{id} status=200 duration_ms=12");
    }

    @Test
    void aRawPathOrQueryIsNeverWrittenAsTheRoute(CapturedOutput log) {
        SafeLog.request(REQUEST, "GET", "/v1/foods?q=chicken 82.4", 200, 1);
        SafeLog.request(REQUEST, "get; drop", "/health", 200, 1);

        assertThat(log.getAll()).doesNotContain("chicken").doesNotContain("82.4").doesNotContain("drop")
                .contains("route=unreadable-route").contains("method=OTHER");
    }

    @Test
    void aFailureLineCarriesTheCodeAndTheTypeNeverAMessage(CapturedOutput log) {
        SafeLog.failure(REQUEST, ErrorCode.INTERNAL, IllegalStateException.class);

        assertThat(log.getAll()).contains("failure request_id=" + REQUEST
                + " error_code=INTERNAL exception=java.lang.IllegalStateException");
    }
}
