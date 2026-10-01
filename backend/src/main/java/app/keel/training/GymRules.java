package app.keel.training;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * What a gym can be (K-414, ADR-032): a name, and only weights the gym can really have — above zero, within the
 * ceiling, at most 2 decimals (ADR-029), each listed once — and machines that are machine or cable moves of the catalog.
 */
final class GymRules {

    private static final int DECIMALS = 2;

    private GymRules() {
    }

    static boolean valid(GymController.GymInput gym, GymLimits limits, ExerciseCatalog catalog) {
        return gym.current() != null && gym.name() != null && !gym.name().isBlank() && gym.name().length() <= limits.maxName()
                && (gym.barKg() == null || weight(gym.barKg(), limits.maxBarKg()))
                && (gym.stackStepKg() == null || weight(gym.stackStepKg(), limits.maxStepKg()))
                && weights(gym.platesKg(), limits.maxPlates(), limits.maxPlateKg())
                && weights(gym.dumbbellsKg(), limits.maxDumbbells(), limits.maxDumbbellKg())
                && machines(gym.machines(), limits, catalog);
    }

    private static boolean machines(List<GymController.GymMachine> machines, GymLimits limits, ExerciseCatalog catalog) {
        if (machines == null || machines.size() > limits.maxMachines()) {
            return false;
        }
        Set<String> named = new HashSet<>();
        return machines.stream().allMatch(machine -> machine != null && named.add(machine.exerciseId())
                && catalog.find(machine.exerciseId()).map(ExerciseCatalog.Exercise::equipment)
                        .filter(equipment -> equipment == ExerciseCatalog.Equipment.MACHINE || equipment == ExerciseCatalog.Equipment.CABLE).isPresent()
                && machine.stepKg() != null && weight(machine.stepKg(), limits.maxStepKg()));
    }

    private static boolean weights(List<BigDecimal> weights, int maxCount, BigDecimal maxKg) {
        // 20 and 20.00 are one plate: compared by value, not by scale.
        return weights != null && weights.size() <= maxCount && weights.stream().allMatch(kg -> kg != null && weight(kg, maxKg))
                && weights.stream().map(BigDecimal::stripTrailingZeros).distinct().count() == weights.size();
    }

    private static boolean weight(BigDecimal kg, BigDecimal max) {
        Objects.requireNonNull(kg);
        return kg.signum() > 0 && kg.compareTo(max) <= 0 && kg.stripTrailingZeros().scale() <= DECIMALS;
    }
}
