package app.keel.shared.web;

import java.time.Clock;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeSet;

/**
 * A token bucket per client (K-817), kept as one number per client: the moment the bucket would be full again
 * (the generic cell rate algorithm, the same limit as a counter of tokens that refill by the clock, without a timer).
 * A client may spend {@code burst} requests at once; each costs one refill period of that moment, and a request that would
 * put the moment more than {@code burst} periods ahead is refused, without moving it.
 *
 * <p>What it keeps is a key and a number (V3: no body, no header, no health data, nothing a request carried). The clients
 * are also ordered by that moment, so the ones whose bucket is full again (the same as never seen) are the first in the order
 * and are dropped from the front, a cost of the clients dropped and no scan; nothing runs on a timer.
 *
 * <p>The table is bounded ({@code maxKeys}) and the bound never lets a request through uncounted: when it is full of clients
 * still waiting, the one whose bucket would be full again soonest (the closest to being forgotten, so the one that loses the
 * least) gives up its place, and its next request starts with a fresh burst. Both steps are O(log n) under one lock, the
 * work being a few map operations; the server has one process.
 */
final class RateLimiter {

    /** Whether the request may go on; when it may not, whole seconds (at least 1) until it could. */
    record Decision(boolean allowed, long retryAfterSeconds) {
    }

    /** A client and the moment its bucket is full again; ordered by the moment, then the key (so two clients never tie). */
    private record Slot(long fullAgainAt, String key) {
        static final Comparator<Slot> ORDER = Comparator.comparingLong(Slot::fullAgainAt).thenComparing(Slot::key);
    }

    private static final Decision ALLOWED = new Decision(true, 0);

    private final Clock clock;
    private final int maxKeys;
    private final Map<String, Long> fullAgainAt = new HashMap<>();
    private final TreeSet<Slot> soonestFirst = new TreeSet<>(Slot.ORDER);

    RateLimiter(Clock clock, int maxKeys) {
        this.clock = clock;
        this.maxKeys = maxKeys;
    }

    synchronized Decision tryAcquire(String key, RateLimitProperties.Rule rule) {
        long now = clock.millis();
        forgetFullAgain(now);
        long period = rule.refillEvery().toMillis();
        long room = period * rule.burst();
        Long known = fullAgainAt.get(key);
        long after = (known == null ? now : known) + period;
        if (after - now > room) {
            long waitMillis = after - room - now;
            return new Decision(false, Math.max(1, (waitMillis + 999) / 1000));
        }
        if (known != null) {
            soonestFirst.remove(new Slot(known, key));
        } else if (fullAgainAt.size() >= maxKeys) {
            Slot closestToForgotten = soonestFirst.pollFirst();
            fullAgainAt.remove(closestToForgotten.key());
        }
        fullAgainAt.put(key, after);
        soonestFirst.add(new Slot(after, key));
        return ALLOWED;
    }

    /** Clients tracked now (a test's view of the memory bound). */
    synchronized int size() {
        return fullAgainAt.size();
    }

    // A bucket that is full again (its moment has passed) holds nothing the absence of the client would not.
    private void forgetFullAgain(long now) {
        while (!soonestFirst.isEmpty() && soonestFirst.first().fullAgainAt() <= now) {
            fullAgainAt.remove(soonestFirst.pollFirst().key());
        }
    }
}
