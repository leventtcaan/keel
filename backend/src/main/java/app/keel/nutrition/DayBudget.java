package app.keel.nutrition;

/**
 * What is left of the day's targets (K-209, Ö-17): the target minus the eaten range, a range itself (U5) — most left
 * when the least was eaten, least left when the most was. Past the target it is negative; nothing resets or makes up
 * for it (U7).
 */
final class DayBudget {

    /** Contract KcalBalance / GramBalance: low ≤ high, negative past the target. */
    record Balance(int low, int high) {
    }

    /** Contract Left. */
    record Left(Balance kcal, Balance proteinG) {
    }

    private DayBudget() {
    }

    static Left left(DailyTargets.Targets targets, FoodRanges.Nutrients eaten) {
        return new Left(balance(targets.kcal(), eaten.kcal()), balance(targets.proteinG(), eaten.proteinG()));
    }

    private static Balance balance(int target, FoodRanges.Range eaten) {
        return new Balance(target - eaten.high(), target - eaten.low());
    }
}
