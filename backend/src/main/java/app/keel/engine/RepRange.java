package app.keel.engine;

/**
 * The rep range of a lift in the user's programme, e.g. 8-12 (G1 rep-range rules; H3 B4: 4-5 reps wide), or a fixed rep
 * target, min = max (5 x 5, K-991): double progression with one rung, the load the only thing that climbs.
 */
public record RepRange(int min, int max) {

    public RepRange {
        if (min < 1 || max < min) {
            throw new IllegalArgumentException("A rep range needs 1 <= min <= max, got " + min + "-" + max);
        }
    }

    /** A fixed rep target (K-991): no reps to climb inside it, so no rep step. */
    public boolean fixed() {
        return min == max;
    }
}
