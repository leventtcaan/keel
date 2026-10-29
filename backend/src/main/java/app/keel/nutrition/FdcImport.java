package app.keel.nutrition;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

/**
 * Reading USDA FoodData Central's CSV release (K-226, K-1061, ADR-008: CC0). Only the dataset's own foods (a Foundation release
 * also carries the lab samples behind them); values per 100 g as FDC gives them. Every file is read as a stream (Csv), keeping
 * only the rows of the dataset's foods and the nutrients below — the Branded release's nutrient file is 1.5 GB.
 *
 * <ul>
 *   <li>Energy: nutrient 1008; a food without it has the Atwater specific factors (2048), else the general ones (2047) —
 *       FDC's own calculations.</li>
 *   <li>Carbohydrate: by difference (1005), else by summation (1050); a by-difference value under zero is FDC's rounding
 *       and reads as zero. A negative energy, protein or fat is not a food.</li>
 *   <li>Protein 1003, fat 1004. A food missing any of the four is skipped and counted, never guessed.</li>
 *   <li>Servings: FDC's portions in its order, named by amount, unit and modifier ("1 large", "1 cup, chopped"; Survey/FNDDS
 *       gives the whole text in the description and a numeric code in the modifier). One without a weight or an amount
 *       (the real release has amounts of 0; "Quantity not specified" has no weight) is left out, and so is a second with
 *       the same name. Grams per millilitre from the first serving that is a volume (US customary definitions).</li>
 * </ul>
 *
 * The Branded dataset is read by {@link FdcBranded}, which also keeps the barcode, brand and label serving.
 */
final class FdcImport {

    enum Dataset {
        FOUNDATION("foundation_food", "foundation_food.csv"), SR_LEGACY("sr_legacy_food", "sr_legacy_food.csv"),
        /** The Food and Nutrient Database for Dietary Studies ("Survey"): cooked and mixed dishes with household portions. */
        FNDDS("survey_fndds_food", "survey_fndds_food.csv"),
        BRANDED("branded_food", "branded_food.csv");

        private final String dataType;
        private final String listFile;

        Dataset(String dataType, String listFile) {
            this.dataType = dataType;
            this.listFile = listFile;
        }

        /** The value of food.csv's data_type column. */
        String dataType() {
            return dataType;
        }

        /** The file only this dataset's release folder has. */
        String listFile() {
            return listFile;
        }
    }

    record Serving(String name, BigDecimal grams) {
    }

    record Food(String id, String name, Dataset source, BigDecimal kcal, BigDecimal proteinG, BigDecimal carbsG, BigDecimal fatG,
            BigDecimal gramsPerMl, List<Serving> servings) {
    }

    record Read(List<Food> foods, int skipped) {
    }

    static final String ENERGY = "1008";
    static final String ENERGY_ATWATER_SPECIFIC = "2048";
    static final String ENERGY_ATWATER_GENERAL = "2047";
    static final String PROTEIN = "1003";
    static final String FAT = "1004";
    static final String CARBS_BY_DIFFERENCE = "1005";
    static final String CARBS_BY_SUMMATION = "1050";
    static final Set<String> NUTRIENTS = Set.of(ENERGY, ENERGY_ATWATER_SPECIFIC, ENERGY_ATWATER_GENERAL, PROTEIN, FAT, CARBS_BY_DIFFERENCE,
            CARBS_BY_SUMMATION);
    // FDC's "no unit": the amount is named by the modifier alone ("1 serving").
    private static final String UNDETERMINED_UNIT = "9999";
    private static final int GRAMS_PER_ML_DECIMALS = 3;
    // numeric(5,3) holds up to 99.999; no food is a hundred times as dense as water, so more is a misread portion.
    private static final BigDecimal MAX_GRAMS_PER_ML = new BigDecimal("10");

    private FdcImport() {
    }

    static Read read(Path folder, Dataset dataset) {
        Map<String, String> names = new LinkedHashMap<>();
        Csv.forEach(folder.resolve("food.csv"), food -> {
            if (dataset.dataType.equals(food.get("data_type"))) {
                names.put(food.get("fdc_id"), food.get("description"));
            }
        });
        Map<String, String> byNumber = nutrientIdsByNumber(folder.resolve("nutrient.csv"));
        Map<String, Map<String, BigDecimal>> nutrients = new HashMap<>();
        Csv.forEach(folder.resolve("food_nutrient.csv"), row -> {
            String id = row.get("fdc_id");
            String nutrient = byNumber.getOrDefault(row.get("nutrient_id"), row.get("nutrient_id"));
            if (names.containsKey(id) && NUTRIENTS.contains(nutrient) && !row.get("amount").isBlank()) {
                nutrients.computeIfAbsent(id, key -> new HashMap<>()).put(nutrient, new BigDecimal(row.get("amount")));
            }
        });
        Map<String, String> units = new HashMap<>();
        Csv.forEach(folder.resolve("measure_unit.csv"), unit -> units.put(unit.get("id"), unit.get("name")));
        Map<String, List<Serving>> servings = servings(folder.resolve("food_portion.csv"), names.keySet(), units);
        List<Food> foods = new ArrayList<>();
        int skipped = 0;
        for (Map.Entry<String, String> food : names.entrySet()) {
            Map<String, BigDecimal> values = nutrients.getOrDefault(food.getKey(), Map.of());
            Optional<BigDecimal> kcal = first(values, ENERGY, ENERGY_ATWATER_SPECIFIC, ENERGY_ATWATER_GENERAL);
            Optional<BigDecimal> carbs = first(values, CARBS_BY_DIFFERENCE, CARBS_BY_SUMMATION);
            if (kcal.isEmpty() || carbs.isEmpty() || !values.containsKey(PROTEIN) || !values.containsKey(FAT)) {
                skipped++;
                continue;
            }
            if (kcal.get().signum() < 0 || values.get(PROTEIN).signum() < 0 || values.get(FAT).signum() < 0) {
                skipped++;
                continue;
            }
            List<Serving> own = servings.getOrDefault(food.getKey(), List.of());
            // By difference is 100 − water − protein − fat − ash: FDC's rounding leaves some meats a little under zero
            // (−0.48 g on a raw drumstick) — no carbohydrate, not a measurement to refuse (K-226 review, ADR-008).
            BigDecimal carbsG = carbs.get().max(BigDecimal.ZERO);
            foods.add(new Food("fdc:" + food.getKey(), food.getValue(), dataset, kcal.get(), values.get(PROTEIN), carbsG, values.get(FAT),
                    gramsPerMl(own), own));
        }
        return new Read(foods, skipped);
    }

    /**
     * Survey (FNDDS) names a food's nutrients by their old number (nutrient_nbr: 208 energy, 203 protein) where the other
     * datasets use FDC's id (1008, 1003); the release's nutrient.csv maps one to the other. An old number that is also an id
     * of ours is not mapped, so a dataset that already uses ids reads as before. Without the file, nothing is mapped.
     */
    private static Map<String, String> nutrientIdsByNumber(Path file) {
        Map<String, String> byNumber = new HashMap<>();
        if (!java.nio.file.Files.exists(file)) {
            return byNumber;
        }
        Csv.forEach(file, nutrient -> {
            String number = nutrient.get("nutrient_nbr");
            if (number != null && !number.isBlank() && NUTRIENTS.contains(nutrient.get("id")) && !NUTRIENTS.contains(number)) {
                byNumber.put(number, nutrient.get("id"));
            }
        });
        return byNumber;
    }

    /** Each wanted food's servings in FDC's order, named as {@link #servingName} does; those without a weight or a name are left out. */
    private static Map<String, List<Serving>> servings(Path file, Set<String> wanted, Map<String, String> units) {
        record Portion(int seq, Serving serving) {
        }
        Map<String, List<Portion>> portions = new HashMap<>();
        Csv.forEach(file, portion -> {
            String food = portion.get("fdc_id");
            if (!wanted.contains(food) || !positive(portion.get("gram_weight"))) {
                return;
            }
            servingName(portion, units).ifPresent(name -> portions.computeIfAbsent(food, key -> new ArrayList<>()).add(new Portion(
                    portion.get("seq_num") == null || portion.get("seq_num").isBlank() ? Integer.MAX_VALUE : Integer.parseInt(portion.get("seq_num")),
                    new Serving(name, new BigDecimal(portion.get("gram_weight"))))));
        });
        Map<String, List<Serving>> servings = new HashMap<>();
        portions.forEach((food, list) -> {
            Set<String> seen = new HashSet<>();
            servings.put(food, list.stream().sorted(Comparator.comparingInt(Portion::seq)).map(Portion::serving)
                    .filter(serving -> seen.add(serving.name().toLowerCase(java.util.Locale.ROOT))).toList());
        });
        return servings;
    }

    /** Grams per millilitre from the first serving that is a volume ("1 cup" of 244 g → 1.031), if it is a believable density. */
    static BigDecimal gramsPerMl(List<Serving> servings) {
        return servings.stream().flatMap(serving -> Measures.millilitres(serving.name()).stream()
                .map(ml -> serving.grams().divide(ml, MathContext.DECIMAL64).setScale(GRAMS_PER_ML_DECIMALS, RoundingMode.HALF_UP)))
                .filter(density -> density.signum() > 0 && density.compareTo(MAX_GRAMS_PER_ML) < 0).findFirst().orElse(null);
    }

    private static Optional<BigDecimal> first(Map<String, BigDecimal> values, String... ids) {
        return Stream.of(ids).map(values::get).filter(value -> value != null).findFirst();
    }

    private static boolean positive(String grams) {
        return grams != null && !grams.isBlank() && new BigDecimal(grams).signum() > 0;
    }

    /**
     * "1 cup", "1 tablespoon", "1 slice": the amount, the unit (none when undetermined), then the modifier or description.
     * Survey (FNDDS) has no amount and a numeric modifier code: its description is the whole name ("1 cup", "1 fl oz").
     * Empty for a portion with an amount that is not above zero, one with no amount and a description that does not start
     * with a number, and "Quantity not specified".
     */
    static Optional<String> servingName(Csv.Row portion, Map<String, String> units) {
        String modifier = portion.text("modifier");
        if (modifier != null && modifier.chars().allMatch(Character::isDigit)) {
            modifier = null;
        }
        String description = portion.text("portion_description");
        String extra = modifier != null ? modifier : description;
        if (extra != null && extra.toLowerCase(java.util.Locale.ROOT).startsWith("quantity not specified")) {
            return Optional.empty();
        }
        String amountText = portion.text("amount");
        if (amountText == null) {
            return extra != null && Measures.parse(extra).isPresent() ? Optional.of(tidy(extra)) : Optional.empty();
        }
        BigDecimal amount = new BigDecimal(amountText);
        if (amount.signum() <= 0) {
            return Optional.empty();
        }
        List<String> parts = new ArrayList<>();
        parts.add(amount.stripTrailingZeros().toPlainString());
        if (!UNDETERMINED_UNIT.equals(portion.get("measure_unit_id")) && units.containsKey(portion.get("measure_unit_id"))) {
            parts.add(units.get(portion.get("measure_unit_id")));
        }
        if (extra != null) {
            parts.add(extra);
        }
        return Optional.of(tidy(String.join(" ", parts)));
    }

    private static String tidy(String text) {
        return text.strip().replaceAll("\\s+", " ");
    }
}
