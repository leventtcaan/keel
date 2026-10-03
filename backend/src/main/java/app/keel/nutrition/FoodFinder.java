package app.keel.nutrition;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * The foods the coach may offer for words it read from a meal (K-504, U1): found in the food database, as the app's own
 * search finds them — the coach never says what a food holds; the estimate is the database's (/v1/food-estimates).
 */
@Service
public class FoodFinder {

    /** A food to offer: which, and what it is called (a brand only when it has one). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record FoodMatch(String id, String name, String brand) {
    }

    private final FoodStore foods;
    private final FoodController.NutritionLimits limits;

    FoodFinder(FoodStore foods, FoodController.NutritionLimits limits) {
        this.foods = foods;
        this.limits = limits;
    }

    /** Foods whose name or brand holds every word, best first (FoodStore.search), at most {@code limit}. */
    public List<FoodMatch> find(String words, int limit) {
        if (words.isBlank() || words.length() > limits.maxQueryLength()) {
            return List.of();
        }
        return foods.search(words, Math.min(limit, limits.maxSearchResults())).stream()
                .map(food -> new FoodMatch(food.id(), food.name(), food.brand())).toList();
    }

    /** The most a meal item may weigh (keel.nutrition.max-grams): what a logged item may be. */
    public BigDecimal maxGrams() {
        return limits.maxGrams();
    }

    /** The most items a meal may have (keel.nutrition.max-items). */
    public int maxItems() {
        return limits.maxItems();
    }
}
