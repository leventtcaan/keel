package app.keel.shared.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

/**
 * The limiter (K-817): a burst, then one request every refill period; the clock is the test's, so every number here is
 * exact. It keeps a key and a time per client, nothing a request carried (V3).
 */
class RateLimiterTests {

    private static final RateLimitProperties.Rule BURST_OF_3 = new RateLimitProperties.Rule(3, Duration.ofSeconds(10));

    /** A clock the test moves. */
    static final class Moving extends Clock {
        private Instant now = Instant.parse("2026-10-15T09:00:00Z");

        void pass(Duration time) {
            now = now.plus(time);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private final Moving clock = new Moving();
    private final RateLimiter limiter = new RateLimiter(clock, 1000, Duration.ofMinutes(1));

    private void spendTheBurst(RateLimiter on, String key) {
        for (int i = 0; i < 3; i++) {
            assertThat(on.tryAcquire(key, BURST_OF_3).allowed()).as("request " + (i + 1)).isTrue();
        }
    }

    @Test
    void aBurstGoesThroughAndTheNextRequestWaitsOneRefillPeriod() {
        spendTheBurst(limiter, "a");

        RateLimiter.Decision refused = limiter.tryAcquire("a", BURST_OF_3);

        assertThat(refused.allowed()).isFalse();
        assertThat(refused.retryAfterSeconds()).isEqualTo(10);
    }

    @Test
    void aRefusedRequestDoesNotPushTheWaitFurtherAway() {
        spendTheBurst(limiter, "a");
        for (int i = 0; i < 50; i++) {
            assertThat(limiter.tryAcquire("a", BURST_OF_3).allowed()).isFalse();
        }

        clock.pass(Duration.ofSeconds(10));

        assertThat(limiter.tryAcquire("a", BURST_OF_3).allowed()).isTrue();
    }

    @Test
    void oneRequestIsEarnedBackEveryRefillPeriod() {
        spendTheBurst(limiter, "a");

        clock.pass(Duration.ofSeconds(9));
        RateLimiter.Decision early = limiter.tryAcquire("a", BURST_OF_3);
        assertThat(early.allowed()).isFalse();
        assertThat(early.retryAfterSeconds()).isEqualTo(1);

        clock.pass(Duration.ofSeconds(1));
        assertThat(limiter.tryAcquire("a", BURST_OF_3).allowed()).isTrue();
        assertThat(limiter.tryAcquire("a", BURST_OF_3).allowed()).isFalse();
    }

    @Test
    void anIdleClientHasItsWholeBurstBackButNeverMore() {
        spendTheBurst(limiter, "a");

        clock.pass(Duration.ofHours(5));

        spendTheBurst(limiter, "a");
        assertThat(limiter.tryAcquire("a", BURST_OF_3).allowed()).isFalse();
    }

    @Test
    void clientsAreCountedApart() {
        spendTheBurst(limiter, "a");

        assertThat(limiter.tryAcquire("a", BURST_OF_3).allowed()).isFalse();
        assertThat(limiter.tryAcquire("b", BURST_OF_3).allowed()).isTrue();
    }

    @Test
    void theWaitIsRoundedUpToWholeSeconds() {
        RateLimitProperties.Rule slow = new RateLimitProperties.Rule(1, Duration.ofMillis(2500));
        limiter.tryAcquire("a", slow);

        assertThat(limiter.tryAcquire("a", slow).retryAfterSeconds()).isEqualTo(3);
    }

    @Test
    void aClientThatHasEarnedEverythingBackIsForgotten() {
        for (int i = 0; i < 100; i++) {
            limiter.tryAcquire("client-" + i, BURST_OF_3);
        }
        assertThat(limiter.size()).isEqualTo(100);

        // Idle for longer than one request takes to earn back (10 s), and a sweep (every minute) is due.
        clock.pass(Duration.ofMinutes(2));
        limiter.tryAcquire("fresh", BURST_OF_3);

        assertThat(limiter.size()).isEqualTo(1);
    }

    @Test
    void aClientStillWaitingIsNotForgotten() {
        RateLimitProperties.Rule slow = new RateLimitProperties.Rule(2, Duration.ofMinutes(10));
        limiter.tryAcquire("slow", slow);
        limiter.tryAcquire("slow", slow);

        clock.pass(Duration.ofMinutes(1));
        limiter.tryAcquire("other", BURST_OF_3);

        assertThat(limiter.size()).isEqualTo(2);
        assertThat(limiter.tryAcquire("slow", slow).allowed()).isFalse();
    }

    @Test
    void memoryIsBoundedWhenMoreClientsThanTheLimitAreActive() {
        RateLimiter small = new RateLimiter(clock, 5, Duration.ofMinutes(1));
        for (int i = 0; i < 100; i++) {
            small.tryAcquire("client-" + i, BURST_OF_3);
        }

        assertThat(small.size()).isEqualTo(5);
        // Past the bound a new client is let through uncounted (memory over accuracy); a client already counted is still limited.
        assertThat(small.tryAcquire("client-new", BURST_OF_3).allowed()).isTrue();
        assertThat(small.size()).isEqualTo(5);
        small.tryAcquire("client-0", BURST_OF_3);
        small.tryAcquire("client-0", BURST_OF_3);
        assertThat(small.tryAcquire("client-0", BURST_OF_3).allowed()).isFalse();
    }

    @Test
    void roomComesBackWhenIdleClientsAreSweptOut() {
        RateLimiter small = new RateLimiter(clock, 2, Duration.ofMinutes(1));
        small.tryAcquire("a", BURST_OF_3);
        small.tryAcquire("b", BURST_OF_3);

        clock.pass(Duration.ofMinutes(5));
        spendTheBurst(small, "c");

        assertThat(small.size()).isEqualTo(1);
        assertThat(small.tryAcquire("c", BURST_OF_3).allowed()).isFalse();
    }
}
