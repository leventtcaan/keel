package app.keel.engine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Objects;

/**
 * The engine's only input (ADR-003 §1). "Today" is part of it, so the engine never reads a clock and the same
 * Snapshot always gives the same Decision. Later tasks add the time series (weigh-ins K-103, training K-109, …).
 *
 * @param phase the phase the user is currently in; the phase gate (K-105) may decide to change it
 * @param planStart the day the current calorie target took effect; a plan is judged only after its decision window
 * @param weights every weigh-in up to today, imported history included (ADR-018)
 * @param fatProxyPct the internal body-fat estimate from the visual/waist proxy, if there is one. U4: an input only;
 *     no Decision carries it, and it is never shown as a number
 */
public record Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights,
        Optional<BigDecimal> fatProxyPct) {

    public Snapshot {
        Objects.requireNonNull(today, "today");
        Objects.requireNonNull(sex, "sex");
        Objects.requireNonNull(phase, "phase");
        Objects.requireNonNull(planStart, "planStart");
        Objects.requireNonNull(weights, "weights");
        Objects.requireNonNull(fatProxyPct, "fatProxyPct");
        if (planStart.isAfter(today)) {
            throw new IllegalArgumentException("planStart " + planStart + " is after today " + today);
        }
        weights.lastDay().filter(last -> last.isAfter(today)).ifPresent(last -> {
            throw new IllegalArgumentException("A weigh-in on " + last + " is after today " + today);
        });
    }

    /** Leaves the body-fat estimate out, so a Snapshot that is ever logged or printed cannot show it (U4). */
    @Override
    public String toString() {
        return "Snapshot[today=" + today + ", sex=" + sex + ", phase=" + phase + ", planStart=" + planStart
                + ", weights=" + weights.weighIns().size() + " weigh-ins, fatProxyPct=" + (fatProxyPct.isPresent() ? "<hidden>" : "none") + "]";
    }

    /** A Snapshot without a body-fat estimate (none measured yet). */
    public Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights) {
        this(today, sex, phase, planStart, weights, Optional.empty());
    }
}
