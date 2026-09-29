package app.keel.nutrition;

import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Sex;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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
    record NutritionLimits(int defaultSearchResults, int maxSearchResults, int maxQueryLength, int maxItems, BigDecimal maxGrams) {
    }

    record FoodSearch(String q, Integer limit) {
    }

    record BarcodeLookup(String gtin) {
    }

    /** Contract Amount.certainty: weighed on a scale, or estimated. A serving name is a measure either way. */
    enum AmountCertainty { WEIGHED, ESTIMATED }

    record Amount(BigDecimal quantity, String unit, AmountCertainty certainty) {
    }

    record ItemRequest(String foodId, Amount amount) {
    }

    record FoodEstimateRequest(List<ItemRequest> items) {
    }

    /** Contract Food. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Food(String id, String name, String brand, FoodRanges.Nutrients per100g, List<FoodStore.Serving> servings) {
    }

    /** Contract EstimatedItem. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record EstimatedItem(String foodId, String name, Amount amount, FoodRanges.Range kcal, FoodRanges.Range proteinG,
            FoodRanges.Range carbsG, FoodRanges.Range fatG) {
    }

    record AmountQuestion(String foodId, String copyKey) {
    }

    /** Contract FoodEstimate. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record FoodEstimate(List<EstimatedItem> items, FoodRanges.Range kcal, FoodRanges.Range proteinG, AmountQuestion question) {
    }

    static final String GRAMS_QUESTION = "foodEstimate.question.grams";
    private static final int QUANTITY_DECIMALS = 2;
    private static final int MIN_QUERY = 2;

    private final FoodStore foods;
    private final ParameterSet parameters;
    private final Profiles profiles;
    private final NutritionLimits limits;

    FoodController(FoodStore foods, ParameterSet parameters, Profiles profiles, NutritionLimits limits) {
        this.foods = foods;
        this.parameters = parameters;
        this.profiles = profiles;
        this.limits = limits;
    }

    @PostMapping("/v1/foods/search")
    List<Food> search(AccountId account, @RequestBody FoodSearch search) {
        String query = search.q() == null ? "" : search.q().strip();
        int limit = search.limit() == null ? limits.defaultSearchResults() : search.limit();
        require(query.length() >= MIN_QUERY && query.length() <= limits.maxQueryLength() && limit >= 1 && limit <= limits.maxSearchResults());
        Parameters p = parametersFor(account);
        return foods.search(query, limit).stream().map(food -> view(food, p)).toList();
    }

    @PostMapping("/v1/foods/barcode-lookup")
    Food barcode(AccountId account, @RequestBody BarcodeLookup lookup) {
        List<String> gtins = Gtin.candidates(lookup.gtin());
        require(!gtins.isEmpty());
        // FDC has mostly US products (ADR-008): a plain NOT_FOUND, the app offers search instead (DURUM question 10).
        return gtins.stream().map(foods::byGtin).flatMap(Optional::stream).findFirst().map(food -> view(food, parametersFor(account)))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    @PostMapping("/v1/food-estimates")
    FoodEstimate estimate(AccountId account, @RequestBody FoodEstimateRequest request) {
        require(request.items() != null && !request.items().isEmpty() && request.items().size() <= limits.maxItems());
        Parameters p = parametersFor(account);
        List<EstimatedItem> items = new ArrayList<>();
        List<FoodRanges.Item> forQuestion = new ArrayList<>();
        for (ItemRequest item : request.items()) {
            require(item != null && item.foodId() != null && item.amount() != null);
            FoodStore.Food food = foods.find(item.foodId()).orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED));
            Measured measured = measure(food, item.amount());
            FoodRanges.Nutrients nutrients = FoodRanges.item(food.per100g(), food.source(), measured.grams(), measured.certainty(), p);
            items.add(new EstimatedItem(food.id(), food.name(), item.amount(), nutrients.kcal(), nutrients.proteinG(), nutrients.carbsG(),
                    nutrients.fatG()));
            forQuestion.add(new FoodRanges.Item(food.id(), nutrients, measured.certainty()));
        }
        FoodRanges.Nutrients total = FoodRanges.total(forQuestion.stream().map(FoodRanges.Item::nutrients).toList());
        return new FoodEstimate(items, total.kcal(), total.proteinG(),
                FoodRanges.question(forQuestion, p).map(food -> new AmountQuestion(food, GRAMS_QUESTION)).orElse(null));
    }

    private record Measured(BigDecimal grams, FoodRanges.Certainty certainty) {
    }

    /** The amount in grams and how well it is known: g on a scale or by eye; ml through the food's density; a serving. */
    private Measured measure(FoodStore.Food food, Amount amount) {
        require(amount.quantity() != null && amount.quantity().signum() > 0 && amount.quantity().stripTrailingZeros().scale() <= QUANTITY_DECIMALS
                && amount.unit() != null);
        FoodRanges.Certainty scale = amount.certainty() == AmountCertainty.WEIGHED ? FoodRanges.Certainty.WEIGHED : FoodRanges.Certainty.ESTIMATED;
        Measured measured = switch (amount.unit().strip().toLowerCase(Locale.ROOT)) {
            case "g" -> new Measured(amount.quantity(), scale);
            case "ml" -> {
                require(food.gramsPerMl() != null);
                yield new Measured(amount.quantity().multiply(food.gramsPerMl()), scale);
            }
            default -> {
                Optional<FoodStore.Serving> serving = food.servings().stream()
                        .filter(candidate -> candidate.name().equalsIgnoreCase(amount.unit().strip())).findFirst();
                require(serving.isPresent());
                yield new Measured(amount.quantity().multiply(serving.orElseThrow().grams()), FoodRanges.Certainty.MEASURED);
            }
        };
        require(measured.grams().compareTo(limits.maxGrams()) <= 0);
        return measured;
    }

    /** The engine's parameters; the food ones have one value for both sexes (the profile's sex when there is one). */
    private Parameters parametersFor(AccountId account) {
        return parameters.forSex(profiles.of(account).map(facts -> Sex.valueOf(facts.sex().name())).orElse(Sex.MALE));
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
