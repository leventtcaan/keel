package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.nutrition.FoodRanges.Nutrients;
import app.keel.nutrition.FoodRanges.Range;
import java.math.BigDecimal;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.BigRange;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Scale;
import org.junit.jupiter.api.Test;

/**
 * A recipe's share (K-413, ADR-034): the portions eaten out of the portions the recipe makes, of the whole recipe's
 * ranges. The low end goes down and the high end up, so a share never claims more certainty than the whole (U5).
 */
class RecipeShareTests {

    private static final Nutrients POT = new Nutrients(new Range(1000, 1400), new Range(60, 80), new Range(120, 150), new Range(30, 45));

    @Test
    void twoOfFourPortionsIsHalfThePot() {
        assertThat(FoodRanges.share(POT, new BigDecimal("2"), 4))
                .isEqualTo(new Nutrients(new Range(500, 700), new Range(30, 40), new Range(60, 75), new Range(15, 23)));
    }

    @Test
    void aThirdIsRoundedOutward() {
        assertThat(FoodRanges.share(POT, BigDecimal.ONE, 3).kcal()).isEqualTo(new Range(333, 467));
    }

    @Test
    void halfAPortionAndMoreThanThePotMakes() {
        assertThat(FoodRanges.share(POT, new BigDecimal("0.5"), 2).kcal()).isEqualTo(new Range(250, 350));
        assertThat(FoodRanges.share(POT, new BigDecimal("6"), 4).kcal()).isEqualTo(new Range(1500, 2100));
    }

    @Property
    void theWholeRecipeIsTheWholeRange(@ForAll @IntRange(min = 1, max = 50) int portions) {
        assertThat(FoodRanges.share(POT, BigDecimal.valueOf(portions), portions)).isEqualTo(POT);
    }

    @Property
    void everyShareBracketsItsPartOfTheWhole(@ForAll @IntRange(min = 0, max = 5000) int low, @ForAll @IntRange(min = 0, max = 5000) int extra,
            @ForAll @BigRange(min = "0.01", max = "50") @Scale(2) BigDecimal eaten, @ForAll @IntRange(min = 1, max = 50) int portions) {
        Range whole = new Range(low, low + extra);
        Range share = FoodRanges.share(new Nutrients(whole, whole, whole, whole), eaten, portions).kcal();
        BigDecimal fraction = eaten.divide(BigDecimal.valueOf(portions), 10, java.math.RoundingMode.HALF_UP);
        assertThat(share.low()).isLessThanOrEqualTo(share.high());
        assertThat(BigDecimal.valueOf(share.low())).isLessThanOrEqualTo(BigDecimal.valueOf(whole.low()).multiply(fraction).add(new BigDecimal("0.000001")));
        assertThat(BigDecimal.valueOf(share.high())).isGreaterThanOrEqualTo(BigDecimal.valueOf(whole.high()).multiply(fraction).subtract(new BigDecimal("0.000001")));
        assertThat(share.high() - share.low()).isLessThanOrEqualTo((int) Math.ceil((whole.high() - whole.low()) * fraction.doubleValue()) + 2);
    }
}
