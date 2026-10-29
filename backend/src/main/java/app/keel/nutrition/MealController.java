package app.keel.nutrition;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ApiLimits;
import app.keel.shared.ErrorCode;
import java.time.Clock;
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
import org.springframework.web.bind.annotation.PatchMapping;
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

    /** Contract MealChange: any of the three. */
    record MealChange(List<FoodEstimator.ItemRequest> items, MealStore.Slot slot, Instant eatenAt) {
    }

    /** Contract Meal. */
    record Meal(UUID id, UUID clientId, Instant eatenAt, MealStore.Slot slot, List<FoodEstimator.EstimatedItem> items, FoodRanges.Range kcal,
            FoodRanges.Range proteinG, FoodRanges.Range carbsG, FoodRanges.Range fatG) {
    }

    /** Contract DaySummary: a day with meals, and what was eaten (ranges, U5). */
    record DaySummary(LocalDate day, int meals, FoodRanges.Nutrients eaten) {
    }

    /** Contract DayBudget. */
    record Budget(LocalDate day, int targetKcal, int targetProteinG, FoodRanges.Nutrients eaten, DayBudget.Left left) {
    }

    /** Contract Suggestion: a food the user eats, in their usual amount, as the database estimates it now (U1, U5). */
    record Suggestion(String foodId, String name, FoodEstimator.Amount amount, FoodRanges.Range kcal, FoodRanges.Range proteinG, FoodRanges.Range carbsG,
            FoodRanges.Range fatG) {
    }

    private final MealStore store;
    private final FoodEstimator estimator;
    private final Profiles profiles;
    private final ConsentGate consent;
    private final ObjectProvider<DailyTargets> targets;
    private final ApiLimits api;
    private final FoodController.NutritionLimits limits;
    private final RecipeStore recipes;
    private final Clock clock;

    MealController(MealStore store, FoodEstimator estimator, Profiles profiles, ConsentGate consent, ObjectProvider<DailyTargets> targets,
            ApiLimits api, FoodController.NutritionLimits limits, RecipeStore recipes, Clock clock) {
        this.clock = clock;
        this.limits = limits;
        this.recipes = recipes;
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

    /** One day (`day`), or a range of days (`from` to `to`, both included, at most max-meal-range-days). */
    @GetMapping("/v1/meals")
    List<Meal> day(AccountId account, @RequestParam(required = false) LocalDate day, @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        if (day != null) {
            require(from == null && to == null && api.day(day));
            return store.day(account, day).stream().map(MealController::view).toList();
        }
        requireRange(from, to);
        return store.days(account, from, to).stream().map(MealController::view).toList();
    }

    /** The days with a meal in a range, oldest first, with the day's eaten ranges: the day strip and the past days (K-1063). */
    @GetMapping("/v1/days")
    List<DaySummary> days(AccountId account, @RequestParam LocalDate from, @RequestParam LocalDate to) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        requireRange(from, to);
        java.util.Map<LocalDate, List<MealStore.Meal>> byDay = store.days(account, from, to).stream()
                .collect(java.util.stream.Collectors.groupingBy(MealStore.Meal::day, java.util.TreeMap::new, java.util.stream.Collectors.toList()));
        return byDay.entrySet().stream().map(entry -> new DaySummary(entry.getKey(), entry.getValue().size(),
                FoodRanges.total(entry.getValue().stream().flatMap(meal -> meal.items().stream()).map(FoodEstimator.EstimatedItem::nutrients).toList())))
                .toList();
    }

    private void requireRange(LocalDate from, LocalDate to) {
        require(api.range(from, to) && java.time.temporal.ChronoUnit.DAYS.between(from, to) < limits.maxMealRangeDays());
    }

    /**
     * Changes a meal in place (K-1063): its items (the whole new list, estimated now as when logging), its slot, its moment (and with it
     * its local day). Nothing is deleted and logged again: the meal keeps its id and clientId.
     */
    @PatchMapping("/v1/meals/{id}")
    Meal change(AccountId account, @PathVariable UUID id, @RequestBody MealChange change) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(change.items() != null || change.slot() != null || change.eatenAt() != null);
        require(change.eatenAt() == null || api.moment(change.eatenAt()));
        Optional<List<FoodEstimator.EstimatedItem>> items = change.items() == null ? Optional.empty()
                : Optional.of(estimator.estimate(account, change.items()).items());
        Optional<LocalDate> day = Optional.ofNullable(change.eatenAt()).map(at -> at.atZone(zoneOf(account)).toLocalDate());
        return store.update(account, id, items, Optional.ofNullable(change.slot()), Optional.ofNullable(change.eatenAt()), day)
                .map(MealController::view).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
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
        // Nothing can fit a day with nothing likely left: no estimate is made for it.
        if (!MealSuggestions.fits(new FoodRanges.Range(0, 0), left)) {
            return List.of();
        }
        List<MealStore.Meal> eaten = store.days(account, day.minusDays(limits.suggestionDays()), day);
        List<Suggestion> fitting = new java.util.ArrayList<>();
        // The most eaten few are estimated, not every food of the weeks (each estimate reads the database).
        List<MealSuggestions.Usual> usual = MealSuggestions.usual(eaten, profiles.foodsAvoided(account), id -> ingredientNames(account, id));
        for (MealSuggestions.Usual candidate : usual.subList(0, Math.min(usual.size(), limits.suggestionCandidates()))) {
            if (fitting.size() == limits.suggestions()) {
                break;
            }
            estimated(account, candidate).filter(suggestion -> MealSuggestions.fits(suggestion.kcal(), left)).ifPresent(fitting::add);
        }
        return List.copyOf(fitting);
    }

    /**
     * The foods the user ate most recently (K-1025), for the meal screen's one-tap "Recent": from the meals of the last
     * suggestion-days up to the user's today, freshest first, each in the amount of its last time, estimated from the database now
     * (U1, U5) — never one they cannot eat, a few at most. With a slot, the foods last had in it come first, then the rest.
     * Not tied to the day's target: it answers with no target, and past one (that is the day's suggestions).
     */
    @GetMapping("/v1/foods/recent")
    List<Suggestion> recent(AccountId account, @RequestParam(required = false) MealStore.Slot slot) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        LocalDate today = LocalDate.now(clock.withZone(zoneOf(account)));
        List<MealStore.Meal> eaten = store.days(account, today.minusDays(limits.suggestionDays()), today);
        List<MealSuggestions.Recent> recent = MealSuggestions.recent(eaten, Optional.ofNullable(slot), profiles.foodsAvoided(account),
                id -> ingredientNames(account, id));
        List<Suggestion> shown = new java.util.ArrayList<>();
        // The freshest suggestion-candidates are estimated, not every food of the weeks (each estimate reads the database); one gone
        // is skipped, so fewer than recent-foods come back only when some of them are gone (recent-foods <= candidates is checked at start).
        for (MealSuggestions.Recent candidate : recent.subList(0, Math.min(recent.size(), limits.suggestionCandidates()))) {
            if (shown.size() == limits.recentFoods()) {
                break;
            }
            estimated(account, candidate.foodId(), candidate.amount()).ifPresent(shown::add);
        }
        return List.copyOf(shown);
    }

    /**
     * The foods the user logs most often (K-1063): from the meals of the last suggestion-days, the most logged first, each in the amount it
     * was most often had, estimated from the database now (U1, U5) — never one they cannot eat, a few at most (recent-foods). With a slot,
     * only the meals had in that slot count ("Usually at breakfast"): a slot nobody ate in has none.
     */
    @GetMapping("/v1/foods/frequent")
    List<Suggestion> frequent(AccountId account, @RequestParam(required = false) MealStore.Slot slot) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        LocalDate today = LocalDate.now(clock.withZone(zoneOf(account)));
        List<MealStore.Meal> eaten = store.days(account, today.minusDays(limits.suggestionDays()), today);
        List<MealSuggestions.Usual> usual = MealSuggestions.usual(eaten, Optional.ofNullable(slot), profiles.foodsAvoided(account),
                id -> ingredientNames(account, id));
        List<Suggestion> shown = new java.util.ArrayList<>();
        for (MealSuggestions.Usual candidate : usual.subList(0, Math.min(usual.size(), limits.suggestionCandidates()))) {
            if (shown.size() == limits.recentFoods()) {
                break;
            }
            estimated(account, candidate).ifPresent(shown::add);
        }
        return List.copyOf(shown);
    }

    /** A recipe's ingredients by name (a food is only its own name): what a foods-to-avoid word is read against too. */
    private List<String> ingredientNames(AccountId account, String foodId) {
        if (!foodId.startsWith(FoodEstimator.RECIPE)) {
            return List.of();
        }
        try {
            return recipes.find(account, UUID.fromString(foodId.substring(FoodEstimator.RECIPE.length()))).map(recipe -> recipe.items().stream()
                    .map(item -> estimator.food(account, item.foodId()).map(FoodStore.Food::name).orElse("")).toList()).orElse(List.of());
        } catch (IllegalArgumentException notARecipeId) {
            return List.of();
        }
    }

    /** A usual amount as the database estimates it now; a food or recipe gone since (or now refused) is not offered. */
    private Optional<Suggestion> estimated(AccountId account, MealSuggestions.Usual usual) {
        return estimated(account, usual.foodId(), usual.amount());
    }

    private Optional<Suggestion> estimated(AccountId account, String foodId, FoodEstimator.Amount amount) {
        try {
            FoodEstimator.EstimatedItem item = estimator.estimate(account, List.of(new FoodEstimator.ItemRequest(foodId, amount))).items().getFirst();
            return Optional.of(new Suggestion(item.foodId(), item.name(), item.amount(), item.kcal(), item.proteinG(), item.carbsG(), item.fatG()));
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
        return new Budget(day, target.kcal(), target.proteinG(), eaten, DayBudget.left(target, eaten));
    }

    private ZoneId zoneOf(AccountId account) {
        return profiles.of(account).map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
    }

    private static Meal view(MealStore.Meal meal) {
        FoodRanges.Nutrients total = FoodRanges.total(meal.items().stream().map(FoodEstimator.EstimatedItem::nutrients).toList());
        return new Meal(meal.id(), meal.clientId(), meal.eatenAt(), meal.slot(), meal.items(), total.kcal(), total.proteinG(), total.carbsG(),
                total.fatG());
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
