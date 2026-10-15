package app.keel.nutrition;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
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

    /** A food the user ate lately (K-1025): in the amount of its last time, and when. */
    record Recent(String foodId, String name, FoodEstimator.Amount amount, Instant last) {
    }

    /**
     * The foods the user ate lately, each once, freshest first (K-1025); never one they cannot eat (as {@link #usual} reads it).
     * With a slot, the foods last had in that slot come first, in the amount of that time and freshest of those, then the rest
     * by their latest time: the list is not short because of the slot.
     */
    static List<Recent> recent(List<MealStore.Meal> meals, Optional<MealStore.Slot> slot, List<String> avoid, Function<String, List<String>> alsoNamed) {
        Map<String, Boolean> left = new LinkedHashMap<>();
        Map<String, Seen> latest = new LinkedHashMap<>();
        Map<String, Seen> latestInSlot = new LinkedHashMap<>();
        // Nothing to avoid, nothing to look up: a recipe's ingredients are not read for a list that can exclude nothing.
        boolean somethingToAvoid = avoid.stream().anyMatch(word -> !word.isBlank());
        for (MealStore.Meal meal : meals) {
            for (FoodEstimator.EstimatedItem item : meal.items()) {
                boolean avoided = somethingToAvoid && left.computeIfAbsent(item.foodId(), id -> avoids(item.name(), avoid)
                        || alsoNamed.apply(id).stream().anyMatch(name -> avoids(name, avoid)));
                if (avoided) {
                    continue;
                }
                Seen seen = new Seen(item, meal.eatenAt());
                latest.merge(item.foodId(), seen, MealSuggestions::fresher);
                if (slot.isPresent() && meal.slot() == slot.get()) {
                    latestInSlot.merge(item.foodId(), seen, MealSuggestions::fresher);
                }
            }
        }
        Comparator<Seen> freshestFirst = Comparator.comparing(Seen::at, Comparator.reverseOrder()).thenComparing(seen -> seen.item().foodId());
        List<Seen> ordered = new ArrayList<>(latestInSlot.values().stream().sorted(freshestFirst).toList());
        latest.entrySet().stream().filter(food -> !latestInSlot.containsKey(food.getKey())).map(Map.Entry::getValue).sorted(freshestFirst)
                .forEach(ordered::add);
        return ordered.stream().map(seen -> new Recent(seen.item().foodId(), seen.item().name(),
                new FoodEstimator.Amount(seen.item().amount().quantity(), seen.item().amount().unit(), FoodEstimator.AmountCertainty.ESTIMATED), seen.at()))
                .toList();
    }

    /** The fresher of two times a food was had; at the same moment (a food twice in a meal), the later item: the last amount. */
    private static Seen fresher(Seen one, Seen other) {
        return other.at().isBefore(one.at()) ? one : other;
    }

    private MealSuggestions() {
    }

    /**
     * The usual foods; {@code alsoNamed} gives the other names a food goes by — a recipe's ingredients (K-507 review: a
     * recipe named "Morning bowl" holds walnuts) — each read against the list as its own name is.
     */
    static List<Usual> usual(List<MealStore.Meal> meals, List<String> avoid, Function<String, List<String>> alsoNamed) {
        Map<String, List<Seen>> byFood = new LinkedHashMap<>();
        Map<String, Boolean> left = new LinkedHashMap<>();
        for (MealStore.Meal meal : meals) {
            for (FoodEstimator.EstimatedItem item : meal.items()) {
                boolean avoided = left.computeIfAbsent(item.foodId(), id -> avoids(item.name(), avoid)
                        || alsoNamed.apply(id).stream().anyMatch(name -> avoids(name, avoid)));
                if (!avoided) {
                    byFood.computeIfAbsent(item.foodId(), id -> new ArrayList<>()).add(new Seen(item, meal.eatenAt()));
                }
            }
        }
        return byFood.values().stream().map(MealSuggestions::usual)
                .sorted(Comparator.comparingInt(Usual::times).reversed().thenComparing(Usual::last, Comparator.reverseOrder())).toList();
    }

    /** Whether a name holds any of the words the user said they cannot eat — part of a word too, any case. */
    static boolean avoids(String name, List<String> avoid) {
        return avoid.stream().filter(word -> !word.isBlank())
                .anyMatch(word -> Pattern.compile(Pattern.quote(word.strip()), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE).matcher(name).find());
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
