package app.keel.coach;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * A meal the model read from the user's words (K-504, ADR-004: a reply off its schema is dropped whole): exactly
 * {@code {"items": [{"food", "quantity", "unit"}]}} — at most {@code maxItems}; a food of a few words with no digit and no
 * forbidden phrase (it is shown); a quantity above 0, to 2 decimals (the estimate takes no more, contract Amount); a unit
 * of letters. The model never turns a measure into grams (ADR-004: portions are the database's) and never says what a
 * food holds (U1): any other field drops the reply.
 */
final class MealReplyCheck {

    /** A food in the model's words, and how much in the user's measure. */
    record Item(String food, BigDecimal quantity, String unit) {
    }

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Set<String> ITEM_FIELDS = Set.of("food", "quantity", "unit");
    private static final Pattern DIGIT = Pattern.compile("\\p{Nd}");
    private static final Pattern UNIT = Pattern.compile("[\\p{L} ]{1,30}");

    private final int maxItems;
    private final BigDecimal maxQuantity;
    private final int maxFoodChars;
    private final ForbiddenWords forbidden;

    MealReplyCheck(int maxItems, BigDecimal maxQuantity, int maxFoodChars, ForbiddenWords forbidden) {
        this.maxItems = maxItems;
        this.maxQuantity = maxQuantity;
        this.maxFoodChars = maxFoodChars;
        this.forbidden = forbidden;
    }

    Optional<List<Item>> read(String raw) {
        Object parsed;
        try {
            parsed = JSON.readValue(raw, Object.class);
        } catch (JacksonException notJson) {
            return Optional.empty();
        }
        if (!(parsed instanceof Map<?, ?> reply) || reply.size() != 1 || !(reply.get("items") instanceof List<?> items) || items.size() > maxItems) {
            return Optional.empty();
        }
        List<Item> read = new ArrayList<>();
        for (Object entry : items) {
            if (!(entry instanceof Map<?, ?> item) || !item.keySet().equals(ITEM_FIELDS) || !(item.get("food") instanceof String food)
                    || !(item.get("quantity") instanceof Number number) || !(item.get("unit") instanceof String unit)) {
                return Optional.empty();
            }
            String words = Words.normalize(food).strip();
            String measure = Words.normalize(unit).strip().toLowerCase(java.util.Locale.ROOT);
            if (words.isEmpty() || words.length() > maxFoodChars || DIGIT.matcher(words).find() || !forbidden.found(words).isEmpty()
                    || !UNIT.matcher(measure).matches()) {
                return Optional.empty();
            }
            BigDecimal quantity;
            try {
                quantity = new BigDecimal(number.toString()).setScale(2, RoundingMode.HALF_UP);
            } catch (NumberFormatException notFinite) {
                return Optional.empty();
            }
            if (quantity.signum() <= 0 || quantity.compareTo(maxQuantity) > 0) {
                return Optional.empty();
            }
            read.add(new Item(words, plain(quantity), measure));
        }
        return Optional.of(List.copyOf(read));
    }

    /** One way to write a quantity, so equal ones are equal: 50, not 5E+1; 0.5, not 0.50. */
    static BigDecimal plain(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
    }
}
