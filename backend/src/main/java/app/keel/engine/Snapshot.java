package app.keel.engine;

import java.time.LocalDate;
import java.util.Objects;

/**
 * The engine's only input (ADR-003 §1). "Today" is part of it, so the engine never reads a clock and the same
 * Snapshot always gives the same Decision. Later tasks add the time series (weigh-ins K-103, training K-109, …).
 *
 * @param phase the phase the user is currently in; the phase gate (K-105) may decide to change it
 * @param planStart the day the current calorie target took effect; a plan is judged only after its decision window
 * @param weights every weigh-in up to today, imported history included (ADR-018)
 */
public record Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights) {

    public Snapshot {
        Objects.requireNonNull(today, "today");
        Objects.requireNonNull(sex, "sex");
        Objects.requireNonNull(phase, "phase");
        Objects.requireNonNull(planStart, "planStart");
        Objects.requireNonNull(weights, "weights");
        if (planStart.isAfter(today)) {
            throw new IllegalArgumentException("planStart " + planStart + " is after today " + today);
        }
        weights.lastDay().filter(last -> last.isAfter(today)).ifPresent(last -> {
            throw new IllegalArgumentException("A weigh-in on " + last + " is after today " + today);
        });
    }
}
