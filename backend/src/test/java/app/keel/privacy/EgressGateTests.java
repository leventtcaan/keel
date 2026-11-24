package app.keel.privacy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * Everything that leaves the server for someone else goes through one gate (K-214, V2): data for a third-party AI only
 * with the consent that names it, checked at the moment of sending; the call does not happen otherwise.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(PostgresTestConfiguration.class)
class EgressGateTests {

    @Autowired
    EgressGate egress;

    @Autowired
    ConsentGate consents;

    @Autowired
    JdbcClient jdbc;

    @Test
    void withoutTheAiConsentNothingIsSentAndTheCallNeverRuns() {
        AccountId account = TestSessions.newAccount();
        AtomicBoolean called = new AtomicBoolean();

        assertThatThrownBy(() -> egress.sendToAi(account, "Example AI", "coach question", () -> {
            called.set(true);
            return "reply";
        })).isInstanceOfSatisfying(ApiException.class, refused -> assertThat(refused.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        assertThat(called).isFalse();
    }

    @Test
    void withTheConsentTheCallRunsAndItsAnswerComesBack() {
        AccountId account = TestSessions.newAccount();
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, provider, data_types, occurred_at)
                values (gen_random_uuid(), :account, 'THIRD_PARTY_AI', 'GRANTED', :version, 'Example AI', :types, now())""")
                .param("account", account.value()).param("version", ConsentTextVersions.THIRD_PARTY_AI).param("types", new String[] {"meal photo", "meal note", "coach question"}).update();
        assertThat(consents.granted(account, ConsentKind.THIRD_PARTY_AI)).isTrue();

        assertThat(egress.sendToAi(account, "Example AI", "coach question", () -> "reply")).isEqualTo("reply");
        // K-503: to another provider than the one the user agreed to, nothing is sent and the call never runs.
        AtomicBoolean called = new AtomicBoolean();
        assertThatThrownBy(() -> egress.sendToAi(account, "Other AI", "coach question", () -> {
            called.set(true);
            return "reply";
        })).isInstanceOfSatisfying(ApiException.class, refused -> assertThat(refused.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        assertThat(called).isFalse();
        // K-505: data the consent does not name is not sent either.
        assertThatThrownBy(() -> egress.sendToAi(account, "Example AI", "location", () -> {
            called.set(true);
            return "reply";
        })).isInstanceOfSatisfying(ApiException.class, refused -> assertThat(refused.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        assertThat(called).isFalse();
    }

    @Test
    void aCallToAnAiNamesItsProvider() {
        // The plain send cannot carry data to an AI: the provider would go unchecked (K-503).
        assertThatThrownBy(() -> egress.send(TestSessions.newAccount(), EgressGate.Destination.THIRD_PARTY_AI, () -> "reply"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void accountHousekeepingWithAppleNeedsNoAiConsent() {
        // Revoking Apple's tokens when an account is deleted carries no health data; it is the user's own request.
        assertThat(egress.send(TestSessions.newAccount(), EgressGate.Destination.APPLE_ACCOUNT, () -> "revoked")).isEqualTo("revoked");
    }

    // ADR-092 #4: the channel a language model's adapter posts through — the only way it reaches its provider.

    private AccountId withTheAiConsent() {
        AccountId account = TestSessions.newAccount();
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, provider, data_types, occurred_at)
                values (gen_random_uuid(), :account, 'THIRD_PARTY_AI', 'GRANTED', :version, 'Example AI', :types, now())""")
                .param("account", account.value()).param("version", ConsentTextVersions.THIRD_PARTY_AI).param("types", new String[] {"meal photo", "meal note", "coach question"}).update();
        return account;
    }

    /** A provider that records what it is sent and answers 200 {"ok":true}. */
    private static HttpServer provider(List<String> seen) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            seen.add(exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath() + " " + exchange.getRequestHeaders().getFirst("Authorization") + " "
                    + exchange.getRequestHeaders().getFirst("Content-Type") + " " + new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] answer = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, answer.length);
            exchange.getResponseBody().write(answer);
            exchange.close();
        });
        server.start();
        return server;
    }

    @Test
    void theAiChannelPostsJsonWithTheHeadersToTheProviderAndAnswersWhateverItsStatus() throws IOException {
        List<String> seen = new CopyOnWriteArrayList<>();
        HttpServer server = provider(seen);
        try {
            AiChannel channel = egress.aiChannel(withTheAiConsent(), "Example AI", "coach question");

            AiResponse answer = channel.post(URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/v1/chat"), Map.of("Authorization", "Bearer k"),
                    "{\"a\":1}", Duration.ofSeconds(5));

            assertThat(answer.status()).isEqualTo(200);
            assertThat(answer.body()).isEqualTo("{\"ok\":true}");
            assertThat(seen).containsExactly("POST /v1/chat Bearer k application/json {\"a\":1}");
            assertThat(answer.toString()).doesNotContain("ok");
        } finally {
            server.stop(0);
        }
    }

    @Test
    void theAiChannelAsksTheConsentAtEveryPostAndWithoutItNothingIsSent() throws IOException {
        List<String> seen = new CopyOnWriteArrayList<>();
        HttpServer server = provider(seen);
        try {
            URI uri = URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/");
            AiChannel noConsent = egress.aiChannel(TestSessions.newAccount(), "Example AI", "coach question");
            AiChannel otherProvider = egress.aiChannel(withTheAiConsent(), "Other AI", "coach question");
            AiChannel otherData = egress.aiChannel(withTheAiConsent(), "Example AI", "location");

            for (AiChannel channel : List.of(noConsent, otherProvider, otherData)) {
                assertThatThrownBy(() -> channel.post(uri, Map.of(), "{}", Duration.ofSeconds(5))).isInstanceOfSatisfying(ApiException.class,
                        refused -> assertThat(refused.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
            }
            assertThat(seen).isEmpty();
        } finally {
            server.stop(0);
        }
    }

    @Test
    void theAiChannelGoesOverHttpsExceptToThisMachine() {
        AiChannel channel = egress.aiChannel(withTheAiConsent(), "Example AI", "coach question");

        assertThatThrownBy(() -> channel.post(URI.create("http://api.example.com/v1"), Map.of(), "{}", Duration.ofSeconds(1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> channel.post(URI.create("http://10.0.0.5/v1"), Map.of(), "{}", Duration.ofSeconds(1))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void noAnswerIsServiceUnavailable() throws IOException {
        HttpServer closed = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        int port = closed.getAddress().getPort();
        closed.stop(0);
        AiChannel channel = egress.aiChannel(withTheAiConsent(), "Example AI", "coach question");

        assertThatThrownBy(() -> channel.post(URI.create("http://127.0.0.1:" + port + "/"), Map.of(), "{}", Duration.ofSeconds(1)))
                .isInstanceOfSatisfying(ApiException.class, down -> assertThat(down.code()).isEqualTo(ErrorCode.SERVICE_UNAVAILABLE));
    }
}
