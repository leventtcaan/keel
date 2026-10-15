package app.keel.shared.web;

import java.time.Clock;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * A token bucket per client (K-817), kept as one number per client: the moment the bucket would be full again
 * (the generic cell rate algorithm, the same limit as a counter of tokens that refill by the clock, without a timer).
 * A client may spend {@code burst} requests at once; each costs one refill period of that moment, and a request that would
 * put the moment more than {@code burst} periods ahead is refused, without moving it.
 *
 * <p>What it keeps is a key and a number (V3: no body, no header, no health data, nothing a request carried). A client
 * whose bucket is full again is the same as one never seen, so it is dropped: every {@code sweepEvery} the idle ones go.
 * The table is also bounded ({@code maxKeys}): when it is full of clients still waiting, a new client is let through
 * uncounted, since memory matters more than counting a flood exactly; clients already counted stay limited.
 *
 * <p>One lock, because the work under it is a map lookup and some arithmetic and the server has one process.
 */
final class RateLimiter {

    /** Whether the request may go on; when it may not, whole seconds (at least 1) until it could. */
    record Decision(boolean allowed, long retryAfterSeconds) {
    }

    private static final Decision ALLOWED = new Decision(true, 0);

    private final Clock clock;
    private final int maxKeys;
    private final long sweepEveryMillis;
    private final Map<String, Long> fullAgainAt = new HashMap<>();
    private long nextSweepAt;

    RateLimiter(Clock clock, int maxKeys, Duration sweepEvery) {
        this.clock = clock;
        this.maxKeys = maxKeys;
        this.sweepEveryMillis = sweepEvery.toMillis();
        this.nextSweepAt = clock.millis() + sweepEveryMillis;
    }

    synchronized Decision tryAcquire(String key, RateLimitProperties.Rule rule) {
        long now = clock.millis();
        if (now >= nextSweepAt) {
            sweep(now);
        }
        long period = rule.refillEvery().toMillis();
        long room = period * rule.burst();
        Long known = fullAgainAt.get(key);
        if (known == null && fullAgainAt.size() >= maxKeys) {
            sweep(now);
            if (fullAgainAt.size() >= maxKeys) {
                return ALLOWED;
            }
        }
        long after = Math.max(known == null ? now : known, now) + period;
        if (after - now > room) {
            long waitMillis = after - room - now;
            return new Decision(false, Math.max(1, (waitMillis + 999) / 1000));
        }
        fullAgainAt.put(key, after);
        return ALLOWED;
    }

    /** Clients tracked now (a test's view of the memory bound). */
    synchronized int size() {
        return fullAgainAt.size();
    }

    // A bucket that is full again (its moment has passed) holds nothing the absence of the client would not.
    private void sweep(long now) {
        fullAgainAt.values().removeIf(moment -> moment <= now);
        nextSweepAt = now + sweepEveryMillis;
    }
}
