package app.keel.engine;

/** One work set: reps done and reps in reserve (RIR: how many more were possible; 0 = to failure). */
public record SetResult(int reps, int rir) {

    public SetResult {
        if (reps < 0 || rir < 0) {
            throw new IllegalArgumentException("Reps and RIR are 0 or more, got " + reps + " reps at RIR " + rir);
        }
    }
}
