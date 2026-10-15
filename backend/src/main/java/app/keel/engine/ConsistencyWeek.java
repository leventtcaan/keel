package app.keel.engine;

import java.time.LocalDate;
import java.util.Objects;

/**
 * One week of the consistency grid (K-1016, ADR-078 #2): the Monday it began and how the record read it. The state is
 * what the same walk that makes the record's totals decided. The grid shows only the last weeks, so the cells add up to
 * the totals when the record is no longer than the grid, and are a part of them when it is longer.
 */
public record ConsistencyWeek(LocalDate weekOf, State state) {

    public ConsistencyWeek {
        Objects.requireNonNull(weekOf, "weekOf");
        Objects.requireNonNull(state, "state");
    }

    /** No state is named for blame (U7). */
    public enum State {
        /** At on_track_min_ratio of the plan or above. */
        ON_TRACK,
        /** The lone missed week after a week on track that the run forgave; counted in forgivenWeeks, never taken back. */
        SPARE,
        /** A miss that was not forgiven: the second in a row, or one with no run before it. */
        MISSED,
        /** Neither a success nor a miss, left out of the record: a day of the week under a declared state (K-516), or the ladder's week off (K-1022). */
        PAUSED
    }
}
