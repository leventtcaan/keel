package app.keel.training;

import app.keel.engine.RepRange;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Predicate;

/**
 * Which move's target a hold of the load changes, for the call screen (K-1009, ADR-077 Ek 7). The program stores each
 * move's next target; while the deload ladder holds the load, one above the last load (an added load, or a rep past the
 * top of the range that stood in for one) is shown as the last load at the top of the range ({@link NextTargets#shown},
 * K-217). That is the change, read from the program's own rule: no second rule, no new threshold.
 *
 * <p>Of the moves it changes the call is about the one the engine counts as the most stalled, in the engine's own order
 * ({@link TrainingStatuses#byStall}: stalled sessions, then months, then going backwards, then name), so the reason's
 * "Sessions stalled: N" and the move are the same lift. That order ranks the catalog's compound lifts ({@code lifts}); the
 * user's own moves are not in it, and are never the call's (the contract's exerciseId is a catalog id).
 */
final class HeldTargets {

    private HeldTargets() {
    }

    /**
     * @param planned     the program's planned exercises, in program order
     * @param lifts       the compound catalog lifts with their sessions, as the weekly call reads them
     * @param steppedBack whether a planned exercise's target is shown a step lighter today ({@link BackAfterBreak}): the hold changes nothing there
     */
    static Optional<HeldMove> of(List<ProgramStore.PlannedExercise> planned, Map<String, List<TrainingStatuses.Session>> lifts,
            Predicate<ProgramStore.PlannedExercise> steppedBack, LocalDate today) {
        Comparator<Map.Entry<String, List<TrainingStatuses.Session>>> byStall = TrainingStatuses.byStall(today);
        Map.Entry<String, List<TrainingStatuses.Session>> chosenLift = null;
        HeldMove chosen = null;
        for (ProgramStore.PlannedExercise move : planned) {
            List<TrainingStatuses.Session> sessions = lifts.get(move.exerciseId());
            Optional<HeldMove> change = sessions == null || steppedBack.test(move) ? Optional.empty() : change(move);
            if (change.isEmpty()) {
                continue;
            }
            Map.Entry<String, List<TrainingStatuses.Session>> lift = Map.entry(move.exerciseId(), sessions);
            // Strictly: on a full tie (the same move twice in the program) the first stays.
            if (chosenLift == null || byStall.compare(lift, chosenLift) > 0) {
                chosenLift = lift;
                chosen = change.get();
            }
        }
        return Optional.ofNullable(chosen);
    }

    private static Optional<HeldMove> change(ProgramStore.PlannedExercise move) {
        if (move.nextLoadKg() == null || move.lastLoadKg() == null) {
            return Optional.empty();
        }
        NextTargets.Target stored = new NextTargets.Target(move.nextLoadKg(), move.nextReps(), move.nextRackEnds());
        NextTargets.Target shown = NextTargets.shown(stored, move.lastLoadKg(), new RepRange(move.repMin(), move.repMax()), true);
        if (shown.loadKg().compareTo(stored.loadKg()) == 0 && shown.reps() == stored.reps()) {
            return Optional.empty();
        }
        return Optional.of(new HeldMove(move.exerciseId(), new HeldMove.Target(stored.loadKg(), stored.reps()), new HeldMove.Target(shown.loadKg(), shown.reps())));
    }
}
