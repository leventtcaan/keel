package app.keel.engine;

/**
 * One kind of planned action in a week (training sessions, protein days, step days or weigh-ins): how many were
 * planned and how many done. Extra work of a kind counts up to the plan, never beyond it, so it cannot make up for
 * another kind (U7: no make-up mechanics).
 */
public record ActionTally(int planned, int done) {

    public ActionTally {
        if (planned < 0 || done < 0) {
            throw new IllegalArgumentException("Planned and done are 0 or more, got " + planned + " and " + done);
        }
    }

    /** Done, counted up to what was planned. */
    public int counted() {
        return Math.min(done, planned);
    }
}
