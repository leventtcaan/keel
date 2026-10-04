package app.keel.identity;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import com.nimbusds.jose.crypto.ECDSAVerifier;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.interfaces.ECPublicKey;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * Account deletion ends Sign in with Apple too (K-812, ADR-062): the phone asks Apple for a fresh authorization code, the
 * server trades it for tokens at Apple's /auth/token, checks the identity token is this account's, and revokes the refresh
 * token at /auth/revoke — both with a client secret signed by the account's .p8 key. Nothing of Apple's is kept, nothing
 * of it logged. Apple here is a local server answering as Apple does (developer.apple.com, Sign in with Apple REST API).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, AppleRevocationTests.Keys.class})
@ExtendWith(OutputCaptureExtension.class)
class AppleRevocationTests {

    static final JsonMapper JSON = JsonMapper.builder().build();
    static final AppleTestTokens APPLE = new AppleTestTokens();
    static final String CODE = "c0de-from-apple-" + UUID.randomUUID();
    static final String REFRESH = "rt-" + UUID.randomUUID();
    static final KeyPair P8;
    static final FakeApple FAKE;

    static {
        try {
            P8 = AppleClientSecretTests.keys();
            FAKE = new FakeApple();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @DynamicPropertySource
    static void apple(DynamicPropertyRegistry registry) {
        registry.add("keel.apple.revocation.team-id", () -> "TEAM123456");
        registry.add("keel.apple.revocation.key-id", () -> "KEY1234567");
        registry.add("keel.apple.revocation.private-key", () -> AppleClientSecretTests.p8(P8));
        registry.add("keel.apple.revocation.base-uri", FAKE::uri);
    }

    @AfterAll
    static void stop() {
        FAKE.server.stop(0);
    }

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @BeforeEach
    void reset() {
        FAKE.requests.clear();
        FAKE.tokenStatus = 200;
        FAKE.revokeStatus = 200;
    }

    @Test
    void theCodeIsTradedAndTheRefreshTokenRevokedWithASignedSecret(CapturedOutput log) throws Exception {
        String subject = "apple." + UUID.randomUUID();
        AccountId account = account(subject);
        FAKE.idToken = APPLE.signed(subject, Instant.now(), claims -> claims);

        assertThat(revoke(account, CODE)).hasStatus(204);

        assertThat(FAKE.requests).extracting(Request::path).containsExactly("/auth/token", "/auth/revoke");
        Map<String, String> token = FAKE.requests.get(0).form();
        assertThat(token).containsEntry("grant_type", "authorization_code").containsEntry("code", CODE)
                .containsEntry("client_id", AppleTestTokens.CLIENT_ID);
        Map<String, String> revoke = FAKE.requests.get(1).form();
        assertThat(revoke).containsEntry("token", REFRESH).containsEntry("token_type_hint", "refresh_token")
                .containsEntry("client_id", AppleTestTokens.CLIENT_ID);
        for (Map<String, String> form : List.of(token, revoke)) {
            SignedJWT secret = SignedJWT.parse(form.get("client_secret"));
            assertThat(secret.verify(new ECDSAVerifier((ECPublicKey) P8.getPublic()))).isTrue();
            assertThat(secret.getJWTClaimsSet().getSubject()).isEqualTo(AppleTestTokens.CLIENT_ID);
        }
        // Nothing of Apple's is written down: not the code, not the tokens, not the secret.
        assertThat(log).doesNotContain(CODE).doesNotContain(REFRESH).doesNotContain(FAKE.requests.get(0).form().get("client_secret"));
    }

    @Test
    void someoneElsesCodeRevokesNothing() throws Exception {
        AccountId account = account("apple." + UUID.randomUUID());
        FAKE.idToken = APPLE.signed("apple.someone-else-" + UUID.randomUUID(), Instant.now(), claims -> claims);

        assertThat(revoke(account, CODE)).hasStatus(400);

        assertThat(FAKE.requests).extracting(Request::path).containsExactly("/auth/token");
    }

    @Test
    void anIdentityTokenNotApplesRevokesNothing() throws Exception {
        String subject = "apple." + UUID.randomUUID();
        AccountId account = account(subject);
        FAKE.idToken = APPLE.signed(subject, Instant.now(), claims -> claims.audience("com.someone.else"));

        assertThat(revoke(account, CODE)).hasStatus(400);

        assertThat(FAKE.requests).extracting(Request::path).containsExactly("/auth/token");
    }

    @Test
    void aCodeAppleRefusesIsTheRequestsFault() throws Exception {
        AccountId account = account("apple." + UUID.randomUUID());
        FAKE.tokenStatus = 400;

        assertThat(revoke(account, CODE)).hasStatus(400);
    }

    @Test
    void appleDownIsTryAgainLater() throws Exception {
        String subject = "apple." + UUID.randomUUID();
        AccountId account = account(subject);
        FAKE.idToken = APPLE.signed(subject, Instant.now(), claims -> claims);
        FAKE.revokeStatus = 503;

        assertThat(revoke(account, CODE)).hasStatus(503);
    }

    @Test
    void withoutASessionNothingIsAsked() {
        assertThat(mvc.post().uri("/v1/account/apple-revocation").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("authorizationCode", CODE))).exchange()).hasStatus(401);
        assertThat(FAKE.requests).isEmpty();
    }

    @Test
    void noCodeIsAValidationError() throws Exception {
        AccountId account = account("apple." + UUID.randomUUID());
        assertThat(mvc.post().uri("/v1/account/apple-revocation").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content("{}").exchange()).hasStatus(400);
        assertThat(FAKE.requests).isEmpty();
    }

    private AccountId account(String subject) {
        AccountId account = new AccountId(UUID.fromString(jdbc.sql("""
                insert into identity.account (id, apple_subject, created_at) values (gen_random_uuid(), :subject, now()) returning id""")
                .param("subject", subject).query(String.class).single()));
        return account;
    }

    private MvcTestResult revoke(AccountId account, String code) {
        return mvc.post().uri("/v1/account/apple-revocation").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("authorizationCode", code))).exchange();
    }

    record Request(String path, String body) {

        Map<String, String> form() {
            return Arrays.stream(body.split("&")).map(pair -> pair.split("=", 2)).collect(Collectors.toMap(
                    kv -> URLDecoder.decode(kv[0], StandardCharsets.UTF_8), kv -> kv.length > 1 ? URLDecoder.decode(kv[1], StandardCharsets.UTF_8) : ""));
        }
    }

    /** Apple's two endpoints, answering as the REST API documents: a TokenResponse, then 200 with no body. */
    static final class FakeApple {

        final HttpServer server;
        final List<Request> requests = new CopyOnWriteArrayList<>();
        volatile String idToken = "";
        volatile int tokenStatus = 200;
        volatile int revokeStatus = 200;

        FakeApple() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", exchange -> {
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                String path = exchange.getRequestURI().getPath();
                requests.add(new Request(path, body));
                byte[] answer = new byte[0];
                int status = path.equals("/auth/token") ? tokenStatus : revokeStatus;
                if (path.equals("/auth/token") && status == 200) {
                    answer = JSON.writeValueAsBytes(Map.of("access_token", "at-" + UUID.randomUUID(), "token_type", "Bearer", "expires_in", 3600,
                            "refresh_token", REFRESH, "id_token", idToken));
                    exchange.getResponseHeaders().add("Content-Type", "application/json");
                } else if (status == 400) {
                    answer = "{\"error\":\"invalid_grant\"}".getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().add("Content-Type", "application/json");
                }
                exchange.sendResponseHeaders(status, answer.length == 0 ? -1 : answer.length);
                if (answer.length > 0) {
                    exchange.getResponseBody().write(answer);
                }
                exchange.close();
            });
            server.start();
        }

        String uri() {
            return "http://127.0.0.1:" + server.getAddress().getPort();
        }
    }

    /** Apple's signing keys, as the sign-in tests use them. */
    @TestConfiguration(proxyBeanMethods = false)
    static class Keys {

        @Bean
        @Primary
        JWKSource<SecurityContext> revocationTestAppleKeys() {
            return APPLE.keys();
        }
    }
}
