package app.keel.nutrition;

import java.io.IOException;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

/**
 * Reading USDA FoodData Central's CSV release (K-226, ADR-008: CC0). Only the dataset's own foods (a Foundation release
 * also carries the lab samples behind them); values per 100 g as FDC gives them:
 *
 * <ul>
 *   <li>Energy: nutrient 1008; a Foundation food without it has the Atwater specific factors (2048), else the general
 *       ones (2047) — FDC's own calculations.</li>
 *   <li>Carbohydrate: by difference (1005), else by summation (1050); a by-difference value under zero is FDC's rounding
 *       and reads as zero. A negative energy, protein or fat is not a food.</li>
 *   <li>Protein 1003, fat 1004. A food missing any of the four is skipped and counted, never guessed.</li>
 *   <li>Servings: FDC's portions in its order, named by amount, unit and modifier; one without a weight or an amount
 *       (the real release has amounts of 0) is left out.
 *       Grams per millilitre from the first serving in a volume unit (US customary definitions).</li>
 * </ul>
 */
final class FdcImport {

    enum Dataset {
        FOUNDATION("foundation_food"), SR_LEGACY("sr_legacy_food");

        private final String dataType;

        Dataset(String dataType) {
            this.dataType = dataType;
        }
    }

    record Serving(String name, BigDecimal grams) {
    }

    record Food(String id, String name, Dataset source, BigDecimal kcal, BigDecimal proteinG, BigDecimal carbsG, BigDecimal fatG,
            BigDecimal gramsPerMl, List<Serving> servings) {
    }

    record Read(List<Food> foods, int skipped) {
    }

    private static final String ENERGY = "1008";
    private static final String ENERGY_ATWATER_SPECIFIC = "2048";
    private static final String ENERGY_ATWATER_GENERAL = "2047";
    private static final String PROTEIN = "1003";
    private static final String FAT = "1004";
    private static final String CARBS_BY_DIFFERENCE = "1005";
    private static final String CARBS_BY_SUMMATION = "1050";
    // FDC's "no unit": the amount is named by the modifier alone ("1 serving").
    private static final String UNDETERMINED_UNIT = "9999";
    // US customary volumes in millilitres (definitions, not tunable values).
    private static final Map<String, BigDecimal> MILLILITRES = Map.of("cup", new BigDecimal("236.588"), "tablespoon", new BigDecimal("14.7868"),
            "teaspoon", new BigDecimal("4.92892"), "fl oz", new BigDecimal("29.5735"), "milliliter", BigDecimal.ONE, "liter", new BigDecimal("1000"));
    private static final Map<String, String> ABBREVIATIONS = Map.of("tbsp", "tablespoon", "tsp", "teaspoon", "cups", "cup");
    private static final int GRAMS_PER_ML_DECIMALS = 3;

    private FdcImport() {
    }

    static Read read(Path folder, Dataset dataset) {
        Map<String, String> names = new LinkedHashMap<>();
        for (Map<String, String> food : rows(folder.resolve("food.csv"))) {
            if (dataset.dataType.equals(food.get("data_type"))) {
                names.put(food.get("fdc_id"), food.get("description"));
            }
        }
        Map<String, Map<String, BigDecimal>> nutrients = new HashMap<>();
        for (Map<String, String> row : rows(folder.resolve("food_nutrient.csv"))) {
            if (names.containsKey(row.get("fdc_id")) && !row.get("amount").isBlank()) {
                nutrients.computeIfAbsent(row.get("fdc_id"), id -> new HashMap<>()).put(row.get("nutrient_id"), new BigDecimal(row.get("amount")));
            }
        }
        Map<String, String> units = new HashMap<>();
        for (Map<String, String> unit : rows(folder.resolve("measure_unit.csv"))) {
            units.put(unit.get("id"), unit.get("name"));
        }
        Map<String, List<Map<String, String>>> portions = new HashMap<>();
        for (Map<String, String> portion : rows(folder.resolve("food_portion.csv"))) {
            if (names.containsKey(portion.get("fdc_id"))) {
                portions.computeIfAbsent(portion.get("fdc_id"), id -> new ArrayList<>()).add(portion);
            }
        }
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
            List<Map<String, String>> ordered = portions.getOrDefault(food.getKey(), List.of()).stream()
                    .filter(portion -> positive(portion.get("gram_weight")) && positive(portion.get("amount")))
                    .sorted(Comparator.comparing((Map<String, String> portion) -> portion.get("seq_num").isBlank() ? Integer.MAX_VALUE
                            : Integer.parseInt(portion.get("seq_num"))))
                    .toList();
            List<Serving> servings = ordered.stream().map(portion -> new Serving(servingName(portion, units), new BigDecimal(portion.get("gram_weight"))))
                    .toList();
            BigDecimal gramsPerMl = ordered.stream().filter(portion -> volume(portion, units).isPresent()).findFirst()
                    .map(portion -> new BigDecimal(portion.get("gram_weight")).divide(new BigDecimal(portion.get("amount"))
                            .multiply(volume(portion, units).orElseThrow()), MathContext.DECIMAL64)
                            .setScale(GRAMS_PER_ML_DECIMALS, RoundingMode.HALF_UP))
                    .orElse(null);
            if (kcal.get().signum() < 0 || values.get(PROTEIN).signum() < 0 || values.get(FAT).signum() < 0) {
                skipped++;
                continue;
            }
            // By difference is 100 − water − protein − fat − ash: FDC's rounding leaves some meats a little under zero
            // (−0.48 g on a raw drumstick) — no carbohydrate, not a measurement to refuse (K-226 review, ADR-008).
            BigDecimal carbsG = carbs.get().max(BigDecimal.ZERO);
            foods.add(new Food("fdc:" + food.getKey(), food.getValue(), dataset, kcal.get(), values.get(PROTEIN), carbsG, values.get(FAT), gramsPerMl,
                    servings));
        }
        return new Read(foods, skipped);
    }

    /**
     * Millilitres in one unit of the portion: its unit, or — SR Legacy's way, the "no unit" id — the modifier's first word
     * ("cup, chopped", "tbsp").
     */
    private static Optional<BigDecimal> volume(Map<String, String> portion, Map<String, String> units) {
        if (!UNDETERMINED_UNIT.equals(portion.get("measure_unit_id"))) {
            return Optional.ofNullable(MILLILITRES.get(units.getOrDefault(portion.get("measure_unit_id"), "")));
        }
        // The modifier starts with the unit, maybe two words ("fl oz"), followed by a word end: no two names can both match.
        String modifier = portion.get("modifier") == null ? "" : portion.get("modifier").toLowerCase(java.util.Locale.ROOT);
        return Stream.concat(MILLILITRES.keySet().stream(), ABBREVIATIONS.keySet().stream())
                .filter(name -> modifier.equals(name) || modifier.startsWith(name + " ") || modifier.startsWith(name + ","))
                .findFirst()
                .map(name -> MILLILITRES.get(ABBREVIATIONS.getOrDefault(name, name)));
    }

    private static Optional<BigDecimal> first(Map<String, BigDecimal> values, String... ids) {
        return Stream.of(ids).map(values::get).filter(value -> value != null).findFirst();
    }

    private static boolean positive(String grams) {
        return grams != null && !grams.isBlank() && new BigDecimal(grams).signum() > 0;
    }

    // "1 cup", "1 tablespoon", "1 slice": the amount, the unit (none when undetermined), then the modifier or description.
    private static String servingName(Map<String, String> portion, Map<String, String> units) {
        List<String> parts = new ArrayList<>();
        parts.add(new BigDecimal(portion.get("amount")).stripTrailingZeros().toPlainString());
        if (!UNDETERMINED_UNIT.equals(portion.get("measure_unit_id")) && units.containsKey(portion.get("measure_unit_id"))) {
            parts.add(units.get(portion.get("measure_unit_id")));
        }
        Stream.of(portion.get("modifier"), portion.get("portion_description")).filter(text -> text != null && !text.isBlank()).findFirst()
                .ifPresent(parts::add);
        return String.join(" ", parts);
    }

    /** Every row of an FDC CSV file as header → value (RFC 4180: quoted fields, "" inside quotes, commas and line breaks). */
    static List<Map<String, String>> rows(Path file) {
        try (Reader in = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {
            List<List<String>> records = records(in);
            List<String> header = records.getFirst();
            List<Map<String, String>> rows = new ArrayList<>();
            for (List<String> record : records.subList(1, records.size())) {
                Map<String, String> row = new HashMap<>();
                for (int i = 0; i < header.size(); i++) {
                    row.put(header.get(i), i < record.size() ? record.get(i) : "");
                }
                rows.add(row);
            }
            return rows;
        } catch (IOException unreadable) {
            throw new UncheckedIOException("Cannot read " + file, unreadable);
        }
    }

    private static List<List<String>> records(Reader in) throws IOException {
        List<List<String>> records = new ArrayList<>();
        List<String> record = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;
        int c;
        while ((c = in.read()) != -1) {
            char ch = (char) c;
            if (quoted) {
                if (ch == '"') {
                    in.mark(1);
                    int next = in.read();
                    if (next == '"') {
                        field.append('"');
                    } else {
                        quoted = false;
                        if (next != -1) {
                            in.reset();
                        }
                    }
                } else {
                    field.append(ch);
                }
            } else if (ch == '"') {
                quoted = true;
            } else if (ch == ',') {
                record.add(field.toString());
                field.setLength(0);
            } else if (ch == '\n') {
                record.add(field.toString());
                field.setLength(0);
                records.add(record);
                record = new ArrayList<>();
            } else if (ch != '\r') {
                field.append(ch);
            }
        }
        if (field.length() > 0 || !record.isEmpty()) {
            record.add(field.toString());
            records.add(record);
        }
        return records;
    }
}
