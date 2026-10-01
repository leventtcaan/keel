package app.keel.training;

import app.keel.engine.BodyRegion;
import app.keel.engine.LiftKind;
import app.keel.engine.LiftSession;
import app.keel.engine.Progression;
import app.keel.engine.ProgressionStep;
import app.keel.engine.RepRange;
import app.keel.engine.SetResult;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

/**
 * The next session's load and reps after a workout (K-217): what the engine's double progression step (K-109, H3 B4)
 * means on the program. An added load starts again from the bottom of the range — unless the deload ladder holds the
 * load (K-110 first rung), then the top of the range is the target. Added reps aim one above the weakest set, within the
 * range. A held session (unclean form, G6 K-31) is repeated, never under the range. An isolation lift has no target
 * (G6 K-33). Load is added only when every planned set was done at the top, as the gym in use can make it (K-414).
 */
final class NextTargets {

    record Target(BigDecimal loadKg, int reps) {
    }

    private NextTargets() {
    }

    /** The target with the engine's load as it is (no gym to round to). */
    static Optional<Target> after(LiftSession session, Progression progression, boolean loadHeld, int plannedSets) {
        return after(session, progression, loadHeld, plannedSets, load -> new LoadSteps.Rounding.Unknown());
    }

    /**
     * The target with an added load as the gym can make it (K-414, ADR-032): the nearest load it has; when it has
     * nothing heavier, one more rep than the weakest set — past the top of the range; when it says nothing, the engine's.
     */
    static Optional<Target> after(LiftSession session, Progression progression, boolean loadHeld, int plannedSets,
            Function<BigDecimal, LoadSteps.Rounding> rounding) {
        RepRange range = session.range();
        int weakest = session.sets().stream().mapToInt(SetResult::reps).min().orElseThrow();
        return switch (progression.step()) {
            // Every planned set at the top, not just the ones done at the day's top load (K-217 review): fewer means the
            // load is repeated at the top of the range.
            case ProgressionStep.AddLoad(BigDecimal newLoadKg, int targetReps) ->
                    Optional.of(loadHeld || session.sets().size() < plannedSets ? new Target(session.loadKg(), range.max())
                            : switch (rounding.apply(newLoadKg)) {
                                case LoadSteps.Rounding.To(BigDecimal kg) -> new Target(kg, targetReps);
                                case LoadSteps.Rounding.NoHeavier() -> new Target(session.loadKg(), weakest + 1);
                                case LoadSteps.Rounding.Unknown() -> new Target(newLoadKg, targetReps);
                            });
            case ProgressionStep.AddReps() -> Optional.of(new Target(session.loadKg(), Math.min(weakest + 1, range.max())));
            case ProgressionStep.Hold() -> Optional.of(new Target(session.loadKg(), Math.max(weakest, range.min())));
            case ProgressionStep.NotTracked() -> Optional.empty();
        };
    }

    /**
     * The session the step is read from: the work sets at the day's top load (a back-off set is not the load being
     * progressed). A set logged without RIR reads as the planned RIR. None without a load above 0 kg.
     */
    static Optional<LiftSession> session(LiftKind kind, BodyRegion region, RepRange range, List<TrainingLog.WorkSet> sets, int plannedRir,
            boolean techniqueClean) {
        Optional<BigDecimal> top = sets.stream().map(TrainingLog.WorkSet::loadKg).max(Comparator.naturalOrder()).filter(kg -> kg.signum() > 0);
        return top.map(load -> new LiftSession(kind, region, range, load, sets.stream().filter(set -> set.loadKg().compareTo(load) == 0)
                .map(set -> new SetResult(set.reps(), set.rir() != null ? set.rir() : plannedRir)).toList(), techniqueClean));
    }

    /**
     * The target as shown today: a load added while the deload ladder now holds the load is the last load at the top of
     * the range — the hold may have begun after the target was set (K-217 review).
     */
    static Target shown(Target stored, BigDecimal lastLoadKg, RepRange range, boolean holdInForce) {
        return holdInForce && stored.loadKg().compareTo(lastLoadKg) > 0 ? new Target(lastLoadKg, range.max()) : stored;
    }

    /** A one-sided move's target: the side that did less decides (each side is its own set, SetRules). */
    static Optional<Target> weaker(List<Target> sides) {
        return sides.stream().min(Comparator.comparing(Target::loadKg).thenComparingInt(Target::reps));
    }
}
