package app.keel.training;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Stream;

/**
 * The moves a planned move can be swapped for (K-964, ADR-073 #6, Ek 3): the catalog's {@code alternatives} in their
 * order, then the catalog's moves of the same primary muscle and the same kind by id (G6 K-35: a compound move is kept,
 * an isolation move may change — a compound one is not offered an isolation one), then, by id, the moves of the same kind
 * whose primary muscle stands in for it (data/muscles.yaml swap_groups, ADR-090 Ek 2: a taken lat pulldown has rows to go
 * to, G1 K-77), none already on the day, and none the gym in use says it has not got the equipment for. The user's own
 * move (not in the catalog) has none. The equipment a move needs is the catalog's, so a phone that is told a move is taken
 * can offer the ones on other equipment (the list carries every equipment; it is the phone that leaves the taken one's out).
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
            Stream<ExerciseCatalog.Exercise> standingIn = catalog.all().stream()
                    .filter(other -> other.kind() == move.kind() && catalog.standsIn(muscle, other.muscles().getFirst()))
                    .sorted(Comparator.comparing(ExerciseCatalog.Exercise::id));
            return Stream.of(alternatives, sameMuscle, standingIn).flatMap(Function.identity())
                    .filter(other -> !onTheDay.contains(other.id()) && !other.id().equals(exerciseId))
                    .filter(other -> gym.map(inUse -> mayHave(inUse, other.equipment())).orElse(true)).map(ExerciseCatalog.Exercise::id).distinct()
                    .toList();
        }).orElse(List.of());
    }

    /**
     * Whether the gym may have the equipment: false only where its profile says it has not (ADR-032). It says so for a
     * barbell alone, by leaving the bar out (GymInput.barKg: "absent when the gym has no barbell"). It cannot say "no
     * machine", "no cable", "no sled" or "no dumbbells": a stack step, a machine, plates or dumbbells left out may only not
     * have been entered, so what it says nothing about is not taken away (decided on K-964's review).
     */
    private static boolean mayHave(GymStore.Gym gym, ExerciseCatalog.Equipment equipment) {
        return equipment != ExerciseCatalog.Equipment.BARBELL || gym.barKg() != null;
    }
}
