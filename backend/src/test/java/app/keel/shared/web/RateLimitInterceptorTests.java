package app.keel.shared.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.keel.shared.RateLimitGroup;
import app.keel.shared.RateLimited;
import java.time.Duration;
import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The limit at the door of an endpoint (K-817): past the burst the answer is 429 with the contract's RATE_LIMITED and a
 * Retry-After; an account is counted by its session's subject, an unauthenticated route by the connection's address, never
 * by a header the client sends; routes without the annotation are never limited. No database: the real endpoints'
 * answers are in RateLimitApiTests.
 */
class RateLimitInterceptorTests {

    /** One route per kind of limit, and one without. */
    @RestController
    static class Probe {

        @PostMapping("/v1/probe/coach")
        @RateLimited(RateLimitGroup.COACH)
        String coach() {
            return "ok";
        }

        @PostMapping("/v1/probe/photo")
        @RateLimited(RateLimitGroup.MEAL_PHOTO)
        String photo() {
            return "ok";
        }

        @PostMapping("/v1/probe/sign-in")
        @RateLimited(RateLimitGroup.SIGN_IN)
        String signIn() {
            return "ok";
        }

        @PostMapping("/v1/probe/free")
        String free() {
            return "ok";
        }
    }

    private static final RateLimitProperties.Rule BURST_OF_2 = new RateLimitProperties.Rule(2, Duration.ofMinutes(30));

    private MockMvc mvc;

    @BeforeEach
    void aServerWithBurstsOfTwo() {
        Map<RateLimitGroup, RateLimitProperties.Rule> rules = new EnumMap<>(RateLimitGroup.class);
        for (RateLimitGroup group : RateLimitGroup.values()) {
            rules.put(group, BURST_OF_2);
        }
        RateLimitProperties properties = new RateLimitProperties(1000, Duration.ofMinutes(1), rules);
        RateLimiter limiter = new RateLimiter(java.time.Clock.systemUTC(), properties.maxKeys(), properties.sweepEvery());
        mvc = MockMvcBuilders.standaloneSetup(new Probe()).setControllerAdvice(new ApiErrorHandler())
                .addInterceptors(new RateLimitInterceptor(limiter, properties)).build();
    }

    @AfterEach
    void signedOut() {
        SecurityContextHolder.clearContext();
    }

    private static void signedInAs(UUID account) {
        Jwt token = Jwt.withTokenValue("test").header("alg", "none").subject(account.toString()).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(token));
    }

    private static RequestPostProcessor from(String address) {
        return request -> {
            request.setRemoteAddr(address);
            return request;
        };
    }

    private ResultActions call(String route, RequestPostProcessor... how) throws Exception {
        var request = post(route).contentType(MediaType.APPLICATION_JSON).content("{\"weight\":82.4}");
        for (RequestPostProcessor one : how) {
            request.with(one);
        }
        return mvc.perform(request);
    }

    @Test
    void pastTheBurstTheAnswerIs429WithTheCodeAndHowLongToWait() throws Exception {
        signedInAs(UUID.randomUUID());
        call("/v1/probe/coach").andExpect(status().isOk());
        call("/v1/probe/coach").andExpect(status().isOk());

        // One refill period (30 minutes) less the moments the test took.
        call("/v1/probe/coach").andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", org.hamcrest.Matchers.matchesPattern("17[0-9]{2}|1800")))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(jsonPath("$.message").value("Too many requests. Try again in a moment."))
                .andExpect(jsonPath("$.*").value(org.hamcrest.Matchers.hasSize(2)));
    }

    @Test
    void theRefusalSaysNothingOfWhatTheRequestCarried() throws Exception {
        signedInAs(UUID.randomUUID());
        call("/v1/probe/coach");
        call("/v1/probe/coach");

        String body = call("/v1/probe/coach").andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("82.4").doesNotContain("weight");
    }

    @Test
    void anAccountIsCountedByItsSessionNotByItsAddress() throws Exception {
        UUID first = UUID.randomUUID();
        signedInAs(first);
        call("/v1/probe/coach", from("203.0.113.1"));
        call("/v1/probe/coach", from("203.0.113.2"));
        call("/v1/probe/coach", from("203.0.113.3")).andExpect(status().isTooManyRequests());

        // Another account from the very same address is not touched.
        signedInAs(UUID.randomUUID());
        call("/v1/probe/coach", from("203.0.113.1")).andExpect(status().isOk());
    }

    @Test
    void eachGroupHasItsOwnCount() throws Exception {
        signedInAs(UUID.randomUUID());
        call("/v1/probe/coach");
        call("/v1/probe/coach");
        call("/v1/probe/coach").andExpect(status().isTooManyRequests());

        call("/v1/probe/photo").andExpect(status().isOk());
    }

    @Test
    void signInIsCountedByAddressAndAHeaderTheClientSendsChangesNothing() throws Exception {
        int[] next = {0};
        RequestPostProcessor spoof = request -> {
            request.addHeader("X-Forwarded-For", "198.51.100." + next[0]++);
            request.addHeader("X-Real-IP", "198.51.101." + next[0]);
            return request;
        };
        call("/v1/probe/sign-in", from("203.0.113.9"), spoof).andExpect(status().isOk());
        call("/v1/probe/sign-in", from("203.0.113.9"), spoof).andExpect(status().isOk());

        call("/v1/probe/sign-in", from("203.0.113.9"), spoof).andExpect(status().isTooManyRequests());
        call("/v1/probe/sign-in", from("203.0.113.10")).andExpect(status().isOk());
    }

    @Test
    void anAccountRouteWithoutASessionFallsBackToTheAddressInsteadOfBeingFree() throws Exception {
        call("/v1/probe/coach", from("203.0.113.20")).andExpect(status().isOk());
        call("/v1/probe/coach", from("203.0.113.20")).andExpect(status().isOk());

        call("/v1/probe/coach", from("203.0.113.20")).andExpect(status().isTooManyRequests());
    }

    @Test
    void aRouteWithoutTheAnnotationIsNeverLimited() throws Exception {
        signedInAs(UUID.randomUUID());
        for (int i = 0; i < 20; i++) {
            call("/v1/probe/free").andExpect(status().isOk());
        }
    }
}
