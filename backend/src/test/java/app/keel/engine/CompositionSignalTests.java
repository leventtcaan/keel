package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.BigRange;
import net.jqwik.api.constraints.Size;
import org.junit.jupiter.api.Test;

/**
 * "Weight steady, waist down" (K-603, H1 §1.6: Ross 2000 — abdominal fat falls with the weight unchanged): the scale
 * held within flat_margin_kg over the decision window, the waist down beyond its own error (waist_measurement_error_cm,
 * WaistTrend). The signal that keeps someone going when the scale stops (H1 §1.6); it never changes the call.
 */
class CompositionSignalTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final BigDecimal MARGIN = BigDecimal.valueOf(P.number(ParameterKey.FLAT_MARGIN_KG));
    private static final BigDecimal START = new BigDecimal("80.00");

    @Test
    void weightSteadyAndWaistDownIsTheSignal() {
        Optional<Reason> signal = CompositionSignal.of(List.of(START, new BigDecimal("80.20"), START), CheckIn.Waist.DOWN, P);

        assertThat(signal).map(reason -> reason.rule().value()).contains("weight_steady_waist_down");
        assertThat(signal).map(Reason::source).contains(new Source("arastirma/ham/H1-olcum.md#1.6", SourceTag.LITERATURE));
    }

    @Test
    void steadyIsWithinTheFlatMarginEitherWay() {
        // The spine's margin (ADR-020 L-10): at it, steady; one hundredth past it, the scale moved — up or down.
        assertThat(CompositionSignal.of(List.of(START, START.add(MARGIN)), CheckIn.Waist.DOWN, P)).isPresent();
        assertThat(CompositionSignal.of(List.of(START, START.subtract(MARGIN)), CheckIn.Waist.DOWN, P)).isPresent();
        assertThat(CompositionSignal.of(List.of(START, START.add(MARGIN).add(new BigDecimal("0.01"))), CheckIn.Waist.DOWN, P)).isEmpty();
        assertThat(CompositionSignal.of(List.of(START, START.subtract(MARGIN).subtract(new BigDecimal("0.01"))), CheckIn.Waist.DOWN, P)).isEmpty();
    }

    @Test
    void aWaistThatDidNotGoDownBeyondItsErrorIsNoSignal() {
        // WaistTrend reads DOWN only past waist_measurement_error_cm (H1 §1.2): a flat, rising or unmeasured waist says nothing.
        for (CheckIn.Waist waist : List.of(CheckIn.Waist.FLAT, CheckIn.Waist.UP, CheckIn.Waist.UNKNOWN)) {
            assertThat(CompositionSignal.of(List.of(START, START), waist, P)).as(waist.name()).isEmpty();
        }
    }

    @Test
    void withoutTwoWeeksTheWeightHasNoTrend() {
        assertThat(CompositionSignal.of(List.of(START), CheckIn.Waist.DOWN, P)).isEmpty();
        assertThat(CompositionSignal.of(List.of(), CheckIn.Waist.DOWN, P)).isEmpty();
    }

    @Property
    boolean theSignalNeverComesWithoutAWaistDownOrWithTheScaleMovingPastTheMargin(
            @ForAll @Size(min = 0, max = 5) List<@BigRange(min = "60", max = "120") BigDecimal> weeks, @ForAll CheckIn.Waist waist) {
        Optional<Reason> signal = CompositionSignal.of(new ArrayList<>(weeks), waist, P);
        if (signal.isEmpty()) {
            return true;
        }
        return waist == CheckIn.Waist.DOWN && weeks.size() >= 2 && weeks.getLast().subtract(weeks.getFirst()).abs().compareTo(MARGIN) <= 0;
    }
}
