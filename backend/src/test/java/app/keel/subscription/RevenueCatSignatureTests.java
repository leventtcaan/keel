package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

/**
 * RevenueCat's webhook signature (ADR-056 #1; docs, read 4 Oct): {@code X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex>},
 * HMAC-SHA256 of {@code "<t>." + raw body} keyed by the signing secret's UTF-8 bytes. Only a request signed with our secret, over
 * this very body, within the tolerance, is RevenueCat's.
 */
class RevenueCatSignatureTests {

    private static final byte[] SECRET = "test-only signing secret".getBytes(StandardCharsets.UTF_8);
    private static final byte[] BODY = "{\"api_version\":\"1.0\",\"event\":{\"id\":\"e1\"}}".getBytes(StandardCharsets.UTF_8);
    private static final Instant NOW = Instant.parse("2026-10-04T12:00:00Z");
    private static final Duration TOLERANCE = Duration.ofMinutes(5);

    /** The signature as the docs compute it: hmac(secret.encode(), f"{t}.".encode() + body).hexdigest(). */
    static String sign(byte[] secret, long t, byte[] body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            mac.update((t + ".").getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(mac.doFinal(body));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String header(long t, String v1) {
        return "t=" + t + ",v1=" + v1;
    }

    @Test
    void ourSecretOverThisBodyNowIsRevenueCats() {
        long t = NOW.getEpochSecond();

        assertThat(WebhookSignature.verify(header(t, sign(SECRET, t, BODY)), BODY, SECRET, NOW, TOLERANCE)).isTrue();
        // Hex is hex in either case.
        assertThat(WebhookSignature.verify(header(t, sign(SECRET, t, BODY).toUpperCase()), BODY, SECRET, NOW, TOLERANCE)).isTrue();
    }

    @Test
    void anotherSecretIsRefused() {
        long t = NOW.getEpochSecond();
        byte[] other = "another secret".getBytes(StandardCharsets.UTF_8);

        assertThat(WebhookSignature.verify(header(t, sign(other, t, BODY)), BODY, SECRET, NOW, TOLERANCE)).isFalse();
    }

    @Test
    void aBodyChangedOnTheWayIsRefused() {
        long t = NOW.getEpochSecond();
        byte[] changed = "{\"api_version\":\"1.0\",\"event\":{\"id\":\"e2\"}}".getBytes(StandardCharsets.UTF_8);

        assertThat(WebhookSignature.verify(header(t, sign(SECRET, t, BODY)), changed, SECRET, NOW, TOLERANCE)).isFalse();
    }

    @Test
    void theTimeIsPartOfWhatIsSigned() {
        long t = NOW.getEpochSecond();

        // The signature of another moment, presented with this one: a replayed request with a fresh t.
        assertThat(WebhookSignature.verify(header(t, sign(SECRET, t - 600, BODY)), BODY, SECRET, NOW, TOLERANCE)).isFalse();
    }

    @Test
    void aSignatureOutsideTheToleranceIsRefusedEitherWay() {
        long edge = TOLERANCE.toSeconds();
        long old = NOW.getEpochSecond() - edge;
        long ahead = NOW.getEpochSecond() + edge;

        assertThat(WebhookSignature.verify(header(old, sign(SECRET, old, BODY)), BODY, SECRET, NOW, TOLERANCE)).as("at the edge").isTrue();
        assertThat(WebhookSignature.verify(header(ahead, sign(SECRET, ahead, BODY)), BODY, SECRET, NOW, TOLERANCE)).as("ahead, at the edge").isTrue();
        assertThat(WebhookSignature.verify(header(old - 1, sign(SECRET, old - 1, BODY)), BODY, SECRET, NOW, TOLERANCE)).as("too old").isFalse();
        assertThat(WebhookSignature.verify(header(ahead + 1, sign(SECRET, ahead + 1, BODY)), BODY, SECRET, NOW, TOLERANCE)).as("too far ahead").isFalse();
    }

    @Test
    void aHeaderThatIsNotOneIsRefused() {
        long t = NOW.getEpochSecond();
        String good = sign(SECRET, t, BODY);

        assertThat(WebhookSignature.verify(null, BODY, SECRET, NOW, TOLERANCE)).as("none").isFalse();
        assertThat(WebhookSignature.verify("", BODY, SECRET, NOW, TOLERANCE)).as("empty").isFalse();
        assertThat(WebhookSignature.verify("v1=" + good, BODY, SECRET, NOW, TOLERANCE)).as("no time").isFalse();
        assertThat(WebhookSignature.verify("t=" + t, BODY, SECRET, NOW, TOLERANCE)).as("no signature").isFalse();
        assertThat(WebhookSignature.verify("t=soon,v1=" + good, BODY, SECRET, NOW, TOLERANCE)).as("time not a number").isFalse();
        assertThat(WebhookSignature.verify(header(t, "zz" + good.substring(2)), BODY, SECRET, NOW, TOLERANCE)).as("not hex").isFalse();
        assertThat(WebhookSignature.verify(header(t, good.substring(2)), BODY, SECRET, NOW, TOLERANCE)).as("short").isFalse();
        assertThat(WebhookSignature.verify(header(t, ""), BODY, SECRET, NOW, TOLERANCE)).as("empty signature").isFalse();
        assertThat(WebhookSignature.verify("t=" + t + ",t=" + (t - 999) + ",v1=" + good, BODY, SECRET, NOW, TOLERANCE)).as("two times").isFalse();
        assertThat(WebhookSignature.verify("t=" + Long.MAX_VALUE + ",v1=" + good, BODY, SECRET, NOW, TOLERANCE)).as("a time past any clock").isFalse();
        // Two times, the stale one first: a second t is refused, not read over the first.
        assertThat(WebhookSignature.verify("t=" + (t - 999) + ",t=" + t + ",v1=" + good, BODY, SECRET, NOW, TOLERANCE)).as("two times, stale first").isFalse();
        // More digits than a long holds: refused, never an exception (a 500 RevenueCat would send five more times).
        assertThat(WebhookSignature.verify("t=" + "9".repeat(20) + ",v1=" + good, BODY, SECRET, NOW, TOLERANCE)).as("20 digits").isFalse();
        assertThat(WebhookSignature.verify("t,v1=" + good, BODY, SECRET, NOW, TOLERANCE)).as("a bare t").isFalse();
        assertThat(WebhookSignature.verify("t=-" + t + ",v1=" + good, BODY, SECRET, NOW, TOLERANCE)).as("a sign").isFalse();
    }

    @Test
    void anyOfSeveralSignaturesMayBeOurs() {
        long t = NOW.getEpochSecond();
        String other = sign("old secret".getBytes(StandardCharsets.UTF_8), t, BODY);

        assertThat(WebhookSignature.verify("t=" + t + ",v1=" + other + ",v1=" + sign(SECRET, t, BODY), BODY, SECRET, NOW, TOLERANCE)).isTrue();
        assertThat(WebhookSignature.verify(" t=" + t + ", v1=" + sign(SECRET, t, BODY), BODY, SECRET, NOW, TOLERANCE)).as("spaces after commas").isTrue();
        // Ours first, another after it: still ours (any, not the last).
        assertThat(WebhookSignature.verify("t=" + t + ",v1=" + sign(SECRET, t, BODY) + ",v1=" + other, BODY, SECRET, NOW, TOLERANCE)).as("ours first").isTrue();
    }

    @Test
    void aFieldOfAnotherSchemeIsLeftAlone() {
        long t = NOW.getEpochSecond();

        // A scheme RevenueCat may add later (v0, v2…) must not break the webhook while v1 is ours.
        assertThat(WebhookSignature.verify("t=" + t + ",v0=xyz,v1=" + sign(SECRET, t, BODY), BODY, SECRET, NOW, TOLERANCE)).isTrue();
        assertThat(WebhookSignature.verify("t=" + t + ",v0=" + sign(SECRET, t, BODY), BODY, SECRET, NOW, TOLERANCE)).as("only another scheme").isFalse();
    }
}
