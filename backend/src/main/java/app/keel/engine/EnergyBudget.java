package app.keel.engine;

/**
 * The plan's daily calories and what training burns per day: the two numbers energy availability is made of
 * (J1 C6: EA = (intake − exercise) / fat-free mass). The target is the plan's, not the logged intake: logged food is
 * systematically under-counted (K-115), and a plan that is itself too low is what this check has to catch.
 *
 * @param exerciseKcalPerDay average energy spent in exercise per day (e.g. from Apple Health); 0 when none
 */
public record EnergyBudget(int targetKcal, int exerciseKcalPerDay) {

    public EnergyBudget {
        if (targetKcal <= 0) {
            throw new IllegalArgumentException("targetKcal must be positive, was " + targetKcal);
        }
        if (exerciseKcalPerDay < 0) {
            throw new IllegalArgumentException("exerciseKcalPerDay cannot be negative, was " + exerciseKcalPerDay);
        }
    }
}
