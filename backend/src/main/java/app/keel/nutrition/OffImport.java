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
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Stream;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Reading an Open Food Facts subset (K-1042, K-1061, ADR-088; ODbL): the JSONL deploy/off_filter.py writes for a region, one
 * product a line — {@code code, name, brand, kcal, protein, carbs, fat} per 100 g and, when the label gives a portion,
 * {@code serving_g} and {@code serving}, and the {@code region} the product was kept for. The filter has already dropped what
 * is not of the region or lacks a name or a nutrient; this reads the line again for what the database needs, and a line that
 * is not a usable product is skipped and counted, never guessed. The file is read line by line (the US subset is hundreds of
 * thousands of products):
 *
 * <ul>
 *   <li>The region ("TR", "US"): the file's, given by the importer; a line that says another region is skipped (the
 *       Turkey file would not take US products in). A line with no region is the file's.</li>
 *   <li>The code: 8 to 14 digits (GTIN-8 … GTIN-14), stored left-padded to 14 as nutrition.food.gtin; the food's id is
 *       {@code off:<code>} for Turkey (as since K-1042, meals hold it) and {@code off-<region>:<code>} for another region.
 *       The first line of a code wins, and so does the first of two codes that pad to one barcode; a barcode another
 *       dataset's food already holds is skipped by the importer (USDA's label is preferred).</li>
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

    /** Turkey: the first region, whose ids carry no region ({@code off:<code>}) and whose release record is called "OFF". */
    static final String TURKEY = "TR";

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final int GTIN_LENGTH = 14;
    private static final int DECIMALS = 2;
    // What nutrition.food and food_serving hold (V9): numeric(7,2) for kcal and grams, numeric(6,2) for the grams of a nutrient.
    private static final int KCAL_INTEGER_DIGITS = 5;
    private static final int NUTRIENT_INTEGER_DIGITS = 4;
    private static final int SERVING_INTEGER_DIGITS = 5;

    private OffImport() {
    }

    /**
     * Every usable product of the file as Turkey's; {@code heldElsewhere} are the barcodes other foods (not Open Food Facts)
     * already have. The whole file in a list: for a small file; the importer streams.
     */
    static Read read(Path file, Set<String> heldElsewhere) {
        List<Food> foods = new ArrayList<>();
        Set<String> taken = new HashSet<>(heldElsewhere);
        int[] held = new int[1];
        int skipped = stream(file, TURKEY, food -> {
            if (taken.add(food.gtin())) {
                foods.add(food);
            } else {
                held[0]++;
            }
        });
        return new Read(foods, skipped + held[0]);
    }

    /**
     * Calls {@code sink} with each usable product of the file, in file order, for this region; returns how many lines were
     * skipped (a repeat of a barcode, an unusable line, a line of another region). A blank line is nothing.
     */
    static int stream(Path file, String region, Consumer<Food> sink) {
        Set<Long> barcodes = new HashSet<>();
        int skipped = 0;
        try (Stream<String> lines = Files.lines(file, StandardCharsets.UTF_8)) {
            for (String line : (Iterable<String>) lines::iterator) {
                if (line.isBlank()) {
                    continue;
                }
                Optional<Food> food = parse(line, region);
                if (food.isEmpty() || !barcodes.add(Long.parseLong(food.get().gtin()))) {
                    skipped++;
                } else {
                    sink.accept(food.get());
                }
            }
        } catch (IOException unreadable) {
            throw new UncheckedIOException("Cannot read " + file, unreadable);
        }
        return skipped;
    }

    /** A line as a Turkey product; see {@link #parse(String, String)}. */
    static Optional<Food> parse(String line) {
        return parse(line, TURKEY);
    }

    /** The id a product of this code has in this region. */
    static String id(String region, String code) {
        return TURKEY.equals(region) ? "off:" + code : "off-" + region.toLowerCase(Locale.ROOT) + ":" + code;
    }

    /** One line as a product of this region; empty when it is not a usable product or says it is of another region. */
    static Optional<Food> parse(String line, String region) {
        JsonNode product;
        try {
            product = JSON.readTree(line);
        } catch (JacksonException notJson) {
            return Optional.empty();
        }
        if (product == null || !product.isObject()) {
            return Optional.empty();
        }
        String lineRegion = text(product, "region");
        if (lineRegion != null && !lineRegion.equalsIgnoreCase(region)) {
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
        return Optional.of(new Food(id(region, code), name, text(product, "brand"), "0".repeat(GTIN_LENGTH - code.length()) + code, kcal, protein,
                carbs, fat, serving(product)));
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
