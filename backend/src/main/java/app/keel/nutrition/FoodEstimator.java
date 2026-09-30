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
import org.springframework.stereotype.Service;

/**
 * Items to ranges (K-208): the food from the database, the amount in grams and how well it is known, FoodRanges for the
 * numbers, and the one gram question. Shared by the estimate (nothing stored) and the meal log (K-209, stored as estimated).
 */
@Service
class FoodEstimator {

    /** Contract Amount.certainty: weighed on a scale, or estimated. A serving name is a measure either way. */
    enum AmountCertainty { WEIGHED, ESTIMATED }

    /** Contract Amount. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Amount(BigDecimal quantity, String unit, AmountCertainty certainty) {
    }

    /** Contract ItemRequest. */
    record ItemRequest(String foodId, Amount amount) {
    }

    /** Contract EstimatedItem. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record EstimatedItem(String foodId, String name, Amount amount, FoodRanges.Range kcal, FoodRanges.Range proteinG,
            FoodRanges.Range carbsG, FoodRanges.Range fatG) {

        FoodRanges.Nutrients nutrients() {
            return new FoodRanges.Nutrients(kcal, proteinG, carbsG, fatG);
        }
    }

    /** Contract AmountQuestion. */
    record AmountQuestion(String foodId, String copyKey) {
    }

    record Estimate(List<EstimatedItem> items, FoodRanges.Nutrients total, Optional<AmountQuestion> question) {
    }

    static final String GRAMS_QUESTION = "foodEstimate.question.grams";
    private static final int QUANTITY_DECIMALS = 2;

    private final FoodStore foods;
    private final ParameterSet parameters;
    private final Profiles profiles;
    private final FoodController.NutritionLimits limits;

    FoodEstimator(FoodStore foods, ParameterSet parameters, Profiles profiles, FoodController.NutritionLimits limits) {
        this.foods = foods;
        this.parameters = parameters;
        this.profiles = profiles;
        this.limits = limits;
    }

    /** VALIDATION_FAILED for an item the database or the limits cannot take. */
    Estimate estimate(AccountId account, List<ItemRequest> requested) {
        require(requested != null && !requested.isEmpty() && requested.size() <= limits.maxItems());
        Parameters p = parametersFor(account);
        List<EstimatedItem> items = new ArrayList<>();
        List<FoodRanges.Item> forQuestion = new ArrayList<>();
        for (ItemRequest item : requested) {
            require(item != null && item.foodId() != null && item.amount() != null);
            FoodStore.Food food = foods.find(item.foodId()).orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED));
            Measured measured = measure(food, item.amount());
            FoodRanges.Nutrients nutrients = FoodRanges.item(food.per100g(), food.source(), measured.grams(), measured.certainty(), p);
            items.add(new EstimatedItem(food.id(), food.name(), item.amount(), nutrients.kcal(), nutrients.proteinG(), nutrients.carbsG(),
                    nutrients.fatG()));
            forQuestion.add(new FoodRanges.Item(food.id(), nutrients, measured.certainty()));
        }
        return new Estimate(List.copyOf(items), FoodRanges.total(forQuestion.stream().map(FoodRanges.Item::nutrients).toList()),
                FoodRanges.question(forQuestion, p).map(food -> new AmountQuestion(food, GRAMS_QUESTION)));
    }

    /** The engine's parameters; the food ones have one value for both sexes (the profile's sex when there is one). */
    Parameters parametersFor(AccountId account) {
        return parameters.forSex(profiles.of(account).map(facts -> Sex.valueOf(facts.sex().name())).orElse(Sex.MALE));
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

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
