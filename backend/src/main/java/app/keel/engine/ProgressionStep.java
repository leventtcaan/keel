package app.keel.engine;

import java.math.BigDecimal;
import java.util.Objects;

/** What to do with one lift next session. */
public sealed interface ProgressionStep {

    /** Every set reached the top of the range: the next load, and the rep target to climb from (the range's bottom). */
    record AddLoad(BigDecimal newLoadKg, int targetReps) implements ProgressionStep {

        public AddLoad {
            Objects.requireNonNull(newLoadKg, "newLoadKg");
        }
    }

    /** Same load, beat last session's reps. */
    record AddReps() implements ProgressionStep {
    }

    /** Same load and reps: technique first. */
    record Hold() implements ProgressionStep {
    }

    /** Isolation lift: trained by feel, no load tracking. */
    record NotTracked() implements ProgressionStep {
    }
}
