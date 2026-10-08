package app.keel.training;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

/**
 * The moves a planned move can be swapped for (K-964, ADR-073 #6, Ek 2): the catalog's {@code alternatives} in their
 * order, then the catalog's moves of the same primary muscle and the same kind by id (G6 K-35: a compound move is kept,
 * an isolation move may change — a compound one is not offered an isolation one), each one the gym in use has the
 * equipment for (ADR-032: it makes a load for it; bodyweight needs none; without a gym, any), none already on the day.
 * The user's own move (not in the catalog) has none.
 */
final class SwapOptions {

    private SwapOptions() {
    }

    static List<String> of(String exerciseId, Collection<String> onTheDay, ExerciseCatalog catalog, Optional<GymStore.Gym> gym) {
        return catalog.find(exerciseId).map(move -> {
            String muscle = move.muscles().getFirst();
            Stream<ExerciseCatalog.Exercise> alternatives = move.alternatives().stream().flatMap(id -> catalog.find(id).stream());
            Stream<ExerciseCatalog.Exercise> sameMuscle = catalog.all().stream()
                    .filter(other -> other.kind() == move.kind() && other.muscles().getFirst().equals(muscle))
                    .sorted(Comparator.comparing(ExerciseCatalog.Exercise::id));
            return Stream.concat(alternatives, sameMuscle).filter(other -> !onTheDay.contains(other.id()) && !other.id().equals(exerciseId))
                    .filter(other -> gym.map(inUse -> has(inUse, other)).orElse(true)).map(ExerciseCatalog.Exercise::id).distinct().toList();
        }).orElse(List.of());
    }

    private static boolean has(GymStore.Gym gym, ExerciseCatalog.Exercise move) {
        return move.equipment() == ExerciseCatalog.Equipment.BODYWEIGHT || LoadSteps.knows(move.equipment(), move.id(), gym);
    }
}
