package app.keel.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * The noise on the difference between two weekly means, from how many weigh-ins each has (K-1204, ADR-091 Ek 4). ADR-020 L-10
 * derived flat_margin_kg for n = min_weighins_per_week weigh-ins in each edge week: 1.96 · 0.42 · √(2/n) ≈ 0.58 kg (H1 §3.4).
 * The same derivation for n1 and n2 weigh-ins is 1.96 · 0.42 · √(1/n1 + 1/n2), that is
 * flat_margin_kg · √((1/n1 + 1/n2) / (2/n)). It is a generalisation, not a citation. A week counts for at most n weigh-ins, so
 * dense data never gets a smaller margin than the 0.58 the rules were set with, and sparser data never a smaller one than dense.
 */
final class NoiseMargin {

    private NoiseMargin() {
    }

    /** Whole hundredths of a kilogram, half up. */
    static BigDecimal of(int firstWeekWeighIns, int lastWeekWeighIns, Parameters parameters) {
        int full = parameters.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK);
        double first = Math.min(Math.max(firstWeekWeighIns, 1), full);
        double last = Math.min(Math.max(lastWeekWeighIns, 1), full);
        double factor = Math.sqrt((1 / first + 1 / last) / (2.0 / full));
        return BigDecimal.valueOf(parameters.number(ParameterKey.FLAT_MARGIN_KG) * factor).setScale(2, RoundingMode.HALF_UP);
    }
}
