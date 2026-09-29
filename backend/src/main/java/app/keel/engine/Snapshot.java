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
 * @param energy the plan's calories and exercise burn, when both are known (energy availability, K-104)
 * @param menstrualLossReported the answer to the one-tap question shown when energy availability is low (J1 C6,
 *     ADR-020 L-1). Health data (GDPR Art. 9) that ADR-020 says is not kept: whoever stores a Snapshot (the decision
 *     module, K-212) must leave this field out. toString hides it for logs
 * @param checkIn this week's answers besides the scale, for the weekly spine (K-106)
 * @param profile age and height, when known (macros K-108, resting energy K-114)
 */
public record Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights,
        Optional<BigDecimal> fatProxyPct, Optional<EnergyBudget> energy, boolean menstrualLossReported, CheckIn checkIn,
        Optional<Profile> profile) {

    public Snapshot {
        Objects.requireNonNull(today, "today");
        Objects.requireNonNull(sex, "sex");
        Objects.requireNonNull(phase, "phase");
        Objects.requireNonNull(planStart, "planStart");
        Objects.requireNonNull(weights, "weights");
        Objects.requireNonNull(fatProxyPct, "fatProxyPct");
        Objects.requireNonNull(energy, "energy");
        Objects.requireNonNull(checkIn, "checkIn");
        Objects.requireNonNull(profile, "profile");
        if (planStart.isAfter(today)) {
            throw new IllegalArgumentException("planStart " + planStart + " is after today " + today);
        }
        weights.lastDay().filter(last -> last.isAfter(today)).ifPresent(last -> {
            throw new IllegalArgumentException("A weigh-in on " + last + " is after today " + today);
        });
    }

    /**
     * Leaves the body-fat estimate and the cycle answer out, so a Snapshot that is ever logged or printed cannot show
     * them (U4, GDPR Art. 9).
     */
    @Override
    public String toString() {
        return "Snapshot[today=" + today + ", sex=" + sex + ", phase=" + phase + ", planStart=" + planStart
                + ", weights=" + weights.weighIns().size() + " weigh-ins, fatProxyPct=" + (fatProxyPct.isPresent() ? "<hidden>" : "none")
                + ", energy=" + energy.map(Object::toString).orElse("none") + ", menstrualLossReported=<hidden>, checkIn=" + checkIn + "]";
    }

    /** A Snapshot without a body-fat estimate (none measured yet). */
    public Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights) {
        this(today, sex, phase, planStart, weights, Optional.empty());
    }

    /** A Snapshot with the basics and, possibly, a body-fat estimate; the other inputs are added with the withers. */
    public Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights,
            Optional<BigDecimal> fatProxyPct) {
        this(today, sex, phase, planStart, weights, fatProxyPct, Optional.empty(), false, CheckIn.NONE, Optional.empty());
    }

    public Snapshot withEnergy(EnergyBudget budget) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, Optional.of(budget), menstrualLossReported, checkIn, profile);
    }

    public Snapshot withMenstrualLossReported(boolean reported) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, reported, checkIn, profile);
    }

    public Snapshot withCheckIn(CheckIn answers) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, answers, profile);
    }

    public Snapshot withProfile(Profile facts) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, Optional.of(facts));
    }
}
