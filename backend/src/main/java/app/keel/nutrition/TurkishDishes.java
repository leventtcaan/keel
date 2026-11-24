package app.keel.nutrition;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * The curated Turkish home dishes (K-1213, data/food/tr-dishes.json): each a recipe of USDA ingredients, named by their FoodData
 * Central description (public domain, ADR-008), with the grams of each in one standard portion and what that portion weighs
 * cooked. No dish's numbers are written down: they are worked out from the ingredients' own (the importer finds them by their
 * description), so a dish is only as precise as an estimate can be, and the app shows it as one (FoodRanges.Source.RECIPE).
 * TürKomp is a licensed database with no open licence and is not used (arastirma/ham/tur3-openai-turkomp-yayin-2026-11-25.md §2.1).
 *
 * <p>The id of a dish is {@code tr:<id>}; the importer owns every food of that kind.
 */
final class TurkishDishes {

    /**
     * {@code grams} of the USDA food {@code food} (its description) in one portion. {@code or} are other descriptions of the same food,
     * tried in order when the release has none called {@code food} (USDA renames a food between releases).
     */
    record Ingredient(String food, List<String> or, BigDecimal grams) {
        List<String> names() {
            List<String> names = new ArrayList<>(List.of(food));
            names.addAll(or);
            return names;
        }
    }

    /** One portion of {@code servingG} grams, called {@code serving} ("1 bowl"); {@code id} is already prefixed. */
    record Dish(String id, String name, List<String> aliases, String serving, BigDecimal servingG, List<Ingredient> ingredients) {
    }

    static final String PREFIX = "tr:";
    private static final String RESOURCE = "/data/food/tr-dishes.json";
    private static final int DECIMALS = 2;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private TurkishDishes() {
    }

    /** The dishes this build ships with. */
    static List<Dish> load() {
        try (InputStream in = TurkishDishes.class.getResourceAsStream(RESOURCE)) {
            if (in == null) {
                throw new IllegalStateException("missing " + RESOURCE);
            }
            return read(new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8));
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
    }

    /** The version of the dishes file, recorded with the import. */
    static String version(String json) {
        return JSON.readTree(json).path("version").asString("0");
    }

    /** The dishes of a file; a dish that is not one (no name, no ingredient, a weight at or below zero) is refused, never fixed. */
    static List<Dish> read(String json) {
        JsonNode dishes = JSON.readTree(json).path("dishes");
        List<Dish> read = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        for (JsonNode dish : dishes) {
            String id = dish.path("id").asString("");
            String name = dish.path("name").asString("");
            BigDecimal servingG = dish.path("servingG").isNumber() ? dish.path("servingG").decimalValue() : BigDecimal.ZERO;
            if (id.isBlank() || name.isBlank() || servingG.signum() <= 0 || !ids.add(id) || !dish.path("ingredients").isArray()
                    || dish.path("ingredients").isEmpty()) {
                throw new IllegalArgumentException("not a dish: " + (id.isBlank() ? name : id));
            }
            List<Ingredient> ingredients = new ArrayList<>();
            for (JsonNode ingredient : dish.path("ingredients")) {
                BigDecimal grams = ingredient.path("grams").isNumber() ? ingredient.path("grams").decimalValue() : BigDecimal.ZERO;
                if (ingredient.path("food").asString("").isBlank() || grams.signum() <= 0) {
                    throw new IllegalArgumentException("not an ingredient of " + id);
                }
                List<String> or = new ArrayList<>();
                ingredient.path("or").forEach(other -> or.add(other.asString()));
                ingredients.add(new Ingredient(ingredient.path("food").asString(), List.copyOf(or), grams));
            }
            List<String> aliases = new ArrayList<>();
            dish.path("aliases").forEach(alias -> aliases.add(alias.asString()));
            read.add(new Dish(PREFIX + id, name, List.copyOf(aliases), dish.path("serving").asString("1 serving"), servingG, List.copyOf(ingredients)));
        }
        return List.copyOf(read);
    }

    /**
     * What 100 g of the dish holds: the ingredients' nutrients for their grams, summed, over the portion's weight. Empty when any
     * ingredient is unknown — a dish is not worked out from some of its parts (a value missing, never guessed).
     */
    static Optional<FoodRanges.Per100g> per100g(Dish dish, Function<String, Optional<FoodRanges.Per100g>> ingredient) {
        BigDecimal kcal = BigDecimal.ZERO;
        BigDecimal protein = BigDecimal.ZERO;
        BigDecimal carbs = BigDecimal.ZERO;
        BigDecimal fat = BigDecimal.ZERO;
        for (Ingredient part : dish.ingredients()) {
            Optional<FoodRanges.Per100g> value = part.names().stream().map(ingredient).flatMap(Optional::stream).findFirst();
            if (value.isEmpty()) {
                return Optional.empty();
            }
            BigDecimal share = part.grams().divide(HUNDRED);
            kcal = kcal.add(value.get().kcal().multiply(share));
            protein = protein.add(value.get().proteinG().multiply(share));
            carbs = carbs.add(value.get().carbsG().multiply(share));
            fat = fat.add(value.get().fatG().multiply(share));
        }
        BigDecimal per100g = HUNDRED.divide(dish.servingG(), java.math.MathContext.DECIMAL64);
        return Optional.of(new FoodRanges.Per100g(scaled(kcal, per100g), scaled(protein, per100g), scaled(carbs, per100g), scaled(fat, per100g)));
    }

    private static BigDecimal scaled(BigDecimal portion, BigDecimal per100g) {
        return portion.multiply(per100g).setScale(DECIMALS, RoundingMode.HALF_UP);
    }
}
