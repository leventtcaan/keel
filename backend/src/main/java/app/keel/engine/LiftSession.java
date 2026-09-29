package app.keel.engine;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

/**
 * The latest session of one lift: what it is, its rep range, the load used and the work sets done.
 * {@code techniqueClean} is the user's (or the clip review's) answer to "was every rep clean and comfortable?".
 */
public record LiftSession(LiftKind kind, BodyRegion region, RepRange range, BigDecimal loadKg, List<SetResult> sets,
        boolean techniqueClean) {

    public LiftSession {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(region, "region");
        Objects.requireNonNull(range, "range");
        Objects.requireNonNull(loadKg, "loadKg");
        Objects.requireNonNull(sets, "sets");
        sets = List.copyOf(sets);
        if (sets.isEmpty() || loadKg.signum() <= 0) {
            throw new IllegalArgumentException("A lift session needs at least one set and a load above 0 kg");
        }
    }
}
