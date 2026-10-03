package app.keel.decision;

import app.keel.engine.CheckIn;
import app.keel.engine.Consistency;
import app.keel.engine.DeclaredContext;
import app.keel.engine.EnergyBudget;
import app.keel.engine.Phase;
import app.keel.engine.Profile;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.TrainingStatus;
import app.keel.engine.WeighIn;
import app.keel.engine.WeightSeries;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * A Snapshot as it is kept with its call (K-212, ADR-003 §6): every input the engine read, so the call can be made again
 * and must come out the same — except the cycle answer, which ADR-020 L-1 does not keep (GDPR Art. 9); it comes back as
 * not reported, and the "resolved" answer after a hard stop likewise (K-229). Plain records, so the stored JSON is the
 * engine's input and nothing else. {@code fatProxyHighPct} null: a call kept before there were two estimates (K-224
 * review), made on its one. {@code safetyHold} null: a call kept before K-229, made without a hold. {@code miniCutUntil}
 * null: not on a mini cut, or a call kept before K-227. {@code fatProxyEnergyPct} null: no estimate, or a call kept before
 * K-230, made with the lower for the low-energy rule too. {@code context} null: no state declared that week, or a call kept
 * before K-516 (health data in the call's own record, deleted with it).
 */
record StoredSnapshot(LocalDate today, Sex sex, Phase phase, LocalDate planStart, List<Weight> weights, BigDecimal fatProxyPct,
        Energy energy, Answered checkIn, Body profile, boolean observingMaintenance, LocalDate phaseStart, Training training,
        BigDecimal fatProxyHighPct, Boolean safetyHold, LocalDate miniCutUntil, BigDecimal fatProxyEnergyPct,
        @JsonInclude(JsonInclude.Include.NON_NULL) DeclaredContext context) {

    record Weight(LocalDate date, BigDecimal kg) {
    }

    /** {@code exerciseKcalPerDay} null: not known when the call was made. */
    record Energy(int targetKcal, Integer exerciseKcalPerDay) {
    }

    /**
     * {@code adherenceDone} of {@code adherencePlanned}: what {@code adherence} was made of (K-526) — kept by calls made
     * since; null for an older call, never made up from the ratio.
     */
    record Answered(CheckIn.Look look, CheckIn.Training training, CheckIn.Recovery recovery, CheckIn.Waist waist, BigDecimal adherence,
            CheckIn.Appetite appetite, @JsonInclude(JsonInclude.Include.NON_NULL) Integer adherenceDone,
            @JsonInclude(JsonInclude.Include.NON_NULL) Integer adherencePlanned) {

        Answered(CheckIn.Look look, CheckIn.Training training, CheckIn.Recovery recovery, CheckIn.Waist waist, BigDecimal adherence,
                CheckIn.Appetite appetite) {
            this(look, training, recovery, waist, adherence, appetite, null, null);
        }
    }

    record Body(int ageYears, int heightCm) {
    }

    record Training(int stalledSessions, int weeksLoadHeld, int monthsStalled, boolean restedLastWeek, boolean loadsBelowLastWeek,
            int weeksPlanMissed) {
    }

    static StoredSnapshot of(Snapshot snapshot) {
        return of(snapshot, Optional.empty());
    }

    /** With the counts the adherence was made of (K-526): only the ones that make the very ratio the engine read (U1). */
    static StoredSnapshot of(Snapshot snapshot, Optional<Consistency.WindowCount> adherenceCount) {
        CheckIn in = snapshot.checkIn();
        adherenceCount.ifPresent(count -> {
            if (in.adherence().map(ratio -> ratio.compareTo(count.ratio()) != 0).orElse(true)) {
                throw new IllegalArgumentException("the count " + count + " is not the adherence the call read, " + in.adherence());
            }
        });
        return new StoredSnapshot(snapshot.today(), snapshot.sex(), snapshot.phase(), snapshot.planStart(),
                snapshot.weights().weighIns().stream().map(weighIn -> new Weight(weighIn.date(), weighIn.kg())).toList(),
                snapshot.fatProxyPct().orElse(null),
                snapshot.energy().map(energy -> new Energy(energy.targetKcal(), energy.exerciseKcalPerDay().isPresent()
                        ? energy.exerciseKcalPerDay().getAsInt() : null)).orElse(null),
                new Answered(in.look(), in.training(), in.recovery(), in.waist(), in.adherence().orElse(null), in.appetite(),
                        adherenceCount.map(Consistency.WindowCount::done).orElse(null), adherenceCount.map(Consistency.WindowCount::planned).orElse(null)),
                snapshot.profile().map(profile -> new Body(profile.ageYears(), profile.heightCm())).orElse(null),
                snapshot.observingMaintenance(), snapshot.phaseStart(),
                snapshot.training().map(training -> new Training(training.stalledSessions(), training.weeksLoadHeld(), training.monthsStalled(),
                        training.restedLastWeek(), training.loadsBelowLastWeek(), training.weeksPlanMissed())).orElse(null),
                snapshot.fatProxyHighPct().orElse(null), snapshot.safetyHold(), snapshot.miniCutUntil().orElse(null),
                snapshot.fatProxyEnergyPct().orElse(null), snapshot.context().orElse(null));
    }

    /** The Snapshot again; the cycle answer as not reported (never kept). */
    Snapshot toSnapshot() {
        return new Snapshot(today, sex, phase, planStart,
                new WeightSeries(weights.stream().map(weight -> new WeighIn(weight.date(), weight.kg())).toList()),
                Optional.ofNullable(fatProxyPct), Optional.ofNullable(energy).map(e -> e.exerciseKcalPerDay() == null ? EnergyBudget.exerciseUnknown(e.targetKcal())
                        : new EnergyBudget(e.targetKcal(), e.exerciseKcalPerDay())),
                false,
                new CheckIn(checkIn.look(), checkIn.training(), checkIn.recovery(), checkIn.waist(), Optional.ofNullable(checkIn.adherence()),
                        checkIn.appetite()),
                Optional.ofNullable(profile).map(body -> new Profile(body.ageYears(), body.heightCm())), observingMaintenance, phaseStart,
                Optional.ofNullable(training).map(t -> new TrainingStatus(t.stalledSessions(), t.weeksLoadHeld(), t.monthsStalled(),
                        t.restedLastWeek(), t.loadsBelowLastWeek(), t.weeksPlanMissed())),
                // A call kept before there were two estimates read its one for every rule.
                Optional.ofNullable(fatProxyHighPct).or(() -> Optional.ofNullable(fatProxyPct)),
                // Kept since K-229; a call kept before it was made without a hold. The answer that ends one is never kept.
                Boolean.TRUE.equals(safetyHold), false, Optional.ofNullable(miniCutUntil),
                // Kept since K-230; a call kept before it read the lower for the low-energy rule too.
                Optional.ofNullable(fatProxyEnergyPct).or(() -> Optional.ofNullable(fatProxyPct)), Optional.ofNullable(context));
    }
}
