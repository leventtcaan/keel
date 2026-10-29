package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * What the day can still hold (K-507, Ö-17): the foods the user eats — their own meals — each in the amount they usually
 * have; the most eaten first, then the most recent; never a food they cannot eat; and only what fits what is likely left
 * (the range's middle) even at its high end (U5). No word of making up for anything (U7): a day with nothing left offers nothing.
 */
class MealSuggestionsTests {

    private static final Instant NOW = Instant.parse("2026-10-03T12:00:00Z");

    private static FoodEstimator.EstimatedItem item(String id, String name, String quantity, String unit) {
        // Logged as weighed: what is suggested is an amount to eat again — estimated, never "weighed" (that was the last time).
        FoodRanges.Range any = new FoodRanges.Range(100, 120);
        return new FoodEstimator.EstimatedItem(id, name, new FoodEstimator.Amount(new BigDecimal(quantity), unit, FoodEstimator.AmountCertainty.WEIGHED),
                any, any, any, any);
    }

    private static MealStore.Meal meal(int daysAgo, FoodEstimator.EstimatedItem... items) {
        Instant at = NOW.minusSeconds(daysAgo * 86_400L);
        return new MealStore.Meal(UUID.randomUUID(), UUID.randomUUID(), at, LocalDate.ofInstant(at, java.time.ZoneOffset.UTC), MealStore.Slot.LUNCH,
                List.of(items));
    }

    @Test
    void theMostEatenFirstThenTheMostRecentEachInItsUsualAmount() {
        List<MealSuggestions.Usual> usual = MealSuggestions.usual(List.of(
                meal(9, item("rice", "Rice, white, cooked", "150", "g"), item("egg", "Egg, whole", "2", "piece")),
                meal(5, item("rice", "Rice, white, cooked", "200", "g")),
                meal(3, item("rice", "Rice, white, cooked", "150", "g"), item("yogurt", "Yogurt, greek", "1", "cup")),
                meal(1, item("egg", "Egg, whole", "2", "piece"))), List.of(), id -> List.of());

        assertThat(usual).extracting(MealSuggestions.Usual::foodId).containsExactly("rice", "egg", "yogurt");
        assertThat(usual.getFirst().amount().quantity()).isEqualByComparingTo("150");
        assertThat(usual.getFirst().amount().unit()).isEqualTo("g");
        assertThat(usual.getFirst().amount().certainty()).isEqualTo(FoodEstimator.AmountCertainty.ESTIMATED);
    }

    @Test
    void aTieInAmountsGoesToTheMostRecent() {
        List<MealSuggestions.Usual> usual = MealSuggestions.usual(List.of(
                meal(6, item("oats", "Oats", "1", "cup")), meal(2, item("oats", "Oats", "80", "g"))), List.of(), id -> List.of());
        assertThat(usual.getFirst().amount().unit()).isEqualTo("g");
    }

    @Test
    void aFoodTheUserCannotEatIsNeverOfferedByAnyPartOfItsName() {
        // An allergy reads wide: "nut" leaves out walnuts and peanut butter; a case or a plural changes nothing.
        List<MealSuggestions.Usual> usual = MealSuggestions.usual(List.of(meal(1, item("pb", "Peanut butter, smooth", "2", "tablespoon"),
                item("walnut", "Walnuts, chopped", "30", "g"), item("peas", "Peas, green", "80", "g"), item("milk", "Milk, whole", "200", "ml"))),
                List.of("nut", "MILK", " "), id -> List.of());
        assertThat(usual).extracting(MealSuggestions.Usual::foodId).containsExactly("peas");
    }

    @Test
    void aRecipeHoldingAFoodTheUserCannotEatIsNeverOfferedEither() {
        // K-507 review: "Morning bowl" is its ingredients too.
        List<MealSuggestions.Usual> usual = MealSuggestions.usual(List.of(meal(1, item("recipe:1", "Morning bowl", "1", "portion"),
                item("rice", "Rice, white, cooked", "150", "g"))), List.of("nut"),
                id -> id.equals("recipe:1") ? List.of("Oats, rolled", "Walnuts, chopped") : List.of());
        assertThat(usual).extracting(MealSuggestions.Usual::foodId).containsExactly("rice");
    }

    // ── recent foods (K-1025) ───────────────────────────────────────────────────────────────────────────────

    private static MealStore.Meal meal(int daysAgo, MealStore.Slot slot, FoodEstimator.EstimatedItem... items) {
        MealStore.Meal at = meal(daysAgo, items);
        return new MealStore.Meal(at.id(), at.clientId(), at.eatenAt(), at.day(), slot, at.items());
    }

    private static List<String> ids(List<MealSuggestions.Recent> recent) {
        return recent.stream().map(MealSuggestions.Recent::foodId).toList();
    }

    @Test
    void theRecentFoodsAreEachOnceFreshestFirstInTheAmountOfTheirLastTime() {
        List<MealSuggestions.Recent> recent = MealSuggestions.recent(List.of(
                meal(9, item("rice", "Rice, white, cooked", "150", "g"), item("egg", "Egg, whole", "2", "piece")),
                meal(5, item("rice", "Rice, white, cooked", "200", "g")),
                meal(3, item("yogurt", "Yogurt, greek", "1", "cup")),
                meal(1, item("egg", "Egg, whole", "3", "piece"))), Optional.empty(), List.of(), id -> List.of());

        assertThat(ids(recent)).containsExactly("egg", "yogurt", "rice");
        assertThat(recent.getFirst().amount().quantity()).as("the last time, not the usual one").isEqualByComparingTo("3");
        assertThat(recent.get(2).amount().quantity()).isEqualByComparingTo("200");
        assertThat(recent.getFirst().amount().certainty()).as("an amount to eat again is an estimate").isEqualTo(FoodEstimator.AmountCertainty.ESTIMATED);
        assertThat(recent.getFirst().last()).isEqualTo(NOW.minusSeconds(86_400));
    }

    @Test
    void theMealsComeInAnyOrder() {
        List<MealSuggestions.Recent> recent = MealSuggestions.recent(List.of(meal(1, item("a", "A", "1", "g")), meal(7, item("b", "B", "1", "g")),
                meal(3, item("c", "C", "1", "g"))), Optional.empty(), List.of(), id -> List.of());

        assertThat(ids(recent)).containsExactly("a", "c", "b");
    }

    @Test
    void withASlotTheFoodsLastHadThereComeFirstThenTheRestByFreshness() {
        List<MealSuggestions.Recent> recent = MealSuggestions.recent(List.of(
                meal(1, MealStore.Slot.DINNER, item("fish", "Fish", "150", "g")),
                meal(2, MealStore.Slot.BREAKFAST, item("oats", "Oats", "60", "g")),
                meal(4, MealStore.Slot.LUNCH, item("rice", "Rice", "150", "g")),
                meal(6, MealStore.Slot.BREAKFAST, item("egg", "Egg", "2", "piece"))), Optional.of(MealStore.Slot.BREAKFAST), List.of(), id -> List.of());

        // Breakfast foods first (oats 2 days ago, egg 6), then dinner and lunch by when they were last had.
        assertThat(ids(recent)).containsExactly("oats", "egg", "fish", "rice");
    }

    @Test
    void aFoodHadInTheSlotIsOfferedInTheAmountOfItsLastTimeThereNotElsewhere() {
        List<MealSuggestions.Recent> recent = MealSuggestions.recent(List.of(
                meal(1, MealStore.Slot.DINNER, item("yogurt", "Yogurt", "300", "g")),
                meal(3, MealStore.Slot.BREAKFAST, item("yogurt", "Yogurt", "100", "g"))), Optional.of(MealStore.Slot.BREAKFAST), List.of(), id -> List.of());

        assertThat(recent).singleElement().satisfies(one -> {
            assertThat(one.amount().quantity()).isEqualByComparingTo("100");
            assertThat(one.last()).isEqualTo(NOW.minusSeconds(3 * 86_400L));
        });
        // Without a slot the same food is the dinner's, 300 g, a day ago.
        assertThat(MealSuggestions.recent(List.of(meal(1, MealStore.Slot.DINNER, item("yogurt", "Yogurt", "300", "g")),
                meal(3, MealStore.Slot.BREAKFAST, item("yogurt", "Yogurt", "100", "g"))), Optional.empty(), List.of(), id -> List.of())
                .getFirst().amount().quantity()).isEqualByComparingTo("300");
    }

    @Test
    void aSlotNobodyHasEatenInIsTheRecentFoodsAsWithoutOne() {
        List<MealStore.Meal> meals = List.of(meal(1, MealStore.Slot.LUNCH, item("rice", "Rice", "150", "g")), meal(2, MealStore.Slot.DINNER, item("fish", "Fish", "150", "g")));

        assertThat(ids(MealSuggestions.recent(meals, Optional.of(MealStore.Slot.SNACK), List.of(), id -> List.of()))).containsExactly("rice", "fish");
    }

    @Test
    void theUsualFoodsOfASlotCountOnlyTheMealsHadThereAndASlotNobodyAteInHasNone() {
        List<MealStore.Meal> meals = List.of(
                meal(1, MealStore.Slot.BREAKFAST, item("oats", "Oats", "50", "g")),
                meal(2, MealStore.Slot.BREAKFAST, item("oats", "Oats", "50", "g"), item("egg", "Egg", "2", "piece")),
                meal(3, MealStore.Slot.DINNER, item("rice", "Rice", "150", "g"), item("egg", "Egg", "3", "piece")),
                meal(4, MealStore.Slot.DINNER, item("rice", "Rice", "150", "g")));

        List<MealSuggestions.Usual> breakfast = MealSuggestions.usual(meals, Optional.of(MealStore.Slot.BREAKFAST), List.of(), id -> List.of());

        assertThat(breakfast).extracting(MealSuggestions.Usual::foodId).as("only what was had at breakfast, the most often first").containsExactly("oats", "egg");
        assertThat(breakfast.get(1).amount().quantity()).as("the egg's amount at breakfast, not the dinner's 3").isEqualByComparingTo("2");
        assertThat(MealSuggestions.usual(meals, Optional.of(MealStore.Slot.SNACK), List.of(), id -> List.of())).isEmpty();
        assertThat(MealSuggestions.usual(meals, Optional.empty(), List.of(), id -> List.of())).hasSize(3);
    }

    @Test
    void noMealsIsNoRecentFoods() {
        assertThat(MealSuggestions.recent(List.of(), Optional.of(MealStore.Slot.LUNCH), List.of(), id -> List.of())).isEmpty();
    }

    @Test
    void recentFoodsNeverHoldOneTheUserCannotEatOrARecipeWithIt() {
        List<MealSuggestions.Recent> recent = MealSuggestions.recent(List.of(meal(1, item("pb", "Peanut butter", "2", "tablespoon"),
                item("recipe:1", "Morning bowl", "1", "portion"), item("peas", "Peas, green", "80", "g"))), Optional.empty(), List.of("NUT"),
                id -> id.equals("recipe:1") ? List.of("Walnuts, chopped") : List.of());

        assertThat(ids(recent)).containsExactly("peas");
    }

    @Test
    void aQuickAddIsNeverOfferedAgainAsRecentOrUsual() {
        // K-1063: a quick add has no food behind it; offering it would only fail when it is estimated again.
        List<MealStore.Meal> meals = List.of(meal(1, item("quick", "Quick add", "1", "serving"), item("rice", "Rice", "100", "g")));

        assertThat(ids(MealSuggestions.recent(meals, Optional.empty(), List.of(), id -> List.of()))).containsExactly("rice");
        assertThat(MealSuggestions.usual(meals, List.of(), id -> List.of())).extracting(MealSuggestions.Usual::foodId).containsExactly("rice");
    }

    @Test
    void withNothingToAvoidNoRecipeIsLookedInto() {
        java.util.function.Function<String, List<String>> never = id -> {
            throw new AssertionError("a recipe's ingredients were read for a list that excludes nothing: " + id);
        };
        MealStore.Meal meals = meal(1, item("recipe:1", "Morning bowl", "1", "portion"));

        assertThat(ids(MealSuggestions.recent(List.of(meals), Optional.empty(), List.of(), never))).containsExactly("recipe:1");
        assertThat(ids(MealSuggestions.recent(List.of(meals), Optional.empty(), List.of(" ", ""), never))).containsExactly("recipe:1");
    }

    @Test
    void aFoodTwiceInOneMealIsOfferedInTheAmountOfTheLastItem() {
        List<MealSuggestions.Recent> recent = MealSuggestions.recent(List.of(meal(1, item("rice", "Rice", "100", "g"), item("rice", "Rice", "150", "g"))),
                Optional.empty(), List.of(), id -> List.of());

        assertThat(recent).singleElement().satisfies(one -> assertThat(one.amount().quantity()).isEqualByComparingTo("150"));
    }

    @Test
    void itFitsWhatIsLikelyLeftEvenAtItsHighEnd() {
        DayBudget.Balance left = new DayBudget.Balance(300, 500);
        assertThat(MealSuggestions.fits(new FoodRanges.Range(350, 400), left)).isTrue();
        assertThat(MealSuggestions.fits(new FoodRanges.Range(350, 401), left)).isFalse();
        assertThat(MealSuggestions.fits(new FoodRanges.Range(10, 20), new DayBudget.Balance(-200, 30))).isFalse();
        assertThat(MealSuggestions.fits(new FoodRanges.Range(0, 0), new DayBudget.Balance(-50, 0))).isFalse();
    }
}
