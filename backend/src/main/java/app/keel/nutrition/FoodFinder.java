package app.keel.nutrition;

import com.fasterxml.jackson.annotation.JsonInclude;
import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.shared.AccountId;
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
    private final ConsentGate consent;

    FoodFinder(FoodStore foods, FoodController.NutritionLimits limits, ConsentGate consent) {
        this.foods = foods;
        this.limits = limits;
        this.consent = consent;
    }

    /**
     * What a meal is, is health data (ADR-026 #2: every meal route is behind the consent): a meal read from words needs it
     * as logging one does — CONSENT_REQUIRED otherwise, before anything is sent (K-504 review).
     */
    public void requireMealConsent(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
    }

    /** Foods whose name or brand holds every word, best first (FoodStore.search), at most {@code limit}; words of 2 letters or more. */
    public List<FoodMatch> find(String words, int limit) {
        if (words.strip().length() < 2 || words.length() > limits.maxQueryLength()) {
            return List.of();
        }
        return foods.search(words, Math.min(limit, limits.maxSearchResults())).stream()
                .map(food -> new FoodMatch(food.id(), food.name(), food.brand())).toList();
    }

    /** The most an amount may be in grams (keel.nutrition.max-grams) — and so the largest quantity in any measure. */
    public BigDecimal maxGrams() {
        return limits.maxGrams();
    }

    /** The most items a meal may have (keel.nutrition.max-items). */
    public int maxItems() {
        return limits.maxItems();
    }
}
