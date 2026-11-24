package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/** A dish worked out from its ingredients (K-1213) is an estimate: its range is wider than a laboratory value's (U5). */
class RecipeEstimateRangeTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final FoodRanges.Per100g DISH = new FoodRanges.Per100g(new BigDecimal("100"), new BigDecimal("5"), new BigDecimal("10"),
            new BigDecimal("4"));

    @Test
    void aRecipeEstimateIsWiderThanAnAnalysedValueAndKeepsTheNumberInTheMiddle() {
        FoodRanges.Range analysed = FoodRanges.per100g(DISH, FoodRanges.Source.ANALYSED, P).kcal();
        FoodRanges.Range recipe = FoodRanges.per100g(DISH, FoodRanges.Source.RECIPE, P).kcal();

        assertThat(recipe.low()).isLessThan(analysed.low());
        assertThat(recipe.high()).isGreaterThan(analysed.high());
        double ratio = P.number(ParameterKey.RECIPE_ESTIMATE_VALUE_ERROR_RATIO);
        assertThat(ratio).isGreaterThan(P.number(ParameterKey.ANALYSED_VALUE_ERROR_RATIO));
        assertThat(recipe).isEqualTo(new FoodRanges.Range((int) Math.floor(100 * (1 - ratio)), (int) Math.ceil(100 * (1 + ratio))));
    }
}
