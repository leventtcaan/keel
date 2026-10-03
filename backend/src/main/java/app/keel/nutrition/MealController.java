package app.keel.nutrition;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ApiLimits;
import app.keel.shared.ErrorCode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/meals and /v1/days/{day}/budget (K-209). A meal is stored with its ranges as estimated then, on the
 * user's local day at that moment; "same as yesterday" logs an earlier meal's items again. The budget is the day's target
 * minus the eaten range (DayBudget). Meals are health data: every route needs HEALTH_DATA consent (ADR-026).
 */
@RestController
class MealController {

    record NewMeal(UUID clientId, Instant eatenAt, MealStore.Slot slot, List<FoodEstimator.ItemRequest> items, UUID repeatOf) {
    }

    /** Contract Meal. */
    record Meal(UUID id, UUID clientId, Instant eatenAt, MealStore.Slot slot, List<FoodEstimator.EstimatedItem> items, FoodRanges.Range kcal,
            FoodRanges.Range proteinG) {
    }

    /** Contract DayBudget. */
    record Budget(LocalDate day, int targetKcal, FoodRanges.Nutrients eaten, DayBudget.Left left) {
    }

    /** Contract Suggestion: a food the user eats, in their usual amount, as the database estimates it now (U1, U5). */
    record Suggestion(String foodId, String name, FoodEstimator.Amount amount, FoodRanges.Range kcal, FoodRanges.Range proteinG) {
    }

    private final MealStore store;
    private final FoodEstimator estimator;
    private final Profiles profiles;
    private final ConsentGate consent;
    private final ObjectProvider<DailyTargets> targets;
    private final ApiLimits api;
    private final FoodController.NutritionLimits limits;

    MealController(MealStore store, FoodEstimator estimator, Profiles profiles, ConsentGate consent, ObjectProvider<DailyTargets> targets,
            ApiLimits api, FoodController.NutritionLimits limits) {
        this.limits = limits;
        this.store = store;
        this.estimator = estimator;
        this.profiles = profiles;
        this.consent = consent;
        this.targets = targets;
        this.api = api;
    }

    @PostMapping("/v1/meals")
    ResponseEntity<Meal> log(AccountId account, @RequestBody NewMeal meal) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(meal.clientId() != null && api.moment(meal.eatenAt()) && meal.slot() != null && (meal.items() == null) != (meal.repeatOf() == null));
        // A replay answers with what was stored (ADR-024), before anything is estimated or looked up again: the meal it
        // repeated may be gone, or a food row changed, since the first send (K-209 review).
        Optional<MealStore.Meal> replayed = store.findByClient(account, meal.clientId());
        if (replayed.isPresent()) {
            return ResponseEntity.ok(view(replayed.get()));
        }
        List<FoodEstimator.EstimatedItem> items = meal.items() != null
                ? estimator.estimate(account, meal.items()).items()
                // "Same as yesterday": the earlier meal's items as they were logged — only the user's own meals.
                : store.find(account, meal.repeatOf()).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND)).items();
        LocalDate day = meal.eatenAt().atZone(zoneOf(account)).toLocalDate();
        MealStore.Stored stored = store.log(account, meal.clientId(), meal.eatenAt(), day, meal.slot(), items);
        return ResponseEntity.status(stored.created() ? HttpStatus.CREATED : HttpStatus.OK).body(view(stored.meal()));
    }

    @GetMapping("/v1/meals")
    List<Meal> day(AccountId account, @RequestParam LocalDate day) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(api.day(day));
        return store.day(account, day).stream().map(MealController::view).toList();
    }

    @DeleteMapping("/v1/meals/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(AccountId account, @PathVariable UUID id) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        if (!store.delete(account, id)) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
    }

    @GetMapping("/v1/days/{day}/budget")
    Budget budget(AccountId account, @PathVariable LocalDate day) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(api.day(day));
        return budgetOf(account, day);
    }

    /**
     * What the day can still hold (K-507, Ö-17): foods from the user's own meals of the last suggestion-days, each in its
     * usual amount, estimated from the database now (U1, U5) — never one they cannot eat — kept while it fits what is
     * likely left, the most eaten first, a few at most. A day past its target offers none, and says nothing of it (U7).
     */
    @GetMapping("/v1/days/{day}/suggestions")
    List<Suggestion> suggestions(AccountId account, @PathVariable LocalDate day) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(api.day(day));
        DayBudget.Balance left = budgetOf(account, day).left().kcal();
        List<MealStore.Meal> eaten = store.days(account, day.minusDays(limits.suggestionDays()), day);
        List<Suggestion> fitting = new java.util.ArrayList<>();
        for (MealSuggestions.Usual usual : MealSuggestions.usual(eaten, profiles.foodsAvoided(account))) {
            if (fitting.size() == limits.suggestions()) {
                break;
            }
            estimated(account, usual).filter(suggestion -> MealSuggestions.fits(suggestion.kcal(), left)).ifPresent(fitting::add);
        }
        return List.copyOf(fitting);
    }

    /** A usual amount as the database estimates it now; a food or recipe gone since (or now refused) is not offered. */
    private Optional<Suggestion> estimated(AccountId account, MealSuggestions.Usual usual) {
        try {
            FoodEstimator.EstimatedItem item = estimator.estimate(account, List.of(new FoodEstimator.ItemRequest(usual.foodId(), usual.amount())))
                    .items().getFirst();
            return Optional.of(new Suggestion(item.foodId(), item.name(), item.amount(), item.kcal(), item.proteinG()));
        } catch (ApiException gone) {
            return Optional.empty();
        }
    }

    /** The day's target minus the eaten range; no target yet (it comes from calls, K-216), no budget. */
    private Budget budgetOf(AccountId account, LocalDate day) {
        // One provider (decision); a second would be a wiring mistake, and getIfUnique does not pick one quietly.
        DailyTargets.Targets target = Optional.ofNullable(targets.getIfUnique()).flatMap(provider -> provider.forDay(account, day))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        FoodRanges.Nutrients eaten = FoodRanges.total(store.day(account, day).stream().flatMap(meal -> meal.items().stream())
                .map(FoodEstimator.EstimatedItem::nutrients).toList());
        return new Budget(day, target.kcal(), eaten, DayBudget.left(target, eaten));
    }

    private ZoneId zoneOf(AccountId account) {
        return profiles.of(account).map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
    }

    private static Meal view(MealStore.Meal meal) {
        FoodRanges.Nutrients total = FoodRanges.total(meal.items().stream().map(FoodEstimator.EstimatedItem::nutrients).toList());
        return new Meal(meal.id(), meal.clientId(), meal.eatenAt(), meal.slot(), meal.items(), total.kcal(), total.proteinG());
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
