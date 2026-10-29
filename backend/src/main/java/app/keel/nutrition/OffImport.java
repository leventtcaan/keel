package app.keel.nutrition;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Reading the Open Food Facts Turkey subset (K-1042, ADR-088; ODbL): the JSONL deploy/off_filter.py writes, one product a
 * line — {@code code, name, brand, kcal, protein, carbs, fat} per 100 g and, when the label gives a portion,
 * {@code serving_g} and {@code serving}. The filter has already dropped what is not Turkish or lacks a name or a
 * nutrient; this reads the line again for what the database needs, and a line that is not a usable product is skipped and
 * counted, never guessed:
 *
 * <ul>
 *   <li>The code: 8 to 14 digits (GTIN-8 … GTIN-14), stored left-padded to 14 as nutrition.food.gtin; the food's id is
 *       {@code off:<code>}. The first line of a code wins, and so does the first of two codes that pad to one barcode;
 *       a barcode another food already holds is skipped (the column is unique).</li>
 *   <li>The name as given (trimmed), the brand or none.</li>
 *   <li>The four nutrients: numbers, not negative, kept to the columns' two decimals and within what the columns hold.</li>
 *   <li>The serving: only with a positive weight in grams, named "1 serving (&lt;the label's text, else the grams&gt;)".</li>
 * </ul>
 */
final class OffImport {

    record Serving(String name, BigDecimal grams) {
    }

    /** {@code serving} is null when the label gives no portion weight. */
    record Food(String id, String name, String brand, String gtin, BigDecimal kcal, BigDecimal proteinG, BigDecimal carbsG, BigDecimal fatG,
            Serving serving) {
    }

    record Read(List<Food> foods, int skipped) {
    }

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final int GTIN_LENGTH = 14;
    private static final int DECIMALS = 2;
    // What nutrition.food and food_serving hold (V9): numeric(7,2) for kcal and grams, numeric(6,2) for the grams of a nutrient.
    private static final int KCAL_INTEGER_DIGITS = 5;
    private static final int NUTRIENT_INTEGER_DIGITS = 4;
    private static final int SERVING_INTEGER_DIGITS = 5;

    private OffImport() {
    }

    /** Every usable product of the file; {@code heldElsewhere} are the barcodes other foods (not Open Food Facts) already have. */
    static Read read(Path file, Set<String> heldElsewhere) {
        List<Food> foods = new ArrayList<>();
        Set<String> taken = new HashSet<>(heldElsewhere);
        Set<String> ids = new HashSet<>();
        int skipped = 0;
        try (Stream<String> lines = Files.lines(file, StandardCharsets.UTF_8)) {
            for (String line : (Iterable<String>) lines::iterator) {
                if (line.isBlank()) {
                    continue;
                }
                Optional<Food> food = parse(line);
                if (food.isEmpty() || !ids.add(food.get().id()) || !taken.add(food.get().gtin())) {
                    skipped++;
                } else {
                    foods.add(food.get());
                }
            }
        } catch (IOException unreadable) {
            throw new UncheckedIOException("Cannot read " + file, unreadable);
        }
        return new Read(foods, skipped);
    }

    static Optional<Food> parse(String line) {
        JsonNode product;
        try {
            product = JSON.readTree(line);
        } catch (JacksonException notJson) {
            return Optional.empty();
        }
        if (product == null || !product.isObject()) {
            return Optional.empty();
        }
        String code = text(product, "code");
        String name = text(product, "name");
        BigDecimal kcal = amount(product, "kcal", KCAL_INTEGER_DIGITS);
        BigDecimal protein = amount(product, "protein", NUTRIENT_INTEGER_DIGITS);
        BigDecimal carbs = amount(product, "carbs", NUTRIENT_INTEGER_DIGITS);
        BigDecimal fat = amount(product, "fat", NUTRIENT_INTEGER_DIGITS);
        if (code == null || !code.matches("[0-9]{8,14}") || name == null || kcal == null || protein == null || carbs == null || fat == null) {
            return Optional.empty();
        }
        return Optional.of(new Food("off:" + code, name, text(product, "brand"), "0".repeat(GTIN_LENGTH - code.length()) + code, kcal, protein, carbs,
                fat, serving(product)));
    }

    private static Serving serving(JsonNode product) {
        BigDecimal grams = amount(product, "serving_g", SERVING_INTEGER_DIGITS);
        if (grams == null || grams.signum() <= 0) {
            return null;
        }
        String label = text(product, "serving");
        return new Serving("1 serving (" + (label != null ? label : grams.stripTrailingZeros().toPlainString() + " g") + ")", grams);
    }

    /** A string field, trimmed; null when absent, not a string or blank. */
    private static String text(JsonNode product, String field) {
        JsonNode node = product.get(field);
        if (node == null || !node.isString() || node.asString().isBlank()) {
            return null;
        }
        return node.asString().strip();
    }

    /** A number field not below zero, at two decimals, that fits {@code integerDigits} before the point; null otherwise. */
    private static BigDecimal amount(JsonNode product, String field, int integerDigits) {
        JsonNode node = product.get(field);
        if (node == null || !node.isNumber() || node.decimalValue().signum() < 0) {
            return null;
        }
        BigDecimal value = node.decimalValue().setScale(DECIMALS, RoundingMode.HALF_UP);
        return value.precision() - value.scale() > integerDigits ? null : value;
    }
}
