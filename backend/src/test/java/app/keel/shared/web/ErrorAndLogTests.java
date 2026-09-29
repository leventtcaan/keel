package app.keel.shared.web;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.yaml.snakeyaml.Yaml;

/**
 * The shared HTTP layer (K-215): /health answers the contract's Health; every error answers the contract's Error with
 * the code's fixed message; and whatever a request carried — here a weight, 82.4 kg — reaches neither the error body
 * nor the log (V3). Each request is logged once, by route template, through SafeLog.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, ErrorAndLogTests.Probe.class})
@ExtendWith(OutputCaptureExtension.class)
class ErrorAndLogTests {

    private static final String HEALTH_VALUE = "82.4";

    @Autowired
    MockMvcTester mvc;

    /** Endpoints that fail in each way a real module might, with health data in hand. */
    @RestController
    static class Probe {

        @GetMapping("/probe/refused/{kg}")
        String refused(@PathVariable String kg) {
            throw new ApiException(ErrorCode.CONSENT_REQUIRED);
        }

        @GetMapping("/probe/broken/{kg}")
        String broken(@PathVariable String kg) {
            throw new IllegalStateException("weight " + kg + " kg could not be stored");
        }

        @PostMapping("/probe/weigh-ins")
        String weighIn(@RequestBody Map<String, Object> body) {
            return "ok";
        }
    }

    @Test
    void healthAnswersTheContractsHealth() throws IOException {
        MvcTestResult result = mvc.get().uri("/health").exchange();

        assertThat(result).hasStatusOk().bodyJson().extractingPath("$.status").isEqualTo("UP");
        assertThat(result).bodyJson().extractingPath("$").asMap().containsOnlyKeys(contractFields("Health"));
    }

    @Test
    void anErrorAModuleRaisesAnswersItsCodeAndFixedMessage(CapturedOutput log) throws IOException {
        MvcTestResult result = mvc.get().uri("/probe/refused/" + HEALTH_VALUE).exchange();

        assertThat(result).hasStatus(403);
        assertThat(result).bodyJson().extractingPath("$").asMap().containsOnlyKeys(contractFields("Error"))
                .containsEntry("code", "CONSENT_REQUIRED").containsEntry("message", ErrorCode.CONSENT_REQUIRED.message());
        assertThat(log.getAll()).contains("CONSENT_REQUIRED").doesNotContain(HEALTH_VALUE);
    }

    @Test
    void anUnexpectedFailureShowsNothingOfWhatItWasDoing(CapturedOutput log) {
        MvcTestResult result = mvc.get().uri("/probe/broken/" + HEALTH_VALUE).exchange();

        assertThat(result).hasStatus(500);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("INTERNAL");
        assertThat(result.getResponse().getContentAsByteArray()).asString().doesNotContain(HEALTH_VALUE);
        assertThat(log.getAll()).contains("IllegalStateException").doesNotContain(HEALTH_VALUE).doesNotContain("could not be stored");
    }

    @Test
    void aBodyThatCannotBeReadIsAValidationErrorAndItsContentIsNotRepeated(CapturedOutput log) {
        MvcTestResult result = mvc.post().uri("/probe/weigh-ins").contentType(MediaType.APPLICATION_JSON)
                .content("{\"kg\": " + HEALTH_VALUE + ",").exchange();

        assertThat(result).hasStatus(400).hasContentTypeCompatibleWith(MediaType.APPLICATION_JSON);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
        assertThat(result.getResponse().getContentAsByteArray()).asString().doesNotContain(HEALTH_VALUE);
        assertThat(log.getAll()).doesNotContain(HEALTH_VALUE);
    }

    @Test
    void anUnknownPathIsNotFoundInTheSameShape() throws IOException {
        // Outside /v1: under /v1 the session check answers first (401, K-203); with a session it is this same 404 (SignInTests).
        MvcTestResult result = mvc.get().uri("/nothing-here").exchange();

        assertThat(result).hasStatus(404).hasContentTypeCompatibleWith(MediaType.APPLICATION_JSON);
        assertThat(result).bodyJson().extractingPath("$").asMap().containsOnlyKeys(contractFields("Error"))
                .containsEntry("code", "NOT_FOUND");
    }

    @Test
    void aWrongMethodIsMethodNotAllowed() {
        assertThat(mvc.delete().uri("/health").exchange()).hasStatus(405).bodyJson().extractingPath("$.code")
                .isEqualTo("METHOD_NOT_ALLOWED");
    }

    @Test
    void eachRequestIsLoggedOnceByItsRouteTemplateNotItsPath(CapturedOutput log) {
        mvc.get().uri("/probe/refused/" + HEALTH_VALUE).exchange();

        assertThat(log.getAll()).contains("/probe/refused/{kg}").doesNotContain("/probe/refused/" + HEALTH_VALUE);
        assertThat(log.getAll().lines().filter(line -> line.contains("/probe/refused/{kg}")).count()).isEqualTo(1);
    }

    @SuppressWarnings("unchecked")
    private static Set<String> contractFields(String schema) throws IOException {
        try (InputStream in = Files.newInputStream(Path.of("../contracts/openapi.yaml"))) {
            Map<String, Object> contract = new Yaml().load(in);
            Map<String, Object> schemas = (Map<String, Object>) ((Map<String, Object>) contract.get("components")).get("schemas");
            return ((Map<String, Object>) ((Map<String, Object>) schemas.get(schema)).get("properties")).keySet();
        }
    }
}
