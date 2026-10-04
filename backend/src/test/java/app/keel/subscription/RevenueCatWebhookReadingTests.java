package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

/**
 * How much of a request the webhook reads (ADR-056 #1): never more than the longest event can be, whether the request
 * declares its length or not (a chunked body declares none) — and a body of exactly the limit is read whole. Nothing is
 * weighed here, so no database: an unsigned body stops at the signature.
 */
class RevenueCatWebhookReadingTests {

    private static final int LIMIT = 1024;
    private final RevenueCatWebhook webhook = new RevenueCatWebhook(null,
            new RevenueCatProperties("test secret", Duration.ofMinutes(5), "premium", Set.of("PRODUCTION"), LIMIT),
            Clock.fixed(Instant.parse("2026-10-04T12:00:00Z"), ZoneOffset.UTC));

    /** A request whose length is unknown, as a chunked one is. */
    private static MockHttpServletRequest undeclared(byte[] body) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", RevenueCatWebhook.PATH) {
            @Override
            public long getContentLengthLong() {
                return -1;
            }

            @Override
            public int getContentLength() {
                return -1;
            }
        };
        request.setContent(body);
        return request;
    }

    private static MockHttpServletRequest declared(byte[] body) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", RevenueCatWebhook.PATH);
        request.setContent(body);
        return request;
    }

    private ErrorCode refusal(MockHttpServletRequest request) {
        try {
            webhook.receive(request);
        } catch (ApiException refused) {
            return refused.code();
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
        throw new AssertionError("not refused");
    }

    @Test
    void aBodyLongerThanTheLimitIsNotReadWhetherItsLengthIsDeclaredOrNot() {
        assertThat(refusal(declared(new byte[LIMIT + 1]))).isEqualTo(ErrorCode.PAYLOAD_TOO_LARGE);
        assertThat(refusal(undeclared(new byte[LIMIT + 1]))).isEqualTo(ErrorCode.PAYLOAD_TOO_LARGE);
    }

    @Test
    void aBodyOfExactlyTheLimitIsReadToTheSignature() {
        assertThat(refusal(declared(new byte[LIMIT]))).isEqualTo(ErrorCode.UNAUTHENTICATED);
        assertThat(refusal(undeclared(new byte[LIMIT]))).isEqualTo(ErrorCode.UNAUTHENTICATED);
    }

    @Test
    void nothingIsReadAsAnEventBeforeTheSignature() {
        assertThatThrownBy(() -> webhook.receive(declared("not json".getBytes()))).isInstanceOfSatisfying(ApiException.class,
                refused -> assertThat(refused.code()).isEqualTo(ErrorCode.UNAUTHENTICATED));
    }
}
