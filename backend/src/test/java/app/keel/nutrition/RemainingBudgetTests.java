package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.nutrition.DayBudget.Balance;
import app.keel.nutrition.FoodRanges.Nutrients;
import app.keel.nutrition.FoodRanges.Range;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/**
 * What is left of the day (K-209): the target minus the eaten range, itself a range — the most left when the least was
 * eaten, the least left when the most was (U5). Past the target it goes negative; no reset, no make-up (U7).
 */
class RemainingBudgetTests {

    private static final DailyTargets.Targets TARGETS = new DailyTargets.Targets(2200, 160);

    @Test
    void theTargetMinusTheEatenRange() {
        Nutrients eaten = new Nutrients(new Range(372, 742), new Range(55, 81), new Range(14, 58), new Range(7, 17));

        assertThat(DayBudget.left(TARGETS, eaten)).isEqualTo(new DayBudget.Left(new Balance(1458, 1828), new Balance(79, 105)));
    }

    @Test
    void pastTheTargetIsNegative() {
        Nutrients eaten = new Nutrients(new Range(2300, 2600), new Range(150, 170), new Range(0, 0), new Range(0, 0));

        assertThat(DayBudget.left(TARGETS, eaten)).isEqualTo(new DayBudget.Left(new Balance(-400, -100), new Balance(-10, 10)));
    }

    @Property
    void lowIsNeverAboveHighAndTheWidthIsTheEatenWidth(@ForAll @IntRange(min = 0, max = 6000) int low, @ForAll @IntRange(min = 0, max = 3000) int width) {
        Nutrients eaten = new Nutrients(new Range(low, low + width), new Range(0, 0), new Range(0, 0), new Range(0, 0));

        Balance left = DayBudget.left(TARGETS, eaten).kcal();

        assertThat(left.high() - left.low()).isEqualTo(width);
        assertThat(left.high()).isEqualTo(TARGETS.kcal() - low);
    }
}
