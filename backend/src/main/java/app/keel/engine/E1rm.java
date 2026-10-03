package app.keel.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

/**
 * Estimated one-rep max of a work set (K-218, H3 B15): Epley, load × (1 + reps to failure / e1rm_epley_divisor), where
 * reps to failure = reps + RIR. A trend metric for one lift over weeks (K-406, K-604), not a strength claim.
 *
 * <p>No estimate where it would be a guess: without RIR (8 reps at RIR 0 and at RIR 5 are different sets), beyond
 * e1rm_max_reps_to_failure (Mayhew 2008: the equations work best at 2-10 reps), without a rep or a load. One rep to
 * failure is the load itself; Epley would add 3 %.
 *
 * <p>Which sets count is the caller's: only working sets (a warm-up or a drop set is not the lifter's best effort,
 * L3 P6). For a bodyweight move the load is bodyweight + added load.
 */
public final class E1rm {

    private E1rm() {
    }

    public static Optional<BigDecimal> estimate(BigDecimal loadKg, int reps, Integer rir, Parameters parameters) {
        if (rir == null || rir < 0 || reps < 1 || loadKg == null || loadKg.signum() <= 0) {
            return Optional.empty();
        }
        int max = parameters.wholeNumber(ParameterKey.E1RM_MAX_REPS_TO_FAILURE);
        // Each part checked before the sum: reps + RIR in int arithmetic could wrap to a negative (K-218 review).
        if (reps > max || rir > max || reps + rir > max) {
            return Optional.empty();
        }
        int toFailure = reps + rir;
        if (toFailure == 1) {
            return Optional.of(loadKg.setScale(1, RoundingMode.HALF_UP));
        }
        // load × (1 + t/d) as load × (d + t) / d, divided once to a tenth: an exact half goes up. Dividing t/d first, to
        // 16 digits, turned 52.5 × 37/30 = 64.75 into 64.7499… and rounded it down (K-406 review).
        int divisor = parameters.wholeNumber(ParameterKey.E1RM_EPLEY_DIVISOR);
        return Optional.of(loadKg.multiply(BigDecimal.valueOf(divisor + toFailure)).divide(BigDecimal.valueOf(divisor), 1, RoundingMode.HALF_UP));
    }

    /**
     * The reps to failure a set's {@code repsToFailure} at {@code fromKg} are worth at {@code toKg} (K-430, ADR-041 #55):
     * Epley both ways — the reps to failure give a max, the max gives the reps to failure at the other load — rounded
     * down, never under 0. At the same load a set is worth its own reps to failure.
     *
     * <p>Unlike {@link #estimate}, no cap on reps to failure: this compares two loads of one lift for one decision (when a
     * load too far over the last is taken), not a max to show. Past ten reps Epley is less accurate (Mayhew 2008; Reynolds
     * 2006: R² 0.955 from a 20RM against 0.993 from a 5RM); rounding down keeps the error on the side of waiting a session.
     */
    public static int repsToFailureAt(BigDecimal fromKg, int repsToFailure, BigDecimal toKg, Parameters parameters) {
        int divisor = parameters.wholeNumber(ParameterKey.E1RM_EPLEY_DIVISOR);
        // from × (d + t) / d is the max; × d / to − d the reps to failure there: d cancels, one division, rounded down once.
        int there = fromKg.multiply(BigDecimal.valueOf((long) divisor + repsToFailure)).divide(toKg, 0, RoundingMode.FLOOR).intValueExact() - divisor;
        return Math.max(0, there);
    }
}
