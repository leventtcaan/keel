package app.keel.nutrition;

import app.keel.engine.Parameters;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/foods/search, /v1/foods/barcode-lookup and /v1/food-estimates (K-208). The numbers come from the
 * food database (U1), as ranges (U5, FoodRanges). Nothing here is stored and nothing leaves the server, so no consent is
 * asked; logging a meal (K-209) is health data and is.
 */
@RestController
@EnableConfigurationProperties(FoodController.NutritionLimits.class)
class FoodController {

    /** What a request can ask for (keel.nutrition). */
    @ConfigurationProperties("keel.nutrition")
    record NutritionLimits(int defaultSearchResults, int maxSearchResults, int maxQueryLength, int maxItems, BigDecimal maxGrams, int maxPortions,
            int maxRecipeName, int maxRecipes) {
    }

    record FoodSearch(String q, Integer limit) {
    }

    record BarcodeLookup(String gtin) {
    }

    record FoodEstimateRequest(List<FoodEstimator.ItemRequest> items) {
    }

    /** Contract Food. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Food(String id, String name, String brand, FoodRanges.Nutrients per100g, List<FoodStore.Serving> servings) {
    }

    /** Contract FoodEstimate. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record FoodEstimate(List<FoodEstimator.EstimatedItem> items, FoodRanges.Range kcal, FoodRanges.Range proteinG,
            FoodEstimator.AmountQuestion question) {
    }

    private static final int MIN_QUERY = 2;

    private final FoodStore foods;
    private final FoodEstimator estimator;
    private final NutritionLimits limits;

    FoodController(FoodStore foods, FoodEstimator estimator, NutritionLimits limits) {
        this.foods = foods;
        this.estimator = estimator;
        this.limits = limits;
    }

    @PostMapping("/v1/foods/search")
    List<Food> search(AccountId account, @RequestBody FoodSearch search) {
        String query = search.q() == null ? "" : search.q().strip();
        int limit = search.limit() == null ? limits.defaultSearchResults() : search.limit();
        require(query.length() >= MIN_QUERY && query.length() <= limits.maxQueryLength() && limit >= 1 && limit <= limits.maxSearchResults());
        Parameters p = estimator.parametersFor(account);
        return foods.search(query, limit).stream().map(food -> view(food, p)).toList();
    }

    @PostMapping("/v1/foods/barcode-lookup")
    Food barcode(AccountId account, @RequestBody BarcodeLookup lookup) {
        List<String> gtins = Gtin.candidates(lookup.gtin());
        require(!gtins.isEmpty());
        // FDC has mostly US products (ADR-008): a plain NOT_FOUND, the app offers search instead (DURUM question 10).
        return gtins.stream().map(foods::byGtin).flatMap(Optional::stream).findFirst().map(food -> view(food, estimator.parametersFor(account)))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    @PostMapping("/v1/food-estimates")
    FoodEstimate estimate(AccountId account, @RequestBody FoodEstimateRequest request) {
        FoodEstimator.Estimate estimate = estimator.estimate(account, request.items());
        return new FoodEstimate(estimate.items(), estimate.total().kcal(), estimate.total().proteinG(), estimate.question().orElse(null));
    }

    private static Food view(FoodStore.Food food, Parameters p) {
        return new Food(food.id(), food.name(), food.brand(), FoodRanges.per100g(food.per100g(), food.source(), p), food.servings());
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
