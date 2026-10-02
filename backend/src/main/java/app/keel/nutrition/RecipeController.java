package app.keel.nutrition;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/recipes (K-413, ADR-034): a recipe is entered once — its ingredients and the portions it makes — and
 * logged by the portion as one item of a meal ("recipe:<id>", FoodEstimator). Only the ingredients are kept; each read
 * estimates them from the database again (U1) and answers a portion's share as ranges (U5). Health data: HEALTH_DATA.
 */
@RestController
class RecipeController {

    record NewRecipe(UUID clientId, String name, Integer portions, List<FoodEstimator.ItemRequest> items) {
    }

    /** Contract Recipe. */
    record Recipe(UUID id, UUID clientId, String name, int portions, List<FoodEstimator.EstimatedItem> items, FoodRanges.Nutrients perPortion) {
    }

    private final RecipeStore store;
    private final FoodEstimator estimator;
    private final ConsentGate consent;
    private final FoodController.NutritionLimits limits;

    RecipeController(RecipeStore store, FoodEstimator estimator, ConsentGate consent, FoodController.NutritionLimits limits) {
        this.store = store;
        this.estimator = estimator;
        this.consent = consent;
        this.limits = limits;
    }

    @PostMapping("/v1/recipes")
    ResponseEntity<Recipe> save(AccountId account, @RequestBody NewRecipe recipe) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        String name = recipe.name() == null ? "" : recipe.name().strip();
        int length = name.codePointCount(0, name.length());
        require(recipe.clientId() != null && length >= 1 && length <= limits.maxRecipeName() && name.indexOf('\u0000') < 0
                && recipe.portions() != null && recipe.portions() >= 1 && recipe.portions() <= limits.maxPortions());
        // A replay answers with what was stored (ADR-024), before the ingredients are looked up again.
        Optional<RecipeStore.Recipe> replayed = store.findByClient(account, recipe.clientId());
        if (replayed.isPresent()) {
            return ResponseEntity.ok(view(account, replayed.get()));
        }
        // The same checks as a meal's items (foods there, amounts the server takes), and no recipe in a recipe.
        estimator.ingredients(account, recipe.items());
        RecipeStore.Stored stored = store.save(account, recipe.clientId(), name, recipe.portions(), recipe.items());
        return ResponseEntity.status(stored.created() ? HttpStatus.CREATED : HttpStatus.OK).body(view(account, stored.recipe()));
    }

    @GetMapping("/v1/recipes")
    List<Recipe> all(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        return store.all(account).stream().map(recipe -> view(account, recipe)).toList();
    }

    @DeleteMapping("/v1/recipes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(AccountId account, @PathVariable UUID id) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        // Meals that logged it keep what they logged: their items were stored as estimated then (K-209).
        if (!store.delete(account, id)) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
    }

    private Recipe view(AccountId account, RecipeStore.Recipe recipe) {
        FoodEstimator.Estimate whole = estimator.ingredients(account, recipe.items());
        return new Recipe(recipe.id(), recipe.clientId(), recipe.name(), recipe.portions(), whole.items(),
                FoodRanges.share(whole.total(), BigDecimal.ONE, recipe.portions()));
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
