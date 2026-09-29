package app.keel.engine;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Checks parsed data/parameters files against the schema in data/parameters/README.md and turns them into
 * {@link Parameter}s. Collects every problem before failing, so one failed start shows everything to fix.
 * Problem text is built from ordered lists only, so the same files always give the same message.
 */
final class ParameterDocuments {

    private static final List<String> FIELDS = List.of("key", "value", "by_sex", "unit", "tag", "source", "note");
    private static final List<String> SEXES = List.of("male", "female");
    private static final String NO_KEY = "<no key>";

    // The YAML tags are Turkish words from the research; the code names are English (identifiers in English).
    private static final Map<String, SourceTag> TAGS = Map.of(
            "tecrube", SourceTag.EXPERIENCE,
            "literatur", SourceTag.LITERATURE,
            "urun", SourceTag.PRODUCT);
    private static final List<String> TAG_NAMES = List.of("tecrube", "literatur", "urun");

    /** A pair where the first may not exceed the second, for either sex ({@code strict}: must be below it). */
    private record Order(ParameterKey lower, ParameterKey upper, boolean strict) {
    }

    private static final List<Order> ORDERS = List.of(
            new Order(ParameterKey.PROTEIN_G_PER_KG, ParameterKey.PROTEIN_G_PER_KG_MAX, false),
            new Order(ParameterKey.PROTEIN_G_PER_KG_FEMALE_45_PLUS, ParameterKey.PROTEIN_G_PER_KG_MAX, false),
            new Order(ParameterKey.FAT_G_PER_KG_MIN, ParameterKey.FAT_G_PER_KG_MAX, false),
            new Order(ParameterKey.GAIN_RATE_IDEAL_KG_PER_MONTH, ParameterKey.GAIN_RATE_MAX_KG_PER_MONTH, false),
            new Order(ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MIN, ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MAX, false),
            new Order(ParameterKey.DELOAD_LOAD_REDUCTION_MIN, ParameterKey.DELOAD_LOAD_REDUCTION_MAX, false),
            // Phase-gate lines (U4: internal only): below the surplus line a cut ends, above the ceiling a bulk stops,
            // above the fat-first line a bulk is not even started (03 §2.1, G6 K-7, G4 K-10).
            new Order(ParameterKey.SURPLUS_BELOW_FAT_PROXY_PCT, ParameterKey.BULK_CEILING_FAT_PROXY_PCT, true),
            new Order(ParameterKey.BULK_CEILING_FAT_PROXY_PCT, ParameterKey.FAT_FIRST_FAT_PROXY_PCT, true),
            // Energy availability bands, low to adequate (J1 C6, L2.1): under LEA the deficit narrows, under the
            // warning line the app warns, under adequate is the normal fat-loss band.
            new Order(ParameterKey.LEA_THRESHOLD_KCAL_PER_KG_FFM, ParameterKey.EA_WARNING_KCAL_PER_KG_FFM, true),
            new Order(ParameterKey.EA_WARNING_KCAL_PER_KG_FFM, ParameterKey.EA_ADEQUATE_KCAL_PER_KG_FFM, true),
            new Order(ParameterKey.LEA_THRESHOLD_KCAL_PER_KG_FFM, ParameterKey.EA_ADEQUATE_KCAL_PER_KG_FFM, true));

    private static final Map<String, ParameterKey> KEYS_BY_YAML = Arrays.stream(ParameterKey.values())
            .collect(Collectors.toUnmodifiableMap(ParameterKey::yamlKey, Function.identity()));

    private static final BigInteger INT_MAX = BigInteger.valueOf(Integer.MAX_VALUE);

    private final List<String> problems = new ArrayList<>();
    private final Map<ParameterKey, Parameter> loaded = new EnumMap<>(ParameterKey.class);
    private final Set<ParameterKey> seen = new HashSet<>();

    private ParameterDocuments() {
    }

    static Map<ParameterKey, Parameter> read(Map<String, ?> documentsByFileName) {
        ParameterDocuments reader = new ParameterDocuments();
        reader.readAll(documentsByFileName);
        if (!reader.problems.isEmpty()) {
            throw new InvalidParametersException(reader.problems);
        }
        return reader.loaded;
    }

    private void readAll(Map<String, ?> documentsByFileName) {
        List<String> expectedFiles = Arrays.stream(ParameterDomain.values()).map(ParameterDomain::fileName).toList();

        documentsByFileName.keySet().stream()
                .filter(file -> !expectedFiles.contains(file))
                .sorted()
                .forEach(file -> problems.add(file + ": not an engine parameter file (expected " + expectedFiles + ")"));
        // Fixed file order keeps the problem list, and so the error message, the same on every run.
        for (ParameterDomain domain : ParameterDomain.values()) {
            String file = domain.fileName();
            if (!documentsByFileName.containsKey(file)) {
                problems.add(file + ": file missing");
            } else {
                readFile(domain, documentsByFileName.get(file));
            }
        }
        for (ParameterKey key : ParameterKey.values()) {
            // A key of a missing file is already covered by "file missing".
            if (!seen.contains(key) && documentsByFileName.containsKey(key.domain().fileName())) {
                problems.add(key.domain().fileName() + " → " + key.yamlKey() + ": missing parameter");
            }
        }
        // Orders compare loaded values, so they are only meaningful once every value loaded.
        if (problems.isEmpty()) {
            checkOrders();
        }
    }

    private void readFile(ParameterDomain domain, Object document) {
        String file = domain.fileName();
        if (!(document instanceof Map<?, ?> map) || !(map.get("parameters") instanceof List<?> entries)) {
            problems.add(file + ": needs a top-level 'parameters' list");
            return;
        }
        for (Object entry : entries) {
            if (entry instanceof Map<?, ?> fields) {
                readEntry(domain, fields);
            } else {
                problems.add(file + ": every item under 'parameters' must be a mapping, found '" + entry + "'");
            }
        }
    }

    private void readEntry(ParameterDomain domain, Map<?, ?> fields) {
        Object rawKey = fields.get("key");
        String where = domain.fileName() + " → " + (rawKey == null ? NO_KEY : String.valueOf(rawKey));
        int problemsBefore = problems.size();

        for (Object field : fields.keySet()) {
            // YAML "~: 3" gives a null field name; it is reported like any other unknown field.
            if (!(field instanceof String text) || !FIELDS.contains(text)) {
                problems.add(where + ": unknown field '" + field + "' (allowed: " + FIELDS + ")");
            }
        }

        ParameterKey key = readKey(where, domain, rawKey);
        Unit unit = readUnit(where, key, fields.get("unit"));
        Source source = readSource(where, fields.get("tag"), fields.get("source"));

        ParameterValue male = null;
        ParameterValue female = null;
        boolean hasValue = fields.containsKey("value");
        boolean hasBySex = fields.containsKey("by_sex");
        if (hasValue == hasBySex) {
            problems.add(where + ": needs exactly one of value or by_sex");
        } else if (key == null) {
            // Without a known key the kind and unit are unknown, so the value cannot be judged.
            return;
        } else if (hasValue) {
            male = female = value(where, key, fields.get("value"));
        } else if (!(fields.get("by_sex") instanceof Map<?, ?> bySex)) {
            problems.add(where + ": by_sex must be a mapping with " + SEXES);
        } else if (!bySex.keySet().equals(Set.copyOf(SEXES))) {
            problems.add(where + ": by_sex must name exactly " + SEXES + ", found " + bySex.keySet());
        } else {
            male = value(where + " (male)", key, bySex.get("male"));
            female = value(where + " (female)", key, bySex.get("female"));
        }

        if (problems.size() == problemsBefore && key != null && unit != null && source != null) {
            loaded.put(key, new Parameter(key, male, female, source));
        }
    }

    private ParameterKey readKey(String where, ParameterDomain domain, Object rawKey) {
        if (rawKey == null || rawKey instanceof String blank && blank.isBlank()) {
            problems.add(where + ": missing key");
            return null;
        }
        if (!(rawKey instanceof String text)) {
            problems.add(where + ": key must be text, was " + rawKey);
            return null;
        }
        ParameterKey key = KEYS_BY_YAML.get(text);
        if (key == null) {
            problems.add(where + ": unknown parameter key (the engine reads only ParameterKey)");
            return null;
        }
        if (!seen.add(key)) {
            problems.add(where + ": duplicate key");
            return null;
        }
        if (key.domain() != domain) {
            problems.add(where + ": belongs in " + key.domain().fileName());
            return null;
        }
        return key;
    }

    private Unit readUnit(String where, ParameterKey key, Object rawUnit) {
        if (!(rawUnit instanceof String text)) {
            problems.add(where + ": missing unit");
            return null;
        }
        Unit unit = Unit.fromYaml(text).orElse(null);
        if (key != null && unit != key.unit()) {
            problems.add(where + ": unit '" + text + "' but the engine assumes '" + key.unit().yamlName() + "'");
            return null;
        }
        return unit;
    }

    private Source readSource(String where, Object rawTag, Object rawSource) {
        SourceTag tag = rawTag instanceof String text ? TAGS.get(text) : null;
        if (tag == null) {
            problems.add(where + ": tag must be one of " + TAG_NAMES);
        }
        if (!(rawSource instanceof String reference) || reference.isBlank()) {
            problems.add(where + ": missing source (U14: every parameter is sourced)");
            return null;
        }
        if (tag == null) {
            return null;
        }
        try {
            return new Source(reference, tag);
        } catch (IllegalArgumentException e) {
            problems.add(where + ": " + e.getMessage());
            return null;
        }
    }

    private ParameterValue value(String where, ParameterKey key, Object raw) {
        Unit unit = key.unit();
        if (unit.kind() == Unit.Kind.FLAG) {
            if (raw instanceof Boolean on) {
                return new ParameterValue.Flag(on);
            }
            problems.add(where + ": value must be true or false, was " + raw);
            return null;
        }
        Optional<BigDecimal> number = decimal(where, raw);
        if (number.isEmpty()) {
            return null;
        }
        BigDecimal value = number.get();
        if (unit.kind() == Unit.Kind.WHOLE) {
            BigDecimal whole = value.stripTrailingZeros();
            if (whole.scale() > 0) {
                problems.add(where + ": value must be a whole number of " + unit.yamlName() + ", was " + raw);
                return null;
            }
            if (whole.toBigInteger().abs().compareTo(INT_MAX) > 0) {
                problems.add(where + ": value " + raw + " is too large");
                return null;
            }
        } else if (!Double.isFinite(value.doubleValue())) {
            problems.add(where + ": value " + raw + " is too large");
            return null;
        }
        Optional<String> outOfRange = unit.rejects(value);
        if (outOfRange.isPresent()) {
            problems.add(where + ": value " + outOfRange.get() + ", was " + raw);
            return null;
        }
        return new ParameterValue.Decimal(value);
    }

    private Optional<BigDecimal> decimal(String where, Object raw) {
        if (raw instanceof Integer || raw instanceof Long) {
            return Optional.of(BigDecimal.valueOf(((Number) raw).longValue()));
        }
        if (raw instanceof Double number) {
            if (Double.isFinite(number)) {
                return Optional.of(BigDecimal.valueOf(number));
            }
            problems.add(where + ": value must be a finite number, was " + raw);
            return Optional.empty();
        }
        if (raw instanceof BigInteger || raw instanceof BigDecimal) {
            return Optional.of(new BigDecimal(raw.toString()));
        }
        problems.add(where + ": value must be a number, was " + raw);
        return Optional.empty();
    }

    private void checkOrders() {
        for (Order order : ORDERS) {
            for (Sex sex : Sex.values()) {
                BigDecimal lower = number(order.lower(), sex);
                BigDecimal upper = number(order.upper(), sex);
                int comparison = lower.compareTo(upper);
                if (comparison > 0 || order.strict() && comparison == 0) {
                    problems.add(order.lower().domain().fileName() + " → " + order.lower().yamlKey()
                            + " (" + sex.name().toLowerCase(Locale.ROOT) + "): " + lower.toPlainString()
                            + " must be " + (order.strict() ? "below " : "at most ") + order.upper().yamlKey()
                            + " (" + upper.toPlainString() + ")");
                }
            }
        }
    }

    private BigDecimal number(ParameterKey key, Sex sex) {
        return ((ParameterValue.Decimal) loaded.get(key).valueFor(sex)).value();
    }
}
