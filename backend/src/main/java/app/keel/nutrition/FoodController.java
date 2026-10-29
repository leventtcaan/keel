package app.keel.nutrition;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
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
            int recentFoods, int maxMealRangeDays, int maxFavorites, int maxOwnFoods, int maxOwnFoodName) {

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

    /** Contract NewFood: a label's numbers for one serving of servingGrams. */
    record NewFood(String name, String brand, String gtin, BigDecimal servingGrams, BigDecimal kcal, BigDecimal proteinG, BigDecimal carbsG,
            BigDecimal fatG) {
    }

    record FoodEstimateRequest(List<FoodEstimator.ItemRequest> items) {
    }

    /** Contract Food. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Food(String id, String name, String brand, FoodRanges.Nutrients per100g, List<FoodStore.Serving> servings,
            List<FoodPortions.Portion> portions, FoodEstimator.Amount defaultAmount, Boolean avoided, Boolean own) {
    }

    /** Contract FoodEstimate. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record FoodEstimate(List<FoodEstimator.EstimatedItem> items, FoodRanges.Range kcal, FoodRanges.Range proteinG,
            FoodEstimator.AmountQuestion question) {
    }

    private static final int MIN_QUERY = 2;
    /**
     * What a label can hold (physics, not tuning): 100 g of anything is at most about 900 kcal, and its protein, carbs and fat together
     * at most 100 g; a little over is a rounded label, a lot over is a typo.
     */
    private static final BigDecimal MAX_KCAL_PER_100G = BigDecimal.valueOf(1000);
    private static final BigDecimal MAX_MACROS_PER_100G = BigDecimal.valueOf(110);
    private static final BigDecimal MIN_SERVING_G = BigDecimal.ONE;
    // The contract's bounds for a label's numbers (NewFood), and how many digits before the point each may have (the database columns).
    private static final BigDecimal KCAL_MAX = BigDecimal.valueOf(10_000);
    private static final BigDecimal GRAMS_MAX = BigDecimal.valueOf(1_000);
    private static final int OWN_DECIMALS = 2;
    private static final int SERVING_DIGITS = 4;
    private static final int KCAL_DIGITS = 5;
    private static final int GRAM_DIGITS = 4;

    private final FoodStore foods;
    private final FoodEstimator estimator;
    private final NutritionLimits limits;
    private final FoodPortions.Settings portions;
    private final Profiles profiles;
    private final OwnFoods ownFoods;
    private final FoodFavorites favorites;
    private final ConsentGate consent;

    FoodController(FoodStore foods, FoodEstimator estimator, NutritionLimits limits, FoodPortions.Settings portions, Profiles profiles,
            OwnFoods ownFoods, FoodFavorites favorites, ConsentGate consent) {
        this.ownFoods = ownFoods;
        this.favorites = favorites;
        this.consent = consent;
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
        List<String> avoid = profiles.foodsAvoided(account);
        // The user's own foods first (they made them for this), then the database's, best first; the list is never longer than asked.
        List<FoodStore.Food> found = new java.util.ArrayList<>(ownFoods.search(account, FoodSearchTerms.of(query), limit));
        found.addAll(foods.search(query, limit, new FoodStore.Searcher(Optional.of(account.value()), regionOf(account, acceptLanguage))));
        return found.stream().limit(limit).map(food -> view(food, p, portions, avoid)).toList();
    }

    @PostMapping("/v1/foods/barcode-lookup")
    Food barcode(AccountId account, @RequestBody BarcodeLookup lookup,
            @RequestHeader(name = HttpHeaders.ACCEPT_LANGUAGE, required = false) String acceptLanguage) {
        List<String> gtins = Gtin.candidates(lookup.gtin());
        require(!gtins.isEmpty());
        Optional<String> region = regionOf(account, acceptLanguage);
        // The user's own food with this barcode first, then USDA Branded and Open Food Facts of the user's region; none of them: a plain
        // NOT_FOUND, the app offers to add the product or to search instead.
        return gtins.stream().map(gtin -> ownFoods.byGtin(account, gtin)).flatMap(Optional::stream).findFirst()
                .or(() -> gtins.stream().map(gtin -> foods.byGtin(gtin, region)).flatMap(Optional::stream).findFirst())
                .map(food -> view(food, estimator.parametersFor(account), portions, profiles.foodsAvoided(account)))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    /** The user's own food, from a label (K-1063): numbers for one serving, stored per 100 g, seen by its owner only. */
    @PostMapping("/v1/foods")
    ResponseEntity<Food> create(AccountId account, @RequestBody NewFood food) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        String name = food.name() == null ? "" : food.name().strip();
        String brand = food.brand() == null || food.brand().isBlank() ? null : food.brand().strip();
        Optional<String> gtin = food.gtin() == null ? Optional.empty() : Gtin.normalize(food.gtin());
        // The five numbers first, by their shape alone (no arithmetic on a value like 1E+1000000 or one with fifty decimals): then bounds, then
        // the per-100 g sums. Each fits its database column (numeric(7,2), numeric(6,2)).
        require(shaped(food.servingGrams(), SERVING_DIGITS) && shaped(food.kcal(), KCAL_DIGITS) && shaped(food.proteinG(), GRAM_DIGITS)
                && shaped(food.carbsG(), GRAM_DIGITS) && shaped(food.fatG(), GRAM_DIGITS));
        require(food.servingGrams().compareTo(MIN_SERVING_G) >= 0 && food.servingGrams().compareTo(limits.maxGrams()) <= 0
                && food.kcal().compareTo(KCAL_MAX) <= 0 && food.proteinG().compareTo(GRAMS_MAX) <= 0 && food.carbsG().compareTo(GRAMS_MAX) <= 0
                && food.fatG().compareTo(GRAMS_MAX) <= 0);
        require(!name.isEmpty() && name.length() <= limits.maxOwnFoodName() && (brand == null || brand.length() <= limits.maxOwnFoodName())
                && (food.gtin() == null || gtin.isPresent())
                && OwnFoods.per100g(food.kcal(), food.servingGrams()).compareTo(MAX_KCAL_PER_100G) <= 0
                && OwnFoods.per100g(food.proteinG().add(food.carbsG()).add(food.fatG()), food.servingGrams()).compareTo(MAX_MACROS_PER_100G) <= 0
                && ownFoods.count(account) < limits.maxOwnFoods());
        FoodStore.Food stored = ownFoods.create(account, new OwnFoods.NewOwn(name, brand, null, food.servingGrams(), food.kcal(), food.proteinG(),
                food.carbsG(), food.fatG()), gtin);
        return ResponseEntity.status(HttpStatus.CREATED).body(view(stored, estimator.parametersFor(account), portions, profiles.foodsAvoided(account)));
    }

    /**
     * A number typed in: not null, not negative, at most two decimals and at most {@code integerDigits} before the point. Judged by
     * its shape only, so a value like 1E+1000000 or one with a huge scale costs nothing to refuse (no arithmetic on it).
     */
    static boolean shaped(BigDecimal value, int integerDigits) {
        if (value == null || value.signum() < 0) {
            return false;
        }
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() <= OWN_DECIMALS && stripped.precision() - stripped.scale() <= integerDigits;
    }

    /** The foods the user starred, newest star first, each with its portions; one gone from the database is left out. */
    @GetMapping("/v1/foods/favorites")
    List<Food> favorites(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        Parameters p = estimator.parametersFor(account);
        List<String> avoid = profiles.foodsAvoided(account);
        return favorites.ids(account).stream().map(id -> estimator.food(account, id)).flatMap(Optional::stream)
                .map(food -> view(food, p, portions, avoid)).toList();
    }

    @PutMapping("/v1/foods/{id}/favorite")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void star(AccountId account, @PathVariable String id) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(estimator.food(account, id).isPresent());
        require(favorites.has(account, id) || favorites.count(account) < limits.maxFavorites());
        favorites.add(account, id);
    }

    @DeleteMapping("/v1/foods/{id}/favorite")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void unstar(AccountId account, @PathVariable String id) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        favorites.remove(account, id);
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

    private static Food view(FoodStore.Food food, Parameters p, FoodPortions.Settings settings, List<String> avoid) {
        FoodPortions.Portions ways = FoodPortions.of(food, settings);
        // The mark is only ever "true": an absent field is "not avoided". The word is read against name and brand, as for Recent.
        boolean avoided = MealSuggestions.avoids(food.brand() == null ? food.name() : food.name() + " " + food.brand(), avoid);
        return new Food(food.id(), food.name(), food.brand(), FoodRanges.per100g(food.per100g(), food.source(), p), food.servings(), ways.portions(),
                ways.defaultAmount(), avoided ? Boolean.TRUE : null, food.id().startsWith(OwnFoods.PREFIX) ? Boolean.TRUE : null);
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
