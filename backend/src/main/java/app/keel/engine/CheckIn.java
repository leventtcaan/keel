package app.keel.engine;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.Optional;

/**
 * What the weekly spine asks besides the scale (the coaching tree, 03 §2.4): how it looks, how training and recovery go,
 * where the waist went, and how much of the plan was done. Each signal may be unknown: the spine then asks instead of
 * guessing (U3), and only when its branch needs that signal. Producers are later tasks (photo/waist K-601/K-206, set
 * log K-210, sleep and check-in questions K-404/K-213).
 *
 * @param adherence share of the plan done over the decision window (K-111's ratio, ADR-020 L-6), 0 to 1
 * @param appetite whether eating the plan still works or has become forcing food (mini cut, G7 K-102)
 * @param week1Feel how the first week felt (ADR-077 #4): read only by the first week's call, asked only when it can change it
 */
public record CheckIn(Look look, Training training, Recovery recovery, Waist waist, Optional<BigDecimal> adherence,
        Appetite appetite, Week1Feel week1Feel) {

    /** Nothing answered yet. */
    public static final CheckIn NONE =
            new CheckIn(Look.UNKNOWN, Training.UNKNOWN, Recovery.UNKNOWN, Waist.UNKNOWN, Optional.empty(), Appetite.UNKNOWN, Week1Feel.UNKNOWN);

    public CheckIn {
        Objects.requireNonNull(look, "look");
        Objects.requireNonNull(training, "training");
        Objects.requireNonNull(recovery, "recovery");
        Objects.requireNonNull(waist, "waist");
        Objects.requireNonNull(adherence, "adherence");
        Objects.requireNonNull(appetite, "appetite");
        Objects.requireNonNull(week1Feel, "week1Feel");
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

    /** GONE = the user has to force the food down (G7 K-102: "you can't even eat what you used to"). */
    public enum Appetite { NORMAL, GONE, UNKNOWN }

    /** "How did week 1 feel?" (ADR-077 #4): COULD_DO_MORE is "I could do more". */
    public enum Week1Feel { TOO_MUCH, ABOUT_RIGHT, COULD_DO_MORE, UNKNOWN }

    /** A check-in without the appetite answer. */
    public CheckIn(Look look, Training training, Recovery recovery, Waist waist, Optional<BigDecimal> adherence) {
        this(look, training, recovery, waist, adherence, Appetite.UNKNOWN);
    }

    /** A check-in without the first week's answer: any week but that one. */
    public CheckIn(Look look, Training training, Recovery recovery, Waist waist, Optional<BigDecimal> adherence, Appetite appetite) {
        this(look, training, recovery, waist, adherence, appetite, Week1Feel.UNKNOWN);
    }

    public CheckIn withLook(Look value) {
        return new CheckIn(value, training, recovery, waist, adherence, appetite, week1Feel);
    }

    public CheckIn withTraining(Training value) {
        return new CheckIn(look, value, recovery, waist, adherence, appetite, week1Feel);
    }

    public CheckIn withRecovery(Recovery value) {
        return new CheckIn(look, training, value, waist, adherence, appetite, week1Feel);
    }

    public CheckIn withWaist(Waist value) {
        return new CheckIn(look, training, recovery, value, adherence, appetite, week1Feel);
    }

    public CheckIn withAdherence(BigDecimal ratio) {
        return new CheckIn(look, training, recovery, waist, Optional.of(ratio), appetite, week1Feel);
    }

    public CheckIn withAppetite(Appetite value) {
        return new CheckIn(look, training, recovery, waist, adherence, value, week1Feel);
    }

    public CheckIn withWeek1Feel(Week1Feel value) {
        return new CheckIn(look, training, recovery, waist, adherence, appetite, value);
    }
}
