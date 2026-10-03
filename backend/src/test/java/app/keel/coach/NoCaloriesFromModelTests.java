package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.nutrition.FoodFinder;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * No number of what a meal holds comes from the model (K-514, U1, ADR-004): a photo reply that carries calories or a
 * nutrient anywhere is dropped whole, and the draft the app gets has no place for one — the range is the database's
 * (/v1/food-estimates), once the user picks the food.
 */
class NoCaloriesFromModelTests {

    private static final MealReplyCheck PHOTO = MealReplyCheck.grams(20, new BigDecimal("5000"), 100, ForbiddenWords.fromClasspath());

    @ParameterizedTest
    @ValueSource(strings = {"kcal", "calories", "energy", "protein", "carbs", "fat", "estimatedKcal"})
    void anItemThatSaysWhatItHoldsDropsTheReply(String field) {
        assertThat(PHOTO.read("{\"items\":[{\"food\":\"rice\",\"quantity\":180,\"unit\":\"g\",\"" + field + "\":234}]}")).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"totalKcal", "calories", "confidence", "note"})
    void aReplyThatSaysAnythingBesideTheItemsIsDropped(String field) {
        assertThat(PHOTO.read("{\"items\":[{\"food\":\"rice\",\"quantity\":180,\"unit\":\"g\"}],\"" + field + "\":234}")).isEmpty();
    }

    @Test
    void norANumberInTheFoodsWords() {
        assertThat(PHOTO.read("{\"items\":[{\"food\":\"rice 230 kcal\",\"quantity\":180,\"unit\":\"g\"}]}")).isEmpty();
    }

    @Test
    void theDraftHasNoPlaceForWhatAFoodHolds() {
        List<String> nutrient = List.of("kcal", "calorie", "energy", "protein", "carb", "fat", "nutrient", "macro");
        List<String> components = Stream.of(MealDraft.Draft.class, MealDraft.Item.class, MealDraft.Amount.class, FoodFinder.FoodMatch.class)
                .flatMap(type -> Arrays.stream(type.getRecordComponents())).map(RecordComponent::getName)
                .map(name -> name.toLowerCase(Locale.ROOT)).toList();
        assertThat(components).isNotEmpty().noneMatch(name -> nutrient.stream().anyMatch(name::contains));
    }
}
