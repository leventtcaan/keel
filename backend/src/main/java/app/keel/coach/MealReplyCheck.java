package app.keel.coach;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * A meal the model read from the user's words (K-504, ADR-004: a reply off its schema is dropped whole): exactly
 * {@code {"items": [{"food": …, "grams": …}]}} — one to {@code maxItems} items, a food of a few words, grams above 0 and at
 * most {@code maxGrams}. Nothing else, above all nothing of what a food holds (U1: the database's).
 */
final class MealReplyCheck {

    /** A food in the model's words, and how much. */
    record Item(String food, BigDecimal grams) {
    }

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Set<String> ITEM_FIELDS = Set.of("food", "grams");

    private final int maxItems;
    private final BigDecimal maxGrams;
    private final int maxFoodChars;

    MealReplyCheck(int maxItems, BigDecimal maxGrams, int maxFoodChars) {
        this.maxItems = maxItems;
        this.maxGrams = maxGrams;
        this.maxFoodChars = maxFoodChars;
    }

    Optional<List<Item>> read(String raw) {
        Object parsed;
        try {
            parsed = JSON.readValue(raw, Object.class);
        } catch (JacksonException notJson) {
            return Optional.empty();
        }
        if (!(parsed instanceof Map<?, ?> reply) || reply.size() != 1 || !(reply.get("items") instanceof List<?> items) || items.isEmpty()
                || items.size() > maxItems) {
            return Optional.empty();
        }
        List<Item> read = new ArrayList<>();
        for (Object entry : items) {
            if (!(entry instanceof Map<?, ?> item) || !item.keySet().equals(ITEM_FIELDS) || !(item.get("food") instanceof String food)
                    || food.isBlank() || food.length() > maxFoodChars || !(item.get("grams") instanceof Number number)) {
                return Optional.empty();
            }
            BigDecimal grams = new BigDecimal(number.toString());
            if (grams.signum() <= 0 || grams.compareTo(maxGrams) > 0) {
                return Optional.empty();
            }
            read.add(new Item(food.trim(), CallNumbers.plain(grams)));
        }
        return Optional.of(List.copyOf(read));
    }
}
