package app.keel.training;

import app.keel.engine.BodyRegion;
import app.keel.engine.LiftKind;
import app.keel.engine.LiftSession;
import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.Progression;
import app.keel.engine.RepRange;
import app.keel.engine.SetResult;
import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

/**
 * The in-session table (K-960, ADR-075 #3): what the server works out before the gym, so the phone — offline — only picks
 * one of its values and runs no rule. "Too heavy?" (G1 decision #61: drop the load) and the first-session calibration
 * (G6 K-40: a set with more than 2 reps left is no work set; G1 K-5 aims at 0-1) move one load step — the region's (H3 B4)
 * — from the load the session starts at, as the gym in use makes it (ADR-032) and never further than that step. The
 * next load once every set reaches the top of the range is the double progression's (K-109), on the same gym.
 */
final class SessionTable {

    private SessionTable() {
    }

    /** The region's smallest load step (H3 B4: load_increment_upper_kg / load_increment_lower_kg). */
    static BigDecimal stepKg(BodyRegion region, Parameters parameters) {
        return BigDecimal.valueOf(parameters.number(region == BodyRegion.UPPER ? ParameterKey.LOAD_INCREMENT_UPPER_KG
                : ParameterKey.LOAD_INCREMENT_LOWER_KG));
    }

    /**
     * The first-session calibration's step (ADR-075 Ek 1): the region's, only on a move with no target. The phone adds it
     * to the load just logged after a set with calibration_rir_min reps left or more and rounds it to the gym (the shared
     * load steps, as warm-ups) — no load to start from is known here before the user types one.
     */
    static Optional<BigDecimal> calibrationStep(Optional<NextTargets.Target> target, BodyRegion region, Parameters parameters) {
        return target.isPresent() ? Optional.empty() : Optional.of(Decimals.plain(stepKg(region, parameters)));
    }

    /** One step over {@code fromKg}: the heaviest load the gym makes at most a step over it; the step itself where it says nothing. */
    static Optional<BigDecimal> heavier(ExerciseCatalog.Equipment equipment, String exerciseId, Optional<GymStore.Gym> gym, BigDecimal fromKg,
            BigDecimal stepKg) {
        return step(equipment, exerciseId, gym, fromKg, fromKg.add(stepKg));
    }

    /** One step under {@code fromKg}: the lightest load the gym makes at most a step under it, and above nothing. */
    static Optional<BigDecimal> lighter(ExerciseCatalog.Equipment equipment, String exerciseId, Optional<GymStore.Gym> gym, BigDecimal fromKg,
            BigDecimal stepKg) {
        return step(equipment, exerciseId, gym, fromKg, fromKg.subtract(stepKg));
    }

    private static Optional<BigDecimal> step(ExerciseCatalog.Equipment equipment, String exerciseId, Optional<GymStore.Gym> gym, BigDecimal fromKg,
            BigDecimal toKg) {
        Optional<GymStore.Gym> knowing = gym.filter(inUse -> LoadSteps.knows(equipment, exerciseId, inUse));
        Optional<BigDecimal> load = knowing.isPresent() ? LoadSteps.within(equipment, exerciseId, knowing.get(), fromKg, toKg)
                : Optional.of(Decimals.plain(toKg));
        return load.filter(kg -> kg.signum() > 0);
    }

    /**
     * The load the next session gets once every one of this week's sets reaches the top of the range at the planned RIR:
     * the double progression's step (K-109) through the same path as a finished session (NextTargets, the gym's
     * {@code rounding}). Empty when it adds no load: a lift not load-tracked (G6 K-33), the load held (K-110), a rack
     * with nothing heavier in reach (K-414, K-430), or no load to add to.
     */
    static Optional<BigDecimal> nextAtTop(LiftKind kind, BodyRegion region, RepRange range, NextTargets.Target target, int sets, int targetRir,
            boolean held, Function<BigDecimal, LoadSteps.Rounding> rounding, Parameters parameters) {
        BigDecimal from = target.loadKg();
        if (from.signum() <= 0 || sets < 1) {
            return Optional.empty();
        }
        LiftSession atTop = new LiftSession(kind, region, range, from, Collections.nCopies(sets, new SetResult(range.max(), targetRir)), true);
        return NextTargets.after(atTop, Progression.next(atTop, parameters), held, sets, targetRir, rounding, parameters)
                .map(NextTargets.Target::loadKg).filter(kg -> kg.compareTo(from) > 0);
    }

    /** The best set of a session: the heaviest, then the most reps, then the fewest left (a set without RIR last). */
    static Optional<TrainingLog.WorkSet> best(List<TrainingLog.WorkSet> sets) {
        return sets.stream().max(Comparator.comparing(TrainingLog.WorkSet::loadKg).thenComparingInt(TrainingLog.WorkSet::reps)
                .thenComparing(TrainingLog.WorkSet::rir, Comparator.nullsFirst(Comparator.<Integer>reverseOrder())));
    }
}
