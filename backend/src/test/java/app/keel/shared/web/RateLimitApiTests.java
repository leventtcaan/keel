package app.keel.shared.web;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * The request limits on the real endpoints (K-817, ADR-081): sign-in, Apple revocation, the coach and the meal photo each
 * answer 429 RATE_LIMITED with Retry-After once a client is past its burst, before the request's body is looked at. A
 * burst of two here (the server's own numbers are application.yml's); the refill is an hour, so nothing comes back
 * during a test.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
@TestPropertySource(properties = {
        // No Apple key: revocation answers 503 (as AppleRevocationUnavailableTests), whatever a developer's environment holds.
        "keel.apple.revocation.team-id=", "keel.apple.revocation.key-id=", "keel.apple.revocation.private-key=",
        "keel.rate-limit.groups.sign-in.burst=2", "keel.rate-limit.groups.sign-in.refill-every=1h",
        "keel.rate-limit.groups.apple-revocation.burst=2", "keel.rate-limit.groups.apple-revocation.refill-every=1h",
        "keel.rate-limit.groups.coach.burst=2", "keel.rate-limit.groups.coach.refill-every=1h",
        "keel.rate-limit.groups.meal-photo.burst=2", "keel.rate-limit.groups.meal-photo.refill-every=1h"})
class RateLimitApiTests {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    private MvcTestResult post(String route, String body, String authorization, String address) {
        var request = mvc.post().uri(route).contentType(MediaType.APPLICATION_JSON).content(body).with(r -> {
            r.setRemoteAddr(address);
            return r;
        });
        if (authorization != null) {
            request = request.header("Authorization", authorization);
        }
        return request.exchange();
    }

    private static void assertRefused(MvcTestResult refused) {
        assertThat(refused).hasStatus(429);
        // One refill period (an hour) less the moments the test took.
        assertThat(Long.parseLong(refused.getResponse().getHeader("Retry-After"))).isBetween(3590L, 3600L);
        assertThat(refused).bodyJson().extractingPath("$").asMap().containsOnlyKeys("code", "message")
                .containsEntry("code", "RATE_LIMITED").containsEntry("message", "Too many requests. Try again in a moment.");
    }

    @Test
    void signInIsLimitedPerAddress() {
        String body = "{\"identityToken\":\"\",\"nonce\":\"\"}";
        assertThat(post("/v1/auth/apple", body, null, "203.0.113.50")).hasStatus(400);
        assertThat(post("/v1/auth/apple", body, null, "203.0.113.50")).hasStatus(400);

        assertRefused(post("/v1/auth/apple", body, null, "203.0.113.50"));
        // Another address is its own count, and a header the client sends does not move a request to another.
        assertThat(post("/v1/auth/apple", body, null, "203.0.113.51")).hasStatus(400);
        assertRefused(mvc.post().uri("/v1/auth/apple").contentType(MediaType.APPLICATION_JSON).content(body)
                .header("X-Forwarded-For", "198.51.100.1").with(r -> {
                    r.setRemoteAddr("203.0.113.50");
                    return r;
                }).exchange());
    }

    @Test
    void appleRevocationIsLimitedPerAccountAndNotByAnotherAccountsCalls() {
        AccountId account = TestSessions.newAccount();
        String session = TestSessions.bearer(context, account);
        String body = "{\"authorizationCode\":\"c0de\"}";
        // 503 here: no Apple key is set in tests (ADR-062 #3). The call is counted all the same.
        assertThat(post("/v1/account/apple-revocation", body, session, "203.0.113.60")).hasStatus(503);
        assertThat(post("/v1/account/apple-revocation", body, session, "203.0.113.60")).hasStatus(503);

        assertRefused(post("/v1/account/apple-revocation", body, session, "203.0.113.61"));
        String other = TestSessions.bearer(context, TestSessions.newAccount());
        assertThat(post("/v1/account/apple-revocation", body, other, "203.0.113.60")).hasStatus(503);
    }

    @Test
    void theCoachsQuestionsAndMealsInWordsShareOneCountPerAccount() {
        String session = TestSessions.bearer(context, TestSessions.newAccount());
        // 403 here: no subscription (K-703). The refusal comes after the count.
        assertThat(post("/v1/coach/messages", "{\"text\":\"Why?\"}", session, "203.0.113.70").getResponse().getStatus()).isNotEqualTo(429);
        assertThat(post("/v1/meals/parse", "{\"text\":\"rice\"}", session, "203.0.113.70").getResponse().getStatus()).isNotEqualTo(429);

        assertRefused(post("/v1/coach/messages", "{\"text\":\"Why?\"}", session, "203.0.113.70"));
        assertRefused(post("/v1/meals/parse", "{\"text\":\"rice\"}", session, "203.0.113.70"));
    }

    @Test
    void theMealPhotoHasItsOwnCountSoAQuestionNeverBlocksIt() {
        String session = TestSessions.bearer(context, TestSessions.newAccount());
        for (int i = 0; i < 3; i++) {
            post("/v1/coach/messages", "{\"text\":\"Why?\"}", session, "203.0.113.80");
        }
        assertThat(post("/v1/meals/photo", "{\"image\":\"\"}", session, "203.0.113.80").getResponse().getStatus()).isNotEqualTo(429);
        assertThat(post("/v1/meals/photo", "{\"image\":\"\"}", session, "203.0.113.80").getResponse().getStatus()).isNotEqualTo(429);

        assertRefused(post("/v1/meals/photo", "{\"image\":\"\"}", session, "203.0.113.80"));
    }

    @Test
    void withoutASessionTheAnswerIsStill401BecauseSecurityComesBeforeTheCount() {
        assertThat(post("/v1/coach/messages", "{\"text\":\"Why?\"}", null, "203.0.113.90")).hasStatus(401);
        assertThat(post("/v1/coach/messages", "{\"text\":\"Why?\"}", null, "203.0.113.90")).hasStatus(401);
        assertThat(post("/v1/coach/messages", "{\"text\":\"Why?\"}", null, "203.0.113.90")).hasStatus(401);
    }

    @Test
    void routesNobodyLimitedAnswerAsBefore() {
        for (int i = 0; i < 5; i++) {
            assertThat(mvc.get().uri("/health").exchange()).hasStatusOk();
        }
    }
}
