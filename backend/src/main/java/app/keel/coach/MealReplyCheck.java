package app.keel.coach;

import app.keel.shared.Decimals;
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
 * food holds (U1): any other field drops the reply. A meal photo's reply (K-514, {@link #grams}) is the same with the
 * amount in grams by eye only.
 */
final class MealReplyCheck {

    /** A food in the model's words, and how much in the user's measure. */
    record Item(String food, BigDecimal quantity, String unit) {
    }

    /** The one unit a photo reply may have (K-514, ADR-046): grams by eye — a serving seen would read as measured. */
    static final Set<String> PHOTO_UNITS = Set.of("g");

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Set<String> ITEM_FIELDS = Set.of("food", "quantity", "unit");
    private static final Pattern DIGIT = Pattern.compile("\\p{Nd}");
    private static final Pattern UNIT = Pattern.compile("[\\p{L} ]{1,30}");

    private final int maxItems;
    private final BigDecimal maxQuantity;
    private final int maxFoodChars;
    private final ForbiddenWords forbidden;
    private final Optional<Set<String>> units;

    /** A meal in words: the unit is the user's own measure word. */
    MealReplyCheck(int maxItems, BigDecimal maxQuantity, int maxFoodChars, ForbiddenWords forbidden) {
        this(maxItems, maxQuantity, maxFoodChars, forbidden, Optional.empty());
    }

    private MealReplyCheck(int maxItems, BigDecimal maxQuantity, int maxFoodChars, ForbiddenWords forbidden, Optional<Set<String>> units) {
        this.maxItems = maxItems;
        this.maxQuantity = maxQuantity;
        this.maxFoodChars = maxFoodChars;
        this.forbidden = forbidden;
        this.units = units;
    }

    /** A meal photo (K-514): the same reply, the amount in grams by eye only. */
    static MealReplyCheck grams(int maxItems, BigDecimal maxQuantity, int maxFoodChars, ForbiddenWords forbidden) {
        return new MealReplyCheck(maxItems, maxQuantity, maxFoodChars, forbidden, Optional.of(PHOTO_UNITS));
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
                    || !UNIT.matcher(measure).matches() || units.filter(allowed -> !allowed.contains(measure)).isPresent()) {
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
            read.add(new Item(words, Decimals.plain(quantity), measure));
        }
        return Optional.of(List.copyOf(read));
    }

}
