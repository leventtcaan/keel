package app.keel.engine;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;

/**
 * "Weight steady, waist down" (K-603): with the scale held, a waist going down is a change in composition — abdominal
 * fat falls with the weight unchanged (H1 §1.6, Ross 2000). It is the signal that keeps someone going when the scale
 * stops, so it is said; it never changes the call (that is the spine's, and its waist rule is K-64's).
 *
 * <p>Steady is the spine's own reading (WeeklySpine.steady: flat_margin_kg, ADR-020 L-10, and on a cut not this week's
 * step it calls moving); down is WaistTrend's, past waist_measurement_error_cm (H1 §1.2), from readings at least
 * waist_signal_min_span_days apart (H1 §1.5: a week's waist change is noise; §1.6: never one reading).
 */
public final class CompositionSignal {

    static final RuleId WEIGHT_STEADY_WAIST_DOWN = new RuleId("weight_steady_waist_down");
    private static final Source ROSS = new Source("arastirma/ham/H1-olcum.md#1.6", SourceTag.LITERATURE);

    private CompositionSignal() {
    }

    /**
     * {@code weeklyMeans}: the decision window's, oldest first; {@code waist}: WaistTrend's over the same window, and the
     * days between its first and last reading (none when not known).
     */
    public static Optional<Reason> of(List<BigDecimal> weeklyMeans, Phase phase, CheckIn.Waist waist, OptionalInt waistSpanDays,
            Parameters parameters) {
        boolean apart = waistSpanDays.isPresent() && waistSpanDays.getAsInt() >= parameters.wholeNumber(ParameterKey.WAIST_SIGNAL_MIN_SPAN_DAYS);
        if (waist != CheckIn.Waist.DOWN || !apart || weeklyMeans.size() < 2) {
            return Optional.empty();
        }
        return WeeklySpine.steady(weeklyMeans, phase, parameters) ? Optional.of(new Reason(WEIGHT_STEADY_WAIST_DOWN, ROSS)) : Optional.empty();
    }
}
