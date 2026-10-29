package app.keel.nutrition;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.regex.Pattern;

/**
 * Reading USDA FoodData Central's Branded Foods release (K-1061, ADR-008 and ADR-090 #1: CC0): a product's label, with its
 * barcode (gtin_upc), brand, and the serving the label gives (serving_size with its unit, and the household text, "1 Tbsp
 * (15 ml)"). The release is 2.8 GB of CSV (food_nutrient.csv alone 1.5 GB), so nothing is held but a small entry per product
 * (barcode as a number, brand, serving, four nutrient values): about 430,000 products, some 70 MB, never a file's text.
 * Three streaming passes, each file read once:
 *
 * <ol>
 *   <li>branded_food.csv: the entry of each product (barcode, brand, serving). A product on a market other than the United
 *       States is left out (market_country; blank counts as US).</li>
 *   <li>food_nutrient.csv: the entry's energy, protein, fat and carbohydrate (nutrient ids as {@link FdcImport}), per 100 g.</li>
 *   <li>food.csv: the product's description; each complete product is handed to the sink as it is read.</li>
 * </ol>
 *
 * A product missing a nutrient, with a negative one, or with one impossible per 100 g (energy over 900 kcal, a macro over 100 g)
 * is skipped and counted, never guessed. Per 100 g is FDC's label basis; for a product served in millilitres FDC's amounts are per
 * 100 mL, read here as per 100 g with a density of 1 g/mL for the serving's weight unless the household text ("1 cup") gives one
 * [doğrulanmadı: FDC's documentation says "per 100 g or mL"; the density only shifts a serving by a few per cent].
 */
final class FdcBranded {

    /** {@code serving} is null when the label gives no usable size. */
    record Food(String id, String name, String brand, String gtin, BigDecimal kcal, BigDecimal proteinG, BigDecimal carbsG, BigDecimal fatG,
            BigDecimal gramsPerMl, FdcImport.Serving serving) {
    }

    record Result(int foods, int skipped) {
    }

    private static final int GTIN_LENGTH = 14;
    private static final String UNITED_STATES = "United States";
    // More than this in 100 g is a mistyped label: nothing has more than 900 kcal (pure fat), and 100 g holds at most 100 g.
    private static final BigDecimal MAX_KCAL = new BigDecimal("900");
    private static final BigDecimal MAX_MACRO_G = new BigDecimal("100");
    private static final BigDecimal MAX_SERVING_G = new BigDecimal("5000");
    private static final int MAX_SERVING_NAME = 60;
    // A weight or volume the household text already states ("1 cup (28g)", "2 tbsp (30 mL)").
    private static final Pattern STATES_METRIC = Pattern.compile("(?i)\\(\\s*\\d[\\d.,]*\\s*(g|gm|grams?|ml|oz|fl\\.? ?oz)\\b");

    private static final class Entry {
        String brand;
        long gtin = -1;
        double servingSize;
        boolean millilitres;
        String household;
        double kcal = Double.NaN;
        double kcalAtwaterSpecific = Double.NaN;
        double kcalAtwaterGeneral = Double.NaN;
        double protein = Double.NaN;
        double fat = Double.NaN;
        double carbsByDifference = Double.NaN;
        double carbsBySummation = Double.NaN;
    }

    private FdcBranded() {
    }

    /** Reads the release in {@code folder} and calls {@code sink} with each product, in food.csv's order. */
    static Result stream(Path folder, Consumer<Food> sink) {
        requireColumns(folder.resolve("branded_food.csv"), "fdc_id", "gtin_upc", "serving_size", "serving_size_unit", "household_serving_fulltext");
        requireColumns(folder.resolve("food_nutrient.csv"), "fdc_id", "nutrient_id", "amount");
        requireColumns(folder.resolve("food.csv"), "fdc_id", "data_type", "description");
        Map<Integer, Entry> entries = new HashMap<>();
        // Brands and household texts repeat across thousands of products: one String each, not 430,000.
        Map<String, String> shared = new HashMap<>();
        Csv.forEach(folder.resolve("branded_food.csv"), row -> {
            String market = row.text("market_country");
            if (market != null && !UNITED_STATES.equalsIgnoreCase(market)) {
                return;
            }
            Entry entry = new Entry();
            String brand = row.text("brand_name") != null ? row.text("brand_name") : row.text("brand_owner");
            entry.brand = brand == null ? null : shared.computeIfAbsent(tidyCase(brand), text -> text);
            entry.gtin = gtin(row.text("gtin_upc"));
            entry.servingSize = number(row.text("serving_size"));
            String unit = row.text("serving_size_unit") == null ? "" : row.text("serving_size_unit").toLowerCase(Locale.ROOT);
            entry.millilitres = unit.equals("ml") || unit.equals("mlt");
            if (!entry.millilitres && !unit.equals("g") && !unit.equals("grm")) {
                entry.servingSize = Double.NaN;
            }
            String household = row.text("household_serving_fulltext");
            entry.household = household != null && Measures.parse(household).isPresent() ? shared.computeIfAbsent(household, text -> text) : null;
            Integer id = id(row.get("fdc_id"));
            if (id != null) {
                entries.put(id, entry);
            }
        });
        Csv.forEach(folder.resolve("food_nutrient.csv"), row -> {
            String nutrient = row.get("nutrient_id");
            if (!FdcImport.NUTRIENTS.contains(nutrient)) {
                return;
            }
            Entry entry = entries.get(id(row.get("fdc_id")));
            double amount = number(row.text("amount"));
            if (entry == null || Double.isNaN(amount)) {
                return;
            }
            switch (nutrient) {
                case FdcImport.ENERGY -> entry.kcal = amount;
                case FdcImport.ENERGY_ATWATER_SPECIFIC -> entry.kcalAtwaterSpecific = amount;
                case FdcImport.ENERGY_ATWATER_GENERAL -> entry.kcalAtwaterGeneral = amount;
                case FdcImport.PROTEIN -> entry.protein = amount;
                case FdcImport.FAT -> entry.fat = amount;
                case FdcImport.CARBS_BY_DIFFERENCE -> entry.carbsByDifference = amount;
                default -> entry.carbsBySummation = amount;
            }
        });
        int[] counts = new int[2];
        Csv.forEach(folder.resolve("food.csv"), row -> {
            if (!FdcImport.Dataset.BRANDED.dataType().equals(row.get("data_type"))) {
                return;
            }
            Entry entry = entries.get(id(row.get("fdc_id")));
            Optional<Food> food = entry == null ? Optional.empty() : food(row.get("fdc_id").strip(), row.text("description"), entry);
            if (food.isPresent()) {
                counts[0]++;
                sink.accept(food.get());
            } else {
                counts[1]++;
            }
        });
        return new Result(counts[0], counts[1]);
    }

    /** A release whose files lack a column this reads is not read at all: a changed format is an error, not an empty import. */
    private static void requireColumns(Path file, String... columns) {
        List<String> header = Csv.header(file);
        for (String column : columns) {
            if (!header.contains(column)) {
                throw new IllegalStateException(file.getFileName() + " has no column " + column);
            }
        }
    }

    private static Optional<Food> food(String id, String description, Entry entry) {
        double energy = firstNumber(entry.kcal, entry.kcalAtwaterSpecific, entry.kcalAtwaterGeneral);
        double carbs = firstNumber(entry.carbsByDifference, entry.carbsBySummation);
        if (description == null || Double.isNaN(energy) || Double.isNaN(carbs) || Double.isNaN(entry.protein) || Double.isNaN(entry.fat)) {
            return Optional.empty();
        }
        BigDecimal kcal = BigDecimal.valueOf(energy);
        BigDecimal protein = BigDecimal.valueOf(entry.protein);
        BigDecimal fat = BigDecimal.valueOf(entry.fat);
        // By difference can come out a little under zero by FDC's rounding: no carbohydrate (as FdcImport reads it).
        BigDecimal carbsG = BigDecimal.valueOf(carbs).max(BigDecimal.ZERO);
        if (kcal.signum() < 0 || protein.signum() < 0 || fat.signum() < 0 || kcal.compareTo(MAX_KCAL) > 0 || protein.compareTo(MAX_MACRO_G) > 0
                || fat.compareTo(MAX_MACRO_G) > 0 || carbsG.compareTo(MAX_MACRO_G) > 0) {
            return Optional.empty();
        }
        FdcImport.Serving serving = serving(entry);
        BigDecimal density = serving == null ? null : FdcImport.gramsPerMl(List.of(serving));
        if (density == null && serving != null && entry.millilitres) {
            density = BigDecimal.ONE.setScale(3);
        }
        return Optional.of(new Food("fdc:" + id, tidyCase(description), entry.brand, entry.gtin < 0 ? null : gtin14(entry.gtin), kcal, protein, carbsG, fat,
                density, serving));
    }

    /** The label's serving: its household text with the metric amount, else "1 serving (30 g)"; null without a usable size. */
    private static FdcImport.Serving serving(Entry entry) {
        if (Double.isNaN(entry.servingSize) || entry.servingSize <= 0) {
            return null;
        }
        BigDecimal size = BigDecimal.valueOf(entry.servingSize);
        // Millilitres are weighed as water, 1 g/mL (see the class note).
        BigDecimal grams = size;
        if (grams.compareTo(MAX_SERVING_G) > 0) {
            return null;
        }
        String metric = size.stripTrailingZeros().toPlainString() + (entry.millilitres ? " ml" : " g");
        String name = null;
        if (entry.household != null) {
            String household = entry.household.strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
            name = STATES_METRIC.matcher(household).find() ? household : household + " (" + metric + ")";
        }
        if (name == null || name.length() > MAX_SERVING_NAME) {
            name = "1 serving (" + metric + ")";
        }
        return new FdcImport.Serving(name, grams);
    }

    /** The FDC id of a row, or null for a row whose id is not a number (a damaged line is skipped, not the release). */
    private static Integer id(String text) {
        return text != null && text.strip().matches("[0-9]{1,9}") ? Integer.valueOf(text.strip()) : null;
    }

    private static double firstNumber(double... values) {
        for (double value : values) {
            if (!Double.isNaN(value)) {
                return value;
            }
        }
        return Double.NaN;
    }

    private static double number(String text) {
        if (text == null) {
            return Double.NaN;
        }
        try {
            double value = Double.parseDouble(text);
            return Double.isFinite(value) ? value : Double.NaN;
        } catch (NumberFormatException notANumber) {
            return Double.NaN;
        }
    }

    /** The barcode digits as a number (a GTIN-14 fits a long); -1 when the text is not 8 to 14 digits. */
    private static long gtin(String text) {
        return text != null && text.matches("[0-9]{8,14}") ? Long.parseLong(text) : -1;
    }

    private static String gtin14(long gtin) {
        String digits = Long.toString(gtin);
        return "0".repeat(GTIN_LENGTH - digits.length()) + digits;
    }

    /**
     * FDC writes most brands and names in capitals ("GREEK YOGURT"): shown as words ("Greek Yogurt"). A text with any lower-case
     * letter is someone's own spelling and stays as written. Words begin after a space, a hyphen, a slash, a bracket or a quote,
     * not after an apostrophe ("DAVID'S" → "David's").
     */
    static String tidyCase(String text) {
        String clean = text.strip().replaceAll("\\s+", " ");
        if (clean.chars().anyMatch(Character::isLowerCase)) {
            return clean;
        }
        StringBuilder out = new StringBuilder(clean.length());
        boolean start = true;
        for (char c : clean.toCharArray()) {
            out.append(start ? Character.toUpperCase(c) : Character.toLowerCase(c));
            start = c == ' ' || c == '-' || c == '/' || c == '(' || c == '"' || c == '&';
        }
        return out.toString();
    }
}
