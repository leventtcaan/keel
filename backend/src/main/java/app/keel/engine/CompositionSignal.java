package app.keel.engine;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * "Weight steady, waist down" (K-603): with the scale held, a waist going down is a change in composition — abdominal
 * fat falls with the weight unchanged (H1 §1.6, Ross 2000). It is the signal that keeps someone going when the scale
 * stops, so it is said; it never changes the call (that is the spine's, and its waist rule is K-64's).
 *
 * <p>Steady is the spine's own flat_margin_kg between the decision window's first and latest weekly means (ADR-020 L-10);
 * down is WaistTrend's, past waist_measurement_error_cm (H1 §1.2) — no new threshold.
 */
public final class CompositionSignal {

    static final RuleId WEIGHT_STEADY_WAIST_DOWN = new RuleId("weight_steady_waist_down");
    private static final Source ROSS = new Source("arastirma/ham/H1-olcum.md#1.6", SourceTag.LITERATURE);

    private CompositionSignal() {
    }

    /** {@code weeklyMeans}: the decision window's, oldest first; {@code waist}: WaistTrend's over the same window. */
    public static Optional<Reason> of(List<BigDecimal> weeklyMeans, CheckIn.Waist waist, Parameters parameters) {
        if (waist != CheckIn.Waist.DOWN || weeklyMeans.size() < 2) {
            return Optional.empty();
        }
        BigDecimal moved = weeklyMeans.getLast().subtract(weeklyMeans.getFirst()).abs();
        boolean steady = moved.compareTo(BigDecimal.valueOf(parameters.number(ParameterKey.FLAT_MARGIN_KG))) <= 0;
        return steady ? Optional.of(new Reason(WEIGHT_STEADY_WAIST_DOWN, ROSS)) : Optional.empty();
    }
}
