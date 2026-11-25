package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** The curated Turkish dishes (K-1213): recipes of USDA ingredients, worked out into one row each; no database needed. */
class TurkishDishesTests {

    private static final FoodRanges.Per100g LENTILS = new FoodRanges.Per100g(new BigDecimal("116"), new BigDecimal("9"), new BigDecimal("20"),
            new BigDecimal("0.4"));
    private static final FoodRanges.Per100g OIL = new FoodRanges.Per100g(new BigDecimal("884"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("100"));

    private static final String ONE = """
            {"version": 1, "source": "recipe-estimate", "dishes": [
              {"id": "soup", "name": "Mercimek çorbası", "aliases": ["lentil soup"], "serving": "1 bowl", "servingG": 250,
               "ingredients": [{"food": "Lentils", "grams": 100}, {"food": "Oil", "grams": 10}]}]}""";

    @Test
    void theNutrientsAreTheIngredientsSummedAndPutPer100gOfTheDish() {
        TurkishDishes.Dish soup = TurkishDishes.read(ONE).getFirst();

        FoodRanges.Per100g per100g = TurkishDishes.per100g(soup, part -> Optional.ofNullable(Map.of("Lentils", LENTILS, "Oil", OIL).get(part.food()))).orElseThrow();

        // 100 g lentils (116 kcal) + 10 g oil (88.4 kcal) in a 250 g bowl: 204.4 kcal per 250 g, 81.76 per 100 g.
        assertThat(per100g.kcal()).isEqualByComparingTo("81.76");
        assertThat(per100g.proteinG()).isEqualByComparingTo("3.6");
        assertThat(per100g.carbsG()).isEqualByComparingTo("8");
        assertThat(per100g.fatG()).isEqualByComparingTo("4.16");
        assertThat(soup.id()).isEqualTo("tr:soup");
    }

    @Test
    void aDishWithAnIngredientTheDatabaseDoesNotHaveIsNeverGuessed() {
        TurkishDishes.Dish soup = TurkishDishes.read(ONE).getFirst();

        assertThat(TurkishDishes.per100g(soup, part -> part.food().equals("Lentils") ? Optional.of(LENTILS) : Optional.empty())).isEmpty();
    }

    @Test
    void anIngredientMayCarryItsFdcIdAndAlternativeDescriptions() {
        TurkishDishes.Dish dish = TurkishDishes.read(ONE.replace("{\"food\": \"Oil\", \"grams\": 10}",
                "{\"food\": \"Oil\", \"fdcId\": 171413, \"or\": [\"Oil, other\"], \"grams\": 10}")).getFirst();

        assertThat(dish.ingredients().get(1).fdcId()).isEqualTo(171413);
        assertThat(dish.ingredients().get(1).names()).containsExactly("Oil", "Oil, other");
        assertThat(dish.ingredients().getFirst().fdcId()).isNull();
    }

    @Test
    void aBadDishIsRefusedWhereItIsRead() {
        assertThatThrownBy(() -> TurkishDishes.read(ONE.replace("\"servingG\": 250", "\"servingG\": 0"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> TurkishDishes.read(ONE.replace("\"grams\": 100", "\"grams\": -1"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> TurkishDishes.read(ONE.replace("\"ingredients\": [", "\"ingredients\": []}, {\"ingredients\": [")))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void theShippedSeedHasAboutSixtyDishesEachWithNamesIngredientsAndASensibleWeight() {
        List<TurkishDishes.Dish> dishes = TurkishDishes.load();

        assertThat(dishes.size()).isBetween(55, 80);
        Set<String> ids = new HashSet<>();
        for (TurkishDishes.Dish dish : dishes) {
            assertThat(ids.add(dish.id())).as("one id once: " + dish.id()).isTrue();
            assertThat(dish.aliases()).as(dish.id() + " has an English name").isNotEmpty();
            assertThat(dish.ingredients().size()).as(dish.id()).isBetween(1, 15);
            BigDecimal ingredients = dish.ingredients().stream().map(TurkishDishes.Ingredient::grams).reduce(BigDecimal.ZERO, BigDecimal::add);
            // Cooking adds water (soup, rice) or drives it off (börek, kebab): the portion is within a wide band of its ingredients.
            assertThat(dish.servingG()).as(dish.id() + " portion").isBetween(ingredients.multiply(new BigDecimal("0.5")), ingredients.multiply(new BigDecimal("6")));
            assertThat(dish.servingG()).as(dish.id() + " is a portion, not a pot").isBetween(new BigDecimal("30"), new BigDecimal("600"));
        }
        assertThat(dishes).extracting(TurkishDishes.Dish::name).contains("Mercimek çorbası", "Menemen", "Kuru fasulye", "Lahmacun", "Ayran", "Sütlaç");
    }

    @Test
    void everyIngredientNamesAUsdaFoodByItsDescriptionAndNoneIsATurkishOrBrandWord() {
        Set<String> names = new HashSet<>();
        TurkishDishes.load().forEach(dish -> dish.ingredients().forEach(ingredient -> names.addAll(ingredient.names())));

        assertThat(names).isNotEmpty().allMatch(name -> name.matches("[A-Za-z0-9 ,()%./'&-]+"), "an ASCII USDA description");
        assertThat(names.size()).as("ingredients are shared between dishes, not one per dish").isLessThan(120);
    }
}
