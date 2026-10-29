package app.keel.nutrition;

import app.keel.engine.Parameters;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/foods/search, /v1/foods/barcode-lookup and /v1/food-estimates (K-208). The numbers come from the
 * food database (U1), as ranges (U5, FoodRanges). Nothing here is stored and nothing leaves the server, so no consent is
 * asked; logging a meal (K-209) is health data and is.
 */
@RestController
@EnableConfigurationProperties({FoodController.NutritionLimits.class, FoodRanking.Weights.class, FoodPortions.Settings.class})
class FoodController {

    /** What a request can ask for (keel.nutrition). */
    @ConfigurationProperties("keel.nutrition")
    record NutritionLimits(int defaultSearchResults, int maxSearchResults, int maxQueryLength, int maxItems, BigDecimal maxGrams, int maxPortions,
            int maxRecipeName, int maxRecipes, int suggestions, int suggestionDays, int suggestionCandidates,
            int recentFoods) {

        /** A recent list longer than the candidates tried could never fill: a configuration error at start, not a silent cut (K-1025). */
        public NutritionLimits {
            if (recentFoods < 1 || recentFoods > suggestionCandidates) {
                throw new IllegalArgumentException("keel.nutrition.recent-foods must be 1 to suggestion-candidates (" + suggestionCandidates
                        + "), was " + recentFoods);
            }
        }
    }

    record FoodSearch(String q, Integer limit) {
    }

    record BarcodeLookup(String gtin) {
    }

    record FoodEstimateRequest(List<FoodEstimator.ItemRequest> items) {
    }

    /** Contract Food. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Food(String id, String name, String brand, FoodRanges.Nutrients per100g, List<FoodStore.Serving> servings,
            List<FoodPortions.Portion> portions, FoodEstimator.Amount defaultAmount) {
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
    private final FoodPortions.Settings portions;
    private final Profiles profiles;

    FoodController(FoodStore foods, FoodEstimator estimator, NutritionLimits limits, FoodPortions.Settings portions, Profiles profiles) {
        this.foods = foods;
        this.estimator = estimator;
        this.limits = limits;
        this.portions = portions;
        this.profiles = profiles;
    }

    @PostMapping("/v1/foods/search")
    List<Food> search(AccountId account, @RequestBody FoodSearch search,
            @RequestHeader(name = HttpHeaders.ACCEPT_LANGUAGE, required = false) String acceptLanguage) {
        String query = search.q() == null ? "" : search.q().strip();
        int limit = search.limit() == null ? limits.defaultSearchResults() : search.limit();
        require(query.length() >= MIN_QUERY && query.length() <= limits.maxQueryLength() && limit >= 1 && limit <= limits.maxSearchResults());
        Parameters p = estimator.parametersFor(account);
        return foods.search(query, limit, new FoodStore.Searcher(Optional.of(account.value()), regionOf(account, acceptLanguage))).stream()
                .map(food -> view(food, p, portions)).toList();
    }

    @PostMapping("/v1/foods/barcode-lookup")
    Food barcode(AccountId account, @RequestBody BarcodeLookup lookup,
            @RequestHeader(name = HttpHeaders.ACCEPT_LANGUAGE, required = false) String acceptLanguage) {
        List<String> gtins = Gtin.candidates(lookup.gtin());
        require(!gtins.isEmpty());
        Optional<String> region = regionOf(account, acceptLanguage);
        // USDA Branded first, then Open Food Facts of the user's region; none of them: a plain NOT_FOUND, the app offers search instead.
        return gtins.stream().map(gtin -> foods.byGtin(gtin, region)).flatMap(Optional::stream).findFirst()
                .map(food -> view(food, estimator.parametersFor(account), portions)).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    /** The region whose foods come first for this request: the device's language, else the profile's time zone. */
    private Optional<String> regionOf(AccountId account, String acceptLanguage) {
        return FoodRegion.of(acceptLanguage, profiles.of(account).map(ProfileFacts::timeZone));
    }

    @PostMapping("/v1/food-estimates")
    FoodEstimate estimate(AccountId account, @RequestBody FoodEstimateRequest request) {
        FoodEstimator.Estimate estimate = estimator.estimate(account, request.items());
        return new FoodEstimate(estimate.items(), estimate.total().kcal(), estimate.total().proteinG(), estimate.question().orElse(null));
    }

    private static Food view(FoodStore.Food food, Parameters p, FoodPortions.Settings settings) {
        FoodPortions.Portions ways = FoodPortions.of(food, settings);
        return new Food(food.id(), food.name(), food.brand(), FoodRanges.per100g(food.per100g(), food.source(), p), food.servings(), ways.portions(),
                ways.defaultAmount());
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
