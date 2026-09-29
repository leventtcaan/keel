package app.keel.engine;

import java.math.BigDecimal;
import java.math.MathContext;
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
        BigDecimal factor = BigDecimal.ONE.add(BigDecimal.valueOf(toFailure)
                .divide(BigDecimal.valueOf(parameters.wholeNumber(ParameterKey.E1RM_EPLEY_DIVISOR)), MathContext.DECIMAL64));
        return Optional.of(loadKg.multiply(factor).setScale(1, RoundingMode.HALF_UP));
    }
}
