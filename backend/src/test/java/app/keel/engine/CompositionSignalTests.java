package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.BigRange;
import net.jqwik.api.constraints.IntRange;
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
    private static final int MIN_SPAN = P.wholeNumber(ParameterKey.WAIST_SIGNAL_MIN_SPAN_DAYS);
    private static final OptionalInt SPAN = OptionalInt.of(MIN_SPAN);

    @Test
    void weightSteadyAndWaistDownIsTheSignal() {
        Optional<Reason> signal = CompositionSignal.of(List.of(START, new BigDecimal("80.20"), START), Phase.CUT, CheckIn.Waist.DOWN, SPAN, P);

        assertThat(signal).map(reason -> reason.rule().value()).contains("weight_steady_waist_down");
        assertThat(signal).map(Reason::source).contains(new Source("arastirma/ham/H1-olcum.md#1.6", SourceTag.LITERATURE));
    }

    @Test
    void steadyIsWithinTheFlatMarginEitherWay() {
        // The spine's margin (ADR-020 L-10): at it, steady; one hundredth past it, the scale moved — up or down.
        assertThat(CompositionSignal.of(List.of(START, START.add(MARGIN)), Phase.CUT, CheckIn.Waist.DOWN, SPAN, P)).isPresent();
        assertThat(CompositionSignal.of(List.of(START, START.subtract(MARGIN)), Phase.CUT, CheckIn.Waist.DOWN, SPAN, P)).isPresent();
        assertThat(CompositionSignal.of(List.of(START, START.add(MARGIN).add(new BigDecimal("0.01"))), Phase.CUT, CheckIn.Waist.DOWN, SPAN, P)).isEmpty();
        assertThat(CompositionSignal.of(List.of(START, START.subtract(MARGIN).subtract(new BigDecimal("0.01"))), Phase.CUT, CheckIn.Waist.DOWN, SPAN, P)).isEmpty();
    }

    @Test
    void aWaistThatDidNotGoDownBeyondItsErrorIsNoSignal() {
        // WaistTrend reads DOWN only past waist_measurement_error_cm (H1 §1.2): a flat, rising or unmeasured waist says nothing.
        for (CheckIn.Waist waist : List.of(CheckIn.Waist.FLAT, CheckIn.Waist.UP, CheckIn.Waist.UNKNOWN)) {
            assertThat(CompositionSignal.of(List.of(START, START), Phase.CUT, waist, SPAN, P)).as(waist.name()).isEmpty();
        }
    }

    @Test
    void aCutTheSpineCallsMovingIsNotSteady() {
        // K-603 review: 80.50 → 80.40 → 80.00 is within the margin first to latest, but this week's step reached its share
        // and the window went down — the spine says moving toward the goal (ADR-027 #0). Not "steady" beside that call.
        List<BigDecimal> moving = List.of(new BigDecimal("80.50"), new BigDecimal("80.40"), new BigDecimal("80.00"));
        assertThat(CompositionSignal.of(moving, Phase.CUT, CheckIn.Waist.DOWN, SPAN, P)).isEmpty();
    }

    @Test
    void waistReadingsCloserThanTheirSpanSayNothing() {
        // H1 §1.5: a week's waist change is noise — two to four weeks apart, or nothing is said of it (§1.6: never one reading).
        List<BigDecimal> steady = List.of(START, START, START);
        assertThat(CompositionSignal.of(steady, Phase.CUT, CheckIn.Waist.DOWN, OptionalInt.of(MIN_SPAN - 1), P)).isEmpty();
        assertThat(CompositionSignal.of(steady, Phase.CUT, CheckIn.Waist.DOWN, OptionalInt.of(MIN_SPAN), P)).isPresent();
        // A call kept before the span was: not known, so nothing is said.
        assertThat(CompositionSignal.of(steady, Phase.CUT, CheckIn.Waist.DOWN, OptionalInt.empty(), P)).isEmpty();
    }

    @Test
    void withoutTwoWeeksTheWeightHasNoTrend() {
        assertThat(CompositionSignal.of(List.of(START), Phase.CUT, CheckIn.Waist.DOWN, SPAN, P)).isEmpty();
        assertThat(CompositionSignal.of(List.of(), Phase.CUT, CheckIn.Waist.DOWN, SPAN, P)).isEmpty();
    }

    @Property
    boolean theSignalNeverComesWithoutAWaistDownOrWithTheScaleMovingPastTheMargin(
            @ForAll @Size(min = 0, max = 5) List<@BigRange(min = "60", max = "120") BigDecimal> weeks, @ForAll CheckIn.Waist waist,
            @ForAll Phase phase, @ForAll @IntRange(min = 0, max = 28) int span) {
        Optional<Reason> signal = CompositionSignal.of(new ArrayList<>(weeks), phase, waist, OptionalInt.of(span), P);
        if (signal.isEmpty()) {
            return true;
        }
        return waist == CheckIn.Waist.DOWN && weeks.size() >= 2 && weeks.getLast().subtract(weeks.getFirst()).abs().compareTo(MARGIN) <= 0
                && span >= MIN_SPAN;
    }
}
