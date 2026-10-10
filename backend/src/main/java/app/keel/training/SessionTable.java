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
 * one of its values or rounds to the gym. From the load the session starts at (the target, else the last session's best
 * set), one load step — the region's (H3 B4) — as the gym in use makes it (ADR-032): heavier never past the step,
 * lighter ("Too heavy?", G1 decision #61) a step down or, where the gym has none inside it, its next load down. The
 * first-session calibration (ADR-075 Ek 1; G6 K-40: a set with more than 2 reps left is no work set; G1 K-5 aims at 0-1)
 * moves from the load just logged, which the server cannot know: it sends the step, the phone adds it and rounds with the
 * shared load steps, never past the step. The next load once every set reaches the top of the range is the double
 * progression's (K-109), on the same gym.
 */
final class SessionTable {

    private SessionTable() {
    }

    /** A move's in-session options (K-960); null where there is none. */
    record Table(BigDecimal lighterKg, BigDecimal heavierKg, BigDecimal calibrationStepKg, BigDecimal nextAtTopKg) {

        static final Table NONE = new Table(null, null, null, null);
    }

    /**
     * The in-session table of a planned move (K-960, ADR-075 #3), worked out here so the phone only picks in the gym:
     * a step either way from the load the session starts at — the target shown, else the last session's best set — as the
     * gym in use makes it, the calibration step where there is no target (ADR-075 Ek 1), and the load once every set is
     * at the top (only from a target). None on a bodyweight move. The one place the table is worked out: the program's
     * moves, a move swapped in for today (WeekSession.swaps) and each swap option's table (K-1011, ADR-073 Ek 8) all come
     * through it.
     */
    static Table table(ExerciseCatalog catalog, ProgramStore.PlannedExercise planned, Optional<NextTargets.Target> next,
            Optional<TrainingLog.WorkSet> best, boolean held, int thisWeeksSets, Parameters p, Optional<GymStore.Gym> gym) {
        return catalog.find(planned.exerciseId()).filter(exercise -> exercise.load() != ExerciseCatalog.Load.BODYWEIGHT).map(exercise -> {
            LiftKind kind = LiftKind.valueOf(exercise.kind().name());
            BodyRegion region = BodyRegion.valueOf(catalog.region(exercise.muscles().getFirst()).name());
            BigDecimal step = stepKg(region, p);
            Optional<BigDecimal> from = next.map(NextTargets.Target::loadKg).or(() -> best.map(TrainingLog.WorkSet::loadKg)).filter(kg -> kg.signum() > 0);
            // A jump limit only where the set's load is all the load moved (K-430), as a finished session's target has.
            BigDecimal maxJump = LoadSteps.wholeLoad(exercise.equipment()) ? BigDecimal.valueOf(p.number(ParameterKey.LOAD_JUMP_MAX_STEPS)) : null;
            Optional<BigDecimal> atTop = next.flatMap(target -> nextAtTop(kind, region, new RepRange(planned.repMin(), planned.repMax()),
                    target, thisWeeksSets, planned.targetRir(), held, load -> gym
                            .map(inUse -> LoadSteps.round(exercise.equipment(), exercise.id(), inUse, target.loadKg(), load, maxJump))
                            .orElse(new LoadSteps.Rounding.Unknown()), p));
            return new Table(from.flatMap(kg -> lighter(exercise.equipment(), exercise.id(), gym, kg, step)).orElse(null),
                    from.flatMap(kg -> heavier(exercise.equipment(), exercise.id(), gym, kg, step)).orElse(null),
                    calibrationStep(next, region, p).orElse(null), atTop.orElse(null));
        }).orElse(Table.NONE);
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

    /**
     * "Too heavy?" (ADR-075 #3; G1 decision #61): the lightest load the gym makes at most a step under {@code fromKg} — a
     * full step where it can — and where it makes none inside the step, its next load down. A lighter load cannot hurt, so
     * there is one wherever the gym goes lower (the K-960 review); none at the bottom of the rack or the bar, or at nothing.
     */
    static Optional<BigDecimal> lighter(ExerciseCatalog.Equipment equipment, String exerciseId, Optional<GymStore.Gym> gym, BigDecimal fromKg,
            BigDecimal stepKg) {
        BigDecimal stepped = fromKg.subtract(stepKg);
        return step(equipment, exerciseId, gym, fromKg, stepped)
                .or(() -> gym.filter(inUse -> LoadSteps.knows(equipment, exerciseId, inUse))
                        // Nothing in [from − step, from): the heaviest under from is under the step too.
                        .flatMap(inUse -> LoadSteps.lighter(equipment, exerciseId, inUse, fromKg, stepped)).filter(kg -> kg.signum() > 0));
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

    /**
     * The best set of a session: the heaviest, then the most reps, then the fewest left (a set without RIR last). A set of
     * no reps is no set done (the contract's reps ≥ 1): it never wins on its load.
     */
    static Optional<TrainingLog.WorkSet> best(List<TrainingLog.WorkSet> sets) {
        return sets.stream().filter(set -> set.reps() >= 1).max(Comparator.comparing(TrainingLog.WorkSet::loadKg).thenComparingInt(TrainingLog.WorkSet::reps)
                .thenComparing(TrainingLog.WorkSet::rir, Comparator.nullsFirst(Comparator.<Integer>reverseOrder())));
    }
}
