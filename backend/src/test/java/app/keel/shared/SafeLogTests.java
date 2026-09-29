package app.keel.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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

    @ParameterizedTest
    @ValueSource(strings = {"/v1/foods?q=chicken", "/v1/weigh-ins/82.4", "/v1/days/2026-09-30/budget",
            "/v1/decisions/0b7c1f2e-0000-4000-8000-000000000000", "/v1/foods search"})
    void aRawPathOrQueryIsNeverWrittenAsTheRoute(String raw, CapturedOutput log) {
        SafeLog.request(REQUEST, "GET", raw, 200, 1);

        assertThat(log.getAll()).doesNotContain(raw).contains("route=unreadable-route");
    }

    @ParameterizedTest
    @ValueSource(strings = {"/v1/weigh-ins/{id}", "/v1/days/{day}/budget", "/health", "/**", "/v1/check-ins/current/answers",
            SafeLog.UNMATCHED})
    void aRouteTemplateIsWrittenAsItIs(String template, CapturedOutput log) {
        SafeLog.request(REQUEST, "GET", template, 200, 1);

        assertThat(log.getAll()).contains("route=" + template + " ");
    }

    @Test
    void aMethodThatIsNotAMethodIsNotWritten(CapturedOutput log) {
        SafeLog.request(REQUEST, "get; drop", "/health", 200, 1);

        assertThat(log.getAll()).doesNotContain("drop").contains("method=OTHER");
    }

    @Test
    void aFailureLineCarriesTheCodeTheCausesAndWhereNeverAMessage(CapturedOutput log) {
        IllegalStateException failure = new IllegalStateException("weight 82.4 kg",
                new IllegalArgumentException("waist 88 cm", new ArithmeticException("x / 0")));

        SafeLog.failure(REQUEST, ErrorCode.INTERNAL, failure);

        assertThat(log.getAll()).contains("failure request_id=" + REQUEST + " error_code=INTERNAL exception="
                + "java.lang.IllegalStateException<-java.lang.IllegalArgumentException<-java.lang.ArithmeticException at="
                + SafeLogTests.class.getName() + "#aFailureLineCarriesTheCodeTheCausesAndWhereNeverAMessage:")
                .doesNotContain("82.4").doesNotContain("88 cm").doesNotContain("x / 0");
    }
}
