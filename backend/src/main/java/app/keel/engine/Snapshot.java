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
 * @param planStart the day the current calorie target took effect — any change, a safety increase included; a plan is
 *     judged only after its decision window
 * @param weights every weigh-in up to today, imported history included (ADR-018)
 * @param fatProxyPct the internal body-fat estimate from the visual/waist proxy, if there is one — the lower when the
 *     look and the waist disagree, which the cut gate and the safety net read (K-224). U4: an input only; no Decision
 *     carries it, and it is never shown as a number
 * @param energy the plan's calories and exercise burn, when both are known (energy availability, K-104)
 * @param menstrualLossReported the answer to the one-tap question shown when energy availability is low (J1 C6,
 *     ADR-020 L-1). Health data (GDPR Art. 9) that ADR-020 says is not kept: whoever stores a Snapshot (the decision
 *     module, K-212) must leave this field out. toString hides it for logs
 * @param checkIn this week's answers besides the scale, for the weekly spine (K-106)
 * @param profile age and height, when known (macros K-108, resting energy K-114)
 * @param observingMaintenance the current target is the starting estimate, held while maintenance is observed (K-114)
 * @param phaseStart the day the current phase (cut or bulk) began; a plan lies inside its phase (mini cut, G7 K-102)
 * @param training where the most-stalled lift stands, from the set log, if known (deload ladder, K-110)
 * @param fatProxyHighPct the higher of the two fat estimates, which the bulk gates read (K-224 review); the same as
 *     fatProxyPct when there is one estimate, present exactly when it is. U4 as fatProxyPct
 * @param safetyHold a hard stop was applied and no deficit has been opened since (K-229): a call that would open one
 *     waits for the cycle question (ADR-028 #23)
 * @param cycleResolved this week's answer to that question is "not stopped". Health data like menstrualLossReported:
 *     never kept, hidden from toString
 * @param miniCutUntil the day the mini cut the plan is on ends (K-227, G7 K-102); empty on any other plan
 * @param fatProxyEnergyPct the end of the fat estimate the low-energy rule reads (K-230, ADR-028 #22): the waist's
 *     estimate at the cautious end of its band, or the look, whichever is lower — never above fatProxyPct, present exactly
 *     when it is; fatProxyPct itself unless given. U4 as fatProxyPct
 * @param context a state the user declared on a day of this check-in week (K-516, ADR-038). Health data like the cycle
 *     answer: hidden from toString
 */
public record Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights,
        Optional<BigDecimal> fatProxyPct, Optional<EnergyBudget> energy, boolean menstrualLossReported, CheckIn checkIn,
        Optional<Profile> profile, boolean observingMaintenance,
        LocalDate phaseStart, Optional<TrainingStatus> training, Optional<BigDecimal> fatProxyHighPct, boolean safetyHold,
        boolean cycleResolved, Optional<LocalDate> miniCutUntil, Optional<BigDecimal> fatProxyEnergyPct, Optional<DeclaredContext> context) {

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
        Objects.requireNonNull(phaseStart, "phaseStart");
        Objects.requireNonNull(training, "training");
        Objects.requireNonNull(fatProxyHighPct, "fatProxyHighPct");
        Objects.requireNonNull(miniCutUntil, "miniCutUntil");
        Objects.requireNonNull(fatProxyEnergyPct, "fatProxyEnergyPct");
        Objects.requireNonNull(context, "context");
        if (fatProxyPct.isPresent() != fatProxyHighPct.isPresent()) {
            throw new IllegalArgumentException("A fat estimate has a lower and a higher value, or neither");
        }
        if (fatProxyPct.isPresent() && fatProxyHighPct.get().compareTo(fatProxyPct.get()) < 0) {
            throw new IllegalArgumentException("The higher fat estimate is under the lower");
        }
        if (fatProxyPct.isPresent() != fatProxyEnergyPct.isPresent()) {
            throw new IllegalArgumentException("A fat estimate has its low-energy end, or neither");
        }
        if (fatProxyPct.isPresent() && fatProxyEnergyPct.get().compareTo(fatProxyPct.get()) > 0) {
            throw new IllegalArgumentException("The low-energy end of the fat estimate is above the lower");
        }
        if (phaseStart.isAfter(planStart)) {
            throw new IllegalArgumentException("phaseStart " + phaseStart + " is after planStart " + planStart + ": a plan lies inside its phase");
        }
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
                + ", energy=" + energy.map(Object::toString).orElse("none") + ", menstrualLossReported=<hidden>, safetyHold=" + safetyHold
                + ", cycleResolved=<hidden>, miniCutUntil=" + miniCutUntil.map(Object::toString).orElse("none") + ", checkIn=" + checkIn
                + ", context=" + (context.isPresent() ? "<hidden>" : "none") + "]";
    }

    /** Every input but a declared state (none). */
    public Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights, Optional<BigDecimal> fatProxyPct,
            Optional<EnergyBudget> energy, boolean menstrualLossReported, CheckIn checkIn, Optional<Profile> profile, boolean observingMaintenance,
            LocalDate phaseStart, Optional<TrainingStatus> training, Optional<BigDecimal> fatProxyHighPct, boolean safetyHold, boolean cycleResolved,
            Optional<LocalDate> miniCutUntil, Optional<BigDecimal> fatProxyEnergyPct) {
        this(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, profile, observingMaintenance, phaseStart,
                training, fatProxyHighPct, safetyHold, cycleResolved, miniCutUntil, fatProxyEnergyPct, Optional.empty());
    }

    /** A Snapshot without a body-fat estimate (none measured yet). */
    public Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights) {
        this(today, sex, phase, planStart, weights, Optional.empty());
    }

    /** A Snapshot with the basics and, possibly, a body-fat estimate; the other inputs are added with the withers. */
    public Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights,
            Optional<BigDecimal> fatProxyPct) {
        this(today, sex, phase, planStart, weights, fatProxyPct, Optional.empty(), false, CheckIn.NONE, Optional.empty(), false, planStart, Optional.empty());
    }

    /** Every input but the low-energy end of the fat estimate: the lower, as before K-230. */
    public Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights, Optional<BigDecimal> fatProxyPct,
            Optional<EnergyBudget> energy, boolean menstrualLossReported, CheckIn checkIn, Optional<Profile> profile, boolean observingMaintenance,
            LocalDate phaseStart, Optional<TrainingStatus> training, Optional<BigDecimal> fatProxyHighPct, boolean safetyHold, boolean cycleResolved,
            Optional<LocalDate> miniCutUntil) {
        this(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, profile, observingMaintenance, phaseStart,
                training, fatProxyHighPct, safetyHold, cycleResolved, miniCutUntil, fatProxyPct);
    }

    /** Every input but the mini cut's end (not on one). */
    public Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights, Optional<BigDecimal> fatProxyPct,
            Optional<EnergyBudget> energy, boolean menstrualLossReported, CheckIn checkIn, Optional<Profile> profile, boolean observingMaintenance,
            LocalDate phaseStart, Optional<TrainingStatus> training, Optional<BigDecimal> fatProxyHighPct, boolean safetyHold, boolean cycleResolved) {
        this(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, profile, observingMaintenance, phaseStart,
                training, fatProxyHighPct, safetyHold, cycleResolved, Optional.empty());
    }

    /** Every input but the safety hold (none) and its answer. */
    public Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights, Optional<BigDecimal> fatProxyPct,
            Optional<EnergyBudget> energy, boolean menstrualLossReported, CheckIn checkIn, Optional<Profile> profile, boolean observingMaintenance,
            LocalDate phaseStart, Optional<TrainingStatus> training, Optional<BigDecimal> fatProxyHighPct) {
        this(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, profile, observingMaintenance, phaseStart,
                training, fatProxyHighPct, false, false);
    }

    /** Every input but the higher fat estimate: one estimate, so the higher is the same one. */
    public Snapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, WeightSeries weights, Optional<BigDecimal> fatProxyPct,
            Optional<EnergyBudget> energy, boolean menstrualLossReported, CheckIn checkIn, Optional<Profile> profile, boolean observingMaintenance,
            LocalDate phaseStart, Optional<TrainingStatus> training) {
        this(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, profile, observingMaintenance, phaseStart,
                training, fatProxyPct);
    }

    /** The fat estimate (U4: an engine input only, never shown), from the measurement module's estimate (K-224). */
    public Snapshot withFatProxyPct(BigDecimal pct) {
        return withFatProxy(pct, pct);
    }

    /** Two estimates that disagree (K-224 review): each rule reads the one that is cautious for it. */
    public Snapshot withFatProxy(BigDecimal lowerPct, BigDecimal higherPct) {
        return withFatProxy(lowerPct, higherPct, lowerPct);
    }

    /** With the end the low-energy rule reads (K-230): the waist's estimate at the cautious end of its band. */
    public Snapshot withFatProxy(BigDecimal lowerPct, BigDecimal higherPct, BigDecimal energyPct) {
        return new Snapshot(today, sex, phase, planStart, weights, Optional.of(lowerPct), energy, menstrualLossReported, checkIn, profile,
                observingMaintenance, phaseStart, training, Optional.of(higherPct), safetyHold, cycleResolved, miniCutUntil, Optional.of(energyPct), context);
    }

    public Snapshot withEnergy(EnergyBudget budget) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, Optional.of(budget), menstrualLossReported, checkIn, profile, observingMaintenance, phaseStart, training, fatProxyHighPct, safetyHold, cycleResolved, miniCutUntil, fatProxyEnergyPct, context);
    }

    public Snapshot withMenstrualLossReported(boolean reported) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, reported, checkIn, profile, observingMaintenance, phaseStart, training, fatProxyHighPct, safetyHold, cycleResolved, miniCutUntil, fatProxyEnergyPct, context);
    }

    public Snapshot withCheckIn(CheckIn answers) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, answers, profile, observingMaintenance, phaseStart, training, fatProxyHighPct, safetyHold, cycleResolved, miniCutUntil, fatProxyEnergyPct, context);
    }

    public Snapshot withProfile(Profile facts) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, Optional.of(facts), observingMaintenance, phaseStart, training, fatProxyHighPct, safetyHold, cycleResolved, miniCutUntil, fatProxyEnergyPct, context);
    }

    public Snapshot withObservingMaintenance(boolean observing) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, profile, observing, phaseStart, training, fatProxyHighPct, safetyHold, cycleResolved, miniCutUntil, fatProxyEnergyPct, context);
    }

    public Snapshot withPhaseStart(LocalDate day) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, profile,
                observingMaintenance, day, training, fatProxyHighPct, safetyHold, cycleResolved, miniCutUntil, fatProxyEnergyPct, context);
    }

    public Snapshot withTraining(TrainingStatus status) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, profile,
                observingMaintenance, phaseStart, Optional.of(status), fatProxyHighPct, safetyHold, cycleResolved, miniCutUntil, fatProxyEnergyPct, context);
    }

    /** After a hard stop, until a deficit is opened again (K-229). */
    public Snapshot withSafetyHold(boolean held) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, profile,
                observingMaintenance, phaseStart, training, fatProxyHighPct, held, cycleResolved, miniCutUntil, fatProxyEnergyPct, context);
    }

    /** This week's answer to the cycle question is "not stopped" (K-229; never kept). */
    public Snapshot withCycleResolved(boolean resolved) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, profile,
                observingMaintenance, phaseStart, training, fatProxyHighPct, safetyHold, resolved, miniCutUntil, fatProxyEnergyPct, context);
    }

    /** On a mini cut that ends on this day (K-227). */
    public Snapshot withMiniCutUntil(LocalDate day) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, profile,
                observingMaintenance, phaseStart, training, fatProxyHighPct, safetyHold, cycleResolved, Optional.of(day), fatProxyEnergyPct, context);
    }

    /** A state the user declared on a day of this check-in week (K-516). */
    public Snapshot withContext(DeclaredContext declared) {
        return new Snapshot(today, sex, phase, planStart, weights, fatProxyPct, energy, menstrualLossReported, checkIn, profile,
                observingMaintenance, phaseStart, training, fatProxyHighPct, safetyHold, cycleResolved, miniCutUntil, fatProxyEnergyPct,
                Optional.of(declared));
    }
}
