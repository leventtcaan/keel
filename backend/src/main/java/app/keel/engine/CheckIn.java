package app.keel.engine;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.Optional;

/**
 * What the weekly spine asks besides the scale (Güray's tree, 03 §2.4): how it looks, how training and recovery go,
 * where the waist went, and how much of the plan was done. Each signal may be unknown: the spine then asks instead of
 * guessing (U3), and only when its branch needs that signal. Producers are later tasks (photo/waist K-601/K-206, set
 * log K-210, sleep and check-in questions K-404/K-213).
 *
 * @param adherence share of the plan done over the decision window (K-111's ratio, ADR-020 L-6), 0 to 1
 */
public record CheckIn(Look look, Training training, Recovery recovery, Waist waist, Optional<BigDecimal> adherence) {

    /** Nothing answered yet. */
    public static final CheckIn NONE =
            new CheckIn(Look.UNKNOWN, Training.UNKNOWN, Recovery.UNKNOWN, Waist.UNKNOWN, Optional.empty());

    public CheckIn {
        Objects.requireNonNull(look, "look");
        Objects.requireNonNull(training, "training");
        Objects.requireNonNull(recovery, "recovery");
        Objects.requireNonNull(waist, "waist");
        Objects.requireNonNull(adherence, "adherence");
        adherence.filter(ratio -> ratio.signum() < 0 || ratio.compareTo(BigDecimal.ONE) > 0).ifPresent(ratio -> {
            throw new IllegalArgumentException("adherence is a share of the plan, 0 to 1, was " + ratio);
        });
    }

    /** Compared with the last photo check: better, the same, worse. */
    public enum Look { BETTER, SAME, WORSE, UNKNOWN }

    /** Loads and reps over recent weeks (G2 decision table: "weights going backwards" is declining). */
    public enum Training { IMPROVING, STABLE, DECLINING, UNKNOWN }

    /** Sleep, energy, soreness (G2 K-87 signs). */
    public enum Recovery { GOOD, POOR, UNKNOWN }

    /** Waist over the window, beyond its measurement error. */
    public enum Waist { DOWN, FLAT, UP, UNKNOWN }

    public CheckIn withLook(Look value) {
        return new CheckIn(value, training, recovery, waist, adherence);
    }

    public CheckIn withTraining(Training value) {
        return new CheckIn(look, value, recovery, waist, adherence);
    }

    public CheckIn withRecovery(Recovery value) {
        return new CheckIn(look, training, value, waist, adherence);
    }

    public CheckIn withWaist(Waist value) {
        return new CheckIn(look, training, recovery, value, adherence);
    }

    public CheckIn withAdherence(BigDecimal ratio) {
        return new CheckIn(look, training, recovery, waist, Optional.of(ratio));
    }
}
