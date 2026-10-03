package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
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

    @Test
    void itFitsWhatIsLikelyLeftEvenAtItsHighEnd() {
        DayBudget.Balance left = new DayBudget.Balance(300, 500);
        assertThat(MealSuggestions.fits(new FoodRanges.Range(350, 400), left)).isTrue();
        assertThat(MealSuggestions.fits(new FoodRanges.Range(350, 401), left)).isFalse();
        assertThat(MealSuggestions.fits(new FoodRanges.Range(10, 20), new DayBudget.Balance(-200, 30))).isFalse();
        assertThat(MealSuggestions.fits(new FoodRanges.Range(0, 0), new DayBudget.Balance(-50, 0))).isFalse();
    }
}
