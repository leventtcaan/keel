package app.keel.identity;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.json.JsonMapper;

/**
 * Sign in with Apple end to end (K-203): Apple's token in, our session out; a new Apple user gets an account, a returning
 * one the same account; refresh tokens rotate, a reused one ends the whole chain; every /v1 route outside sign-in needs
 * a session, and a module sees only the account's id.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, SignInTests.FakeApple.class, SignInTests.WhoAmI.class})
class SignInTests {

    static final AppleTestTokens APPLE = new AppleTestTokens();
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcClient jdbc;

    /** Apple's keys, replaced by the test's own. */
    @TestConfiguration
    static class FakeApple {
        @Bean
        @Primary
        JWKSource<SecurityContext> testAppleKeys() {
            return APPLE.keys();
        }
    }

    /** A module endpoint: it asks for the AccountId, nothing else of the session. */
    @RestController
    static class WhoAmI {
        @GetMapping("/v1/probe/who-am-i")
        Map<String, String> whoAmI(AccountId account) {
            return Map.of("account", account.value().toString());
        }
    }

    @Test
    void aNewAppleUserGetsAnAccountAndASession() throws Exception {
        Map<String, Object> session = signIn(newSubject());

        assertThat(session).containsKeys("accessToken", "accessTokenExpiresAt", "refreshToken").containsEntry("newAccount", true);
    }

    @Test
    void aReturningAppleUserGetsTheSameAccount() throws Exception {
        String subject = newSubject();
        Map<String, Object> first = signIn(subject);
        Map<String, Object> second = signIn(subject);

        assertThat(second).containsEntry("newAccount", false);
        assertThat(whoAmI(second)).isEqualTo(whoAmI(first));
    }

    @Test
    void aTokenAppleDidNotSignForUsIsUnauthenticated() {
        MvcTestResult result = post("/v1/auth/apple", Map.of("identityToken",
                APPLE.signed(newSubject(), Instant.now(), claims -> claims.audience("com.someone.else")), "nonce", AppleTestTokens.RAW_NONCE));

        assertThat(result).hasStatus(401).bodyJson().extractingPath("$.code").isEqualTo("UNAUTHENTICATED");
    }

    @Test
    void aSignInWithoutATokenIsAValidationError() {
        assertThat(post("/v1/auth/apple", Map.of("nonce", AppleTestTokens.RAW_NONCE))).hasStatus(400)
                .bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void everyV1RouteOutsideSignInNeedsASession() throws Exception {
        assertThat(mvc.get().uri("/v1/probe/who-am-i").exchange()).hasStatus(401)
                .bodyJson().extractingPath("$.code").isEqualTo("UNAUTHENTICATED");
        assertThat(mvc.get().uri("/v1/probe/who-am-i").header("Authorization", "Bearer not-a-token").exchange()).hasStatus(401);
        // The whole of /v1, not only routes that ask for the account: even an unknown one is 401 before it is 404.
        assertThat(mvc.get().uri("/v1/nothing-here").exchange()).hasStatus(401);

        Map<String, Object> session = signIn(newSubject());
        assertThat(mvc.get().uri("/v1/nothing-here").header("Authorization", "Bearer " + session.get("accessToken")).exchange())
                .hasStatus(404);
    }

    @Test
    void refreshingRotatesAndAReusedRefreshTokenEndsTheChain() throws Exception {
        Map<String, Object> first = signIn(newSubject());
        MvcTestResult rotated = post("/v1/auth/refresh", Map.of("refreshToken", first.get("refreshToken")));
        assertThat(rotated).hasStatusOk();
        Map<String, Object> second = read(rotated);
        assertThat(second.get("refreshToken")).isNotEqualTo(first.get("refreshToken"));
        assertThat(whoAmI(second)).isEqualTo(whoAmI(first));

        // The old one again: someone else may hold it. Both it and the one it was traded for stop working.
        assertThat(post("/v1/auth/refresh", Map.of("refreshToken", first.get("refreshToken")))).hasStatus(401);
        assertThat(post("/v1/auth/refresh", Map.of("refreshToken", second.get("refreshToken")))).hasStatus(401);
    }

    @Test
    void aStaleSessionHeaderDoesNotBlockTheOpenRoutes() throws Exception {
        // The phone's client adds its (expired) access token to every call; refresh, sign-in, sign-out and health must
        // still work, or an expired session could never be renewed (contract: security: [] on these).
        Map<String, Object> session = signIn(newSubject());
        String stale = "Bearer not-a-valid-token";

        MvcTestResult refreshed = mvc.post().uri("/v1/auth/refresh").header("Authorization", stale).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("refreshToken", session.get("refreshToken")))).exchange();
        assertThat(refreshed).hasStatusOk();
        assertThat(mvc.post().uri("/v1/auth/apple").header("Authorization", stale).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("identityToken", APPLE.signed(newSubject(), Instant.now(), claims -> claims),
                        "nonce", AppleTestTokens.RAW_NONCE))).exchange()).hasStatusOk();
        assertThat(mvc.post().uri("/v1/auth/sign-out").header("Authorization", stale).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("refreshToken", read(refreshed).get("refreshToken")))).exchange()).hasStatus(204);
        assertThat(mvc.get().uri("/health").header("Authorization", stale).exchange()).hasStatusOk();
    }

    @Test
    void signingOutEndsTheRefreshToken() throws Exception {
        Map<String, Object> session = signIn(newSubject());

        assertThat(post("/v1/auth/sign-out", Map.of("refreshToken", session.get("refreshToken")))).hasStatus(204);
        assertThat(post("/v1/auth/refresh", Map.of("refreshToken", session.get("refreshToken")))).hasStatus(401);
    }

    @Test
    void refreshTokensAreStoredOnlyAsAHash() throws Exception {
        String refresh = (String) signIn(newSubject()).get("refreshToken");

        assertThat(jdbc.sql("select count(*) from identity.refresh_token where token_hash = :raw").param("raw", refresh)
                .query(Integer.class).single()).isZero();
        assertThat(jdbc.sql("select count(*) from identity.refresh_token where token_hash = :hash")
                .param("hash", AppleIdentityVerifier.hash(refresh)).query(Integer.class).single()).isEqualTo(1);
    }

    private Map<String, Object> signIn(String subject) throws Exception {
        MvcTestResult result = post("/v1/auth/apple", Map.of("identityToken",
                APPLE.signed(subject, Instant.now(), claims -> claims), "nonce", AppleTestTokens.RAW_NONCE));
        assertThat(result).hasStatusOk();
        return read(result);
    }

    private String whoAmI(Map<String, Object> session) throws Exception {
        MvcTestResult result = mvc.get().uri("/v1/probe/who-am-i").header("Authorization", "Bearer " + session.get("accessToken")).exchange();
        assertThat(result).hasStatusOk();
        return (String) read(result).get("account");
    }

    private MvcTestResult post(String uri, Map<String, ?> body) {
        return mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body)).exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private static String newSubject() {
        return "apple." + UUID.randomUUID();
    }
}
