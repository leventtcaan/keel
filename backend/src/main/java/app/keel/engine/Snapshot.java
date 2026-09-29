package app.keel.engine;

import java.time.LocalDate;
import java.util.Objects;

/**
 * The engine's only input (ADR-003 §1). "Today" is part of it, so the engine never reads a clock and the same
 * Snapshot always gives the same Decision. Later tasks add the time series (weigh-ins K-103, training K-109, …).
 *
 * @param phase the phase the user is currently in; the phase gate (K-105) may decide to change it
 */
public record Snapshot(LocalDate today, Sex sex, Phase phase) {

    public Snapshot {
        Objects.requireNonNull(today, "today");
        Objects.requireNonNull(sex, "sex");
        Objects.requireNonNull(phase, "phase");
    }
}
