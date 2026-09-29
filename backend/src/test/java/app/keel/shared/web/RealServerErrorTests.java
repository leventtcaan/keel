package app.keel.shared.web;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import jakarta.servlet.Filter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * The same V3 promise as ErrorAndLogTests, on a real Tomcat (K-215 review): MockMvc has no servlet container, no
 * /error forward and always asks for JSON, so it cannot see the paths where the container or Spring's own resolvers
 * log an exception's message. A weight (82.4) goes through each of those paths; it must reach neither body nor log.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({PostgresTestConfiguration.class, RealServerErrorTests.Probe.class})
@ExtendWith(OutputCaptureExtension.class)
class RealServerErrorTests {

    private static final String HEALTH_VALUE = "82.4";

    @Autowired
    Environment environment;

    record WeighIn(double kg) {
    }

    @RestController
    static class Probe {

        @GetMapping("/real/broken/{kg}")
        String broken(@PathVariable String kg) {
            throw new IllegalStateException("weight " + kg + " kg could not be stored");
        }

        @PostMapping("/real/weigh-ins")
        String weighIn(@RequestBody WeighIn body) {
            return "ok";
        }

        @GetMapping("/real/unavailable")
        String unavailable() {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "database at 82.4 % load");
        }

        /** A filter that fails before the dispatcher, the way a security filter could. */
        @Bean
        FilterRegistrationBean<Filter> failingFilter() {
            FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>((request, response, chain) -> {
                throw new IllegalStateException("weight " + HEALTH_VALUE + " kg in a filter");
            });
            registration.addUrlPatterns("/real/filtered/*");
            return registration;
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"text/html", "application/xml", "*/*"})
    void whateverTheClientAcceptsAFailureAnswersTheContractsJsonAndLeaksNothing(String accept, CapturedOutput log) throws Exception {
        HttpResponse<String> response = send(HttpRequest.newBuilder(uri("/real/broken/" + HEALTH_VALUE)).header("Accept", accept));

        assertThat(response.statusCode()).isEqualTo(500);
        assertThat(response.headers().firstValue("Content-Type")).hasValueSatisfying(type -> assertThat(type).startsWith("application/json"));
        assertThat(response.body()).contains("\"code\":\"INTERNAL\"").doesNotContain(HEALTH_VALUE);
        assertThat(log.getAll()).doesNotContain(HEALTH_VALUE).doesNotContain("could not be stored");
        // Answered by the handler itself, once — not by the container's fallback after the handler failed to write.
        String id = response.headers().firstValue("X-Request-Id").orElse("none");
        assertThat(log.getAll().lines().filter(line -> line.contains("failure request_id=" + id))).hasSize(1)
                .allSatisfy(line -> assertThat(line).contains("exception=java.lang.IllegalStateException at="));
    }

    @Test
    void anUnreadableTypedBodyIsAValidationErrorEvenForAnHtmlClient(CapturedOutput log) throws Exception {
        HttpResponse<String> response = send(HttpRequest.newBuilder(uri("/real/weigh-ins")).header("Accept", "text/html")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"kg\":\"" + HEALTH_VALUE + "kg\"}")));

        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(response.body()).contains("\"code\":\"VALIDATION_FAILED\"").doesNotContain(HEALTH_VALUE);
        assertThat(log.getAll()).doesNotContain(HEALTH_VALUE);
    }

    @Test
    void aFailureInsideAFilterStillAnswersTheContractsJsonAndLeaksNothing(CapturedOutput log) throws Exception {
        HttpResponse<String> response = send(HttpRequest.newBuilder(uri("/real/filtered/x")).header("Accept", "text/html"));

        assertThat(response.statusCode()).isEqualTo(500);
        assertThat(response.body()).contains("\"code\":\"INTERNAL\"").doesNotContain(HEALTH_VALUE).doesNotContain("/real/filtered");
        assertThat(log.getAll()).doesNotContain(HEALTH_VALUE).doesNotContain("in a filter");
    }

    @Test
    void anUnavailableServiceIsNotReportedAsOurBug(CapturedOutput log) throws Exception {
        HttpResponse<String> response = send(HttpRequest.newBuilder(uri("/real/unavailable")));

        assertThat(response.statusCode()).isEqualTo(503);
        assertThat(response.body()).contains("\"code\":\"SERVICE_UNAVAILABLE\"").doesNotContain(HEALTH_VALUE);
        assertThat(log.getAll()).contains("error_code=SERVICE_UNAVAILABLE").doesNotContain(HEALTH_VALUE);
    }

    @Test
    void everyAnswerCarriesTheRequestIdTheLogHas(CapturedOutput log) throws Exception {
        HttpResponse<String> response = send(HttpRequest.newBuilder(uri("/real/broken/1")));

        assertThat(response.headers().firstValue("X-Request-Id")).isPresent();
        String id = response.headers().firstValue("X-Request-Id").orElseThrow();
        assertThat(UUID.fromString(id)).isNotNull();
        assertThat(log.getAll()).contains("request_id=" + id);
    }

    @Test
    void aWrongMethodKeepsItsAllowHeader() throws Exception {
        HttpResponse<String> response = send(HttpRequest.newBuilder(uri("/health")).DELETE());

        assertThat(response.statusCode()).isEqualTo(405);
        assertThat(response.headers().firstValue("Allow")).hasValueSatisfying(allow -> assertThat(allow).contains("GET"));
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + environment.getProperty("local.server.port") + path);
    }

    private static HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        try (HttpClient client = HttpClient.newHttpClient()) {
            return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        }
    }
}
