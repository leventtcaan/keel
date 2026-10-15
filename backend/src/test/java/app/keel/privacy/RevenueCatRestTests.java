package app.keel.privacy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.shared.SafeLog;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

/**
 * RevenueCat's REST API from the server (K-704, ADR-056 Ek 3; docs: https://www.revenuecat.com/docs/api-v1/customers):
 * GET /v1/subscribers/{app_user_id} and DELETE /v1/subscribers/{app_user_id}, a Bearer secret key. Against a stub HTTP
 * server: what is sent, what an answer is, the bounds, and that with no key nothing is sent and one warning is written.
 */
@ExtendWith(OutputCaptureExtension.class)
class RevenueCatRestTests {

    private static final String KEY = "sk_test_never_in_a_log_0123456789";
    private static final AccountId ACCOUNT = new AccountId(UUID.fromString("00000000-0000-4000-8000-0000000000a1"));
    private static final Duration TIMEOUT = Duration.ofMillis(400);

    private FakeRevenueCat revenueCat;

    @BeforeEach
    void start() throws IOException {
        revenueCat = new FakeRevenueCat();
    }

    @AfterEach
    void stop() {
        revenueCat.server.stop(0);
    }

    private RevenueCatRest rest(String key) {
        return rest(key, false);
    }

    private RevenueCatRest rest(String key, boolean production) {
        EgressGate egress = new EgressGate(null, new PrivacyProperties(Duration.ofMinutes(10), Duration.ofMinutes(1), Duration.ofMinutes(1),
                Duration.ofMinutes(5), TIMEOUT));
        return new RevenueCatRest(egress, new RevenueCatRestProperties(key, URI.create(revenueCat.uri() + "/v1/")), production);
    }

    @Test
    void aSubscriberIsAskedForWithTheSecretKeyAsABearerAndItsBodyIsTheAnswer() {
        revenueCat.body = "{\"subscriber\":{}}";

        assertThat(rest(KEY).fetch(ACCOUNT)).contains("{\"subscriber\":{}}");

        assertThat(revenueCat.requests).singleElement().satisfies(request -> {
            assertThat(request.method()).isEqualTo("GET");
            assertThat(request.path()).isEqualTo("/v1/subscribers/" + ACCOUNT.value());
            assertThat(request.authorization()).isEqualTo("Bearer " + KEY);
        });
    }

    @Test
    void aCustomerRevenueCatCreatedForTheAskIsAnAnswerToo() {
        revenueCat.status = 201; // docs: 201 "Success (customer created)"

        assertThat(rest(KEY).fetch(ACCOUNT)).isPresent();
    }

    @Test
    void theCustomerIsDeletedWithADeleteAndRevenueCatsOwnWordForRetrySafeDeletionIs200OrNotFound() {
        for (int status : new int[] {200, 404}) { // docs: "treat both 200 and 404 as successful 'ensure deleted' completion"
            revenueCat.status = status;
            rest(KEY).delete(ACCOUNT);
        }

        assertThat(revenueCat.requests).hasSize(2).allSatisfy(request -> {
            assertThat(request.method()).isEqualTo("DELETE");
            assertThat(request.path()).isEqualTo("/v1/subscribers/" + ACCOUNT.value());
            assertThat(request.authorization()).isEqualTo("Bearer " + KEY);
        });
    }

    @Test
    void anAnswerThatIsNotSuccessIsAnErrorBothWays() {
        for (int status : new int[] {401, 429, 500, 503}) {
            revenueCat.status = status;

            assertThatThrownBy(() -> rest(KEY).fetch(ACCOUNT)).as("fetch " + status).isInstanceOf(ApiException.class);
            assertThatThrownBy(() -> rest(KEY).delete(ACCOUNT)).as("delete " + status).isInstanceOf(ApiException.class);
        }
    }

    @Test
    void aRefusedKeyIsOurSetupAndRevenueCatBeingDownIsUnavailable() {
        revenueCat.status = 401;
        assertThatThrownBy(() -> rest(KEY).fetch(ACCOUNT)).isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo(ErrorCode.INTERNAL));

        revenueCat.status = 503;
        assertThatThrownBy(() -> rest(KEY).delete(ACCOUNT)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo(ErrorCode.SERVICE_UNAVAILABLE));
    }

    @Test
    void aSlowAnswerIsGivenUpOnAtTheTimeoutNotWaitedFor() {
        revenueCat.delay = Duration.ofSeconds(5);
        long started = System.nanoTime();

        assertThatThrownBy(() -> rest(KEY).fetch(ACCOUNT)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo(ErrorCode.SERVICE_UNAVAILABLE));
        assertThatThrownBy(() -> rest(KEY).delete(ACCOUNT)).isInstanceOf(ApiException.class);

        assertThat(Duration.ofNanos(System.nanoTime() - started)).as("two calls, each bounded").isLessThan(Duration.ofSeconds(4));
    }

    @Test
    void aRedirectIsNotFollowedSoTheKeyGoesToNoOneElse() {
        revenueCat.status = 302;
        revenueCat.location = "https://example.com/elsewhere";

        assertThatThrownBy(() -> rest(KEY).fetch(ACCOUNT)).isInstanceOf(ApiException.class);
        assertThat(revenueCat.requests).hasSize(1);
    }

    @Test
    void withNoKeyNothingIsSentAndOneWarningIsWrittenAtStartNotPerCall(CapturedOutput log) {
        RevenueCatRest rest = rest(null);
        for (int i = 0; i < 5; i++) {
            assertThat(rest.fetch(ACCOUNT)).isEmpty();
            rest.delete(ACCOUNT);
        }

        assertThat(revenueCat.requests).isEmpty();
        assertThat(count(log.getAll(), "degraded task=" + RevenueCatRest.class.getName())).isEqualTo(1);
    }

    @Test
    void anUnsetEnvironmentVariableOrABlankKeyIsNoKey() {
        for (String unset : new String[] {"", "  ", "${KEEL_REVENUECAT_API_KEY}"}) {
            assertThat(rest(unset).fetch(ACCOUNT)).as("[" + unset + "]").isEmpty();
        }
        assertThat(revenueCat.requests).isEmpty();
    }

    @Test
    void withAKeyThereIsNoWarning(CapturedOutput log) {
        rest(KEY);

        assertThat(log.getAll()).doesNotContain("degraded");
    }

    @Test
    void theKeyReachesNeitherALogNorAnErrorNorThePropertiesText(CapturedOutput log) {
        revenueCat.status = 503;
        revenueCat.body = "{\"echo\":\"" + KEY + "\"}"; // even an answer that repeats it stays out of what we write
        RevenueCatRestProperties properties = new RevenueCatRestProperties(KEY, URI.create(revenueCat.uri() + "/v1/"));

        try {
            rest(KEY).fetch(ACCOUNT);
        } catch (ApiException failure) {
            SafeLog.failure(UUID.randomUUID(), failure.code(), failure);
            assertThat(failure.toString()).doesNotContain(KEY);
        }

        assertThat(log.getAll()).contains("failure").doesNotContain(KEY).doesNotContain("Bearer");
        assertThat(properties.toString()).doesNotContain(KEY);
    }

    @Test
    void aKeyPastedWithWhitespaceAroundItIsTrimmed() {
        rest("  " + KEY + "\r\n").fetch(ACCOUNT);

        assertThat(revenueCat.requests).singleElement().satisfies(request -> assertThat(request.authorization()).isEqualTo("Bearer " + KEY));
    }

    @Test
    void aKeyWithANewlineInsideIsOurSetupErrorAndNothingOfItIsInAMessageOrTheLog(CapturedOutput log) {
        String broken = "sk_part_one\nsk_part_two";
        Throwable fetched = org.assertj.core.api.Assertions.catchThrowable(() -> rest(broken).fetch(ACCOUNT));
        Throwable deleted = org.assertj.core.api.Assertions.catchThrowable(() -> rest(broken).delete(ACCOUNT));

        for (Throwable failure : new Throwable[] {fetched, deleted}) {
            assertThat(failure).isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo(ErrorCode.INTERNAL));
            for (Throwable link = failure; link != null; link = link.getCause()) {
                assertThat(String.valueOf(link.getMessage())).doesNotContain("sk_part").doesNotContain("Bearer");
                assertThat(link.toString()).doesNotContain("sk_part");
            }
            SafeLog.failure(UUID.randomUUID(), ErrorCode.INTERNAL, failure);
        }
        assertThat(log.getAll()).contains("failure").doesNotContain("sk_part");
        assertThat(revenueCat.requests).isEmpty();
    }

    @Test
    void withNoKeyInProductionTheCustomersDeletionWaitsForOneNotCompletesAndReadingStaysOff() {
        RevenueCatRest production = rest(null, true);

        assertThatThrownBy(() -> production.delete(ACCOUNT)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo(ErrorCode.SERVICE_UNAVAILABLE));
        assertThat(production.fetch(ACCOUNT)).isEmpty();
        assertThat(revenueCat.requests).isEmpty();
    }

    @Test
    void withNoKeyOutsideProductionTheDeletionCompletesAsThereIsNothingToWaitFor() {
        rest(null, false).delete(ACCOUNT);

        assertThat(revenueCat.requests).isEmpty();
    }

    @Test
    void withAKeyInProductionTheCustomerIsDeletedAsEverywhere() {
        rest(KEY, true).delete(ACCOUNT);

        assertThat(revenueCat.requests).singleElement().satisfies(request -> assertThat(request.method()).isEqualTo("DELETE"));
    }

    @Test
    void theKeyTravelsOnlyOverHttpsOrToThisMachine() {
        for (String refused : new String[] {"http://api.revenuecat.com/v1/", "ftp://api.revenuecat.com/v1/", "http://localhost.example.com/v1/",
                "//api.revenuecat.com/v1/", "api.revenuecat.com/v1/"}) {
            assertThatThrownBy(() -> new RevenueCatRestProperties(KEY, URI.create(refused))).as(refused).isInstanceOf(IllegalStateException.class)
                    .hasMessageNotContaining(KEY);
        }
        for (String allowed : new String[] {"https://api.revenuecat.com/v1/", "http://localhost:8080/v1/", "http://127.0.0.1:8080/v1/",
                "http://[::1]:8080/v1/"}) {
            assertThat(new RevenueCatRestProperties(KEY, URI.create(allowed)).configured()).as(allowed).isTrue();
        }
    }

    private static int count(String text, String part) {
        return text.split(java.util.regex.Pattern.quote(part), -1).length - 1;
    }

    record Request(String method, String path, String authorization) {
    }

    /** RevenueCat's two endpoints, answering as the docs say: 200 with the customer, or the status set here. */
    static final class FakeRevenueCat {

        final HttpServer server;
        final List<Request> requests = new CopyOnWriteArrayList<>();
        volatile int status = 200;
        volatile String body = "{}";
        volatile Duration delay = Duration.ZERO;
        volatile String location = null;

        FakeRevenueCat() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", exchange -> {
                requests.add(new Request(exchange.getRequestMethod(), exchange.getRequestURI().getPath(),
                        exchange.getRequestHeaders().getFirst("Authorization")));
                try {
                    Thread.sleep(delay.toMillis());
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                }
                if (location != null) {
                    exchange.getResponseHeaders().add("Location", location);
                }
                byte[] answer = body.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(status, answer.length);
                exchange.getResponseBody().write(answer);
                exchange.close();
            });
            server.start();
        }

        String uri() {
            return "http://127.0.0.1:" + server.getAddress().getPort();
        }
    }
}
