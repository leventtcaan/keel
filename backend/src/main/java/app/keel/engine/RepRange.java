package app.keel.engine;

/** The rep range of a lift in the user's programme, e.g. 8-12 (G1 rep-range rules; H3 B4: 4-5 reps wide). */
public record RepRange(int min, int max) {

    public RepRange {
        if (min < 1 || max <= min) {
            throw new IllegalArgumentException("A rep range needs 1 <= min < max, got " + min + "-" + max);
        }
    }
}
