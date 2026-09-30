package app.keel.engine;

import java.util.Objects;
import java.util.OptionalInt;

/**
 * The plan's daily calories and what training burns per day: the two numbers energy availability is made of
 * (J1 C6: EA = (intake − exercise) / fat-free mass). The target is the plan's, not the logged intake: logged food is
 * systematically under-counted (K-115), and a plan that is itself too low is what this check has to catch.
 *
 * @param exerciseKcalPerDay average energy spent in exercise per day (e.g. from Apple Health); 0 when none, empty when
 *     not known yet — the plan's target reaches the Snapshot before any exercise data does (K-216)
 */
public record EnergyBudget(int targetKcal, OptionalInt exerciseKcalPerDay) {

    public EnergyBudget {
        if (targetKcal <= 0) {
            throw new IllegalArgumentException("targetKcal must be positive, was " + targetKcal);
        }
        Objects.requireNonNull(exerciseKcalPerDay, "exerciseKcalPerDay");
        if (exerciseKcalPerDay.isPresent() && exerciseKcalPerDay.getAsInt() < 0) {
            throw new IllegalArgumentException("exerciseKcalPerDay cannot be negative, was " + exerciseKcalPerDay.getAsInt());
        }
    }

    public EnergyBudget(int targetKcal, int exerciseKcalPerDay) {
        this(targetKcal, OptionalInt.of(exerciseKcalPerDay));
    }

    /** The plan's target with the exercise burn not known yet. */
    public static EnergyBudget exerciseUnknown(int targetKcal) {
        return new EnergyBudget(targetKcal, OptionalInt.empty());
    }
}
