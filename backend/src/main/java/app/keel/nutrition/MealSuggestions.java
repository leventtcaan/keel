package app.keel.nutrition;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * What the day can still hold (K-507, Ö-17: not a number left — what to eat): the foods the user eats, from their own
 * meals, each in the amount they usually have — the most eaten first, then the most recent; never a food they said they
 * cannot eat: any name holding what they wrote, part of a word too ("nut" is in "Walnuts" and "Peanut butter" — an allergy
 * reads wide; leaving out an eggplant for "egg" costs a suggestion, nothing more). Pure: the meals and the list come in; the server estimates each from the
 * database (U1) and keeps those that fit.
 */
final class MealSuggestions {

    /** A food the user eats: in the amount they have most often (the latest on a tie), how many times, when last. */
    record Usual(String foodId, String name, FoodEstimator.Amount amount, int times, Instant last) {
    }

    private record Seen(FoodEstimator.EstimatedItem item, Instant at) {
    }

    private MealSuggestions() {
    }

    static List<Usual> usual(List<MealStore.Meal> meals, List<String> avoid) {
        List<Pattern> avoided = avoid.stream().filter(word -> !word.isBlank())
                .map(word -> Pattern.compile(Pattern.quote(word.strip()), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE)).toList();
        Map<String, List<Seen>> byFood = new LinkedHashMap<>();
        for (MealStore.Meal meal : meals) {
            for (FoodEstimator.EstimatedItem item : meal.items()) {
                if (avoided.stream().noneMatch(word -> word.matcher(item.name()).find())) {
                    byFood.computeIfAbsent(item.foodId(), id -> new ArrayList<>()).add(new Seen(item, meal.eatenAt()));
                }
            }
        }
        return byFood.values().stream().map(MealSuggestions::usual)
                .sorted(Comparator.comparingInt(Usual::times).reversed().thenComparing(Usual::last, Comparator.reverseOrder())).toList();
    }

    /** One food's usual amount: the quantity and unit had most often, the latest of them on a tie; always as estimated. */
    private static Usual usual(List<Seen> seen) {
        Map<String, List<Seen>> byAmount = new LinkedHashMap<>();
        for (Seen one : seen) {
            byAmount.computeIfAbsent(one.item().amount().quantity().stripTrailingZeros().toPlainString() + " "
                    + one.item().amount().unit().toLowerCase(Locale.ROOT), key -> new ArrayList<>()).add(one);
        }
        List<Seen> most = byAmount.values().stream().max(Comparator.<List<Seen>>comparingInt(List::size)
                .thenComparing(same -> same.stream().map(Seen::at).max(Comparator.naturalOrder()).orElseThrow())).orElseThrow();
        Seen latest = most.stream().max(Comparator.comparing(Seen::at)).orElseThrow();
        FoodEstimator.Amount amount = new FoodEstimator.Amount(latest.item().amount().quantity(), latest.item().amount().unit(),
                FoodEstimator.AmountCertainty.ESTIMATED);
        Instant last = seen.stream().map(Seen::at).max(Comparator.naturalOrder()).orElseThrow();
        return new Usual(latest.item().foodId(), latest.item().name(), amount, seen.size(), last);
    }

    /**
     * Whether a food fits what is likely left: even its high end within the middle of what is left (U5 — the eaten range
     * is a range too). Nothing left, nothing fits: a day past its target offers nothing, and says nothing of it (U7).
     */
    static boolean fits(FoodRanges.Range kcal, DayBudget.Balance left) {
        int likelyLeft = Math.floorDiv(left.low() + left.high(), 2);
        return likelyLeft > 0 && kcal.high() <= likelyLeft;
    }
}
