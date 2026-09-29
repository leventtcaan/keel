package app.keel.engine;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Checks parsed data/parameters files against the schema in data/parameters/README.md and turns them into
 * {@link Parameter}s. Collects every problem before failing, so one failed start shows everything to fix.
 */
final class ParameterDocuments {

    private static final Set<String> FIELDS = Set.of("key", "value", "by_sex", "unit", "tag", "source", "note");
    private static final Set<String> SEXES = Set.of("male", "female");

    // The YAML tags are Turkish words from the research; the code names are English (anayasa: identifiers in English).
    private static final Map<String, SourceTag> TAGS = Map.of(
            "tecrube", SourceTag.EXPERIENCE,
            "literatur", SourceTag.LITERATURE,
            "urun", SourceTag.PRODUCT);

    private static final Map<String, ParameterKey> KEYS_BY_YAML = Arrays.stream(ParameterKey.values())
            .collect(Collectors.toUnmodifiableMap(ParameterKey::yamlKey, Function.identity()));

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
        Set<String> expectedFiles = Arrays.stream(ParameterDomain.values())
                .map(ParameterDomain::fileName)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        for (String file : documentsByFileName.keySet()) {
            if (!expectedFiles.contains(file)) {
                problems.add(file + ": not an engine parameter file (expected " + expectedFiles + ")");
            }
        }
        // Fixed file order keeps the problem list, and so the error message, the same on every run.
        for (ParameterDomain domain : ParameterDomain.values()) {
            String file = domain.fileName();
            if (!documentsByFileName.containsKey(file)) {
                problems.add(file + ": file missing");
            } else {
                readFile(file, documentsByFileName.get(file));
            }
        }
        for (ParameterKey key : ParameterKey.values()) {
            if (!seen.contains(key) && documentsByFileName.containsKey(key.domain().fileName())) {
                problems.add(key.domain().fileName() + " → " + key.yamlKey() + ": missing parameter");
            }
        }
    }

    private void readFile(String file, Object document) {
        if (!(document instanceof Map<?, ?> map) || !(map.get("parameters") instanceof List<?> entries)) {
            problems.add(file + ": needs a top-level 'parameters' list");
            return;
        }
        for (Object entry : entries) {
            if (entry instanceof Map<?, ?> fields) {
                readEntry(file, fields);
            } else {
                problems.add(file + ": every item under 'parameters' must be a mapping, found " + entry);
            }
        }
    }

    private void readEntry(String file, Map<?, ?> fields) {
        String name = fields.get("key") instanceof String text && !text.isBlank() ? text : "<no key>";
        String where = file + " → " + name;
        int problemsBefore = problems.size();

        for (Object field : fields.keySet()) {
            if (!FIELDS.contains(field)) {
                problems.add(where + ": unknown field '" + field + "' (allowed: " + FIELDS + ")");
            }
        }

        ParameterKey key = KEYS_BY_YAML.get(name);
        if (name.equals("<no key>")) {
            problems.add(where + ": missing key");
        } else if (key == null) {
            problems.add(where + ": unknown parameter key (the engine reads only ParameterKey)");
        } else if (!seen.add(key)) {
            problems.add(where + ": duplicate key");
        } else if (key.domain() != domainOf(file)) {
            problems.add(where + ": belongs in " + key.domain().fileName());
        }

        Object unit = fields.get("unit");
        if (!(unit instanceof String)) {
            problems.add(where + ": missing unit");
        } else if (key != null && !unit.equals(key.unit())) {
            problems.add(where + ": unit '" + unit + "' but the engine assumes '" + key.unit() + "'");
        }

        // Map.of(...) rejects get(null), so a missing tag is checked before the lookup.
        SourceTag tag = fields.get("tag") instanceof String text ? TAGS.get(text) : null;
        if (tag == null) {
            problems.add(where + ": tag must be one of " + TAGS.keySet());
        }

        Source source = null;
        if (!(fields.get("source") instanceof String reference) || reference.isBlank()) {
            problems.add(where + ": missing source (U14: every parameter is sourced)");
        } else {
            try {
                source = new Source(reference, tag == null ? SourceTag.LITERATURE : tag);
            } catch (IllegalArgumentException e) {
                problems.add(where + ": source must be a .md file inside arastirma/, was '" + reference + "'");
            }
        }

        ParameterValue male = null;
        ParameterValue female = null;
        boolean hasValue = fields.containsKey("value");
        boolean hasBySex = fields.containsKey("by_sex");
        if (hasValue == hasBySex) {
            problems.add(where + ": needs exactly one of value or by_sex");
        } else if (hasValue) {
            male = female = value(where, key, fields.get("value"));
        } else if (fields.get("by_sex") instanceof Map<?, ?> bySex && bySex.keySet().equals(SEXES)) {
            male = value(where + " (male)", key, bySex.get("male"));
            female = value(where + " (female)", key, bySex.get("female"));
        } else {
            problems.add(where + ": by_sex must name exactly " + SEXES);
        }

        if (problems.size() == problemsBefore && key != null) {
            loaded.put(key, new Parameter(key, male, female, source));
        }
    }

    // The unit decides the kind: 'boolean' means a switch, anything else a number.
    private ParameterValue value(String where, ParameterKey key, Object raw) {
        boolean expectsFlag = key != null && key.unit().equals("boolean");
        if (expectsFlag) {
            if (raw instanceof Boolean on) {
                return new ParameterValue.Flag(on);
            }
            problems.add(where + ": value must be true or false, was " + raw);
            return null;
        }
        if (raw instanceof Integer || raw instanceof Long) {
            return new ParameterValue.Decimal(BigDecimal.valueOf(((Number) raw).longValue()));
        }
        if (raw instanceof Double number) {
            if (Double.isFinite(number)) {
                return new ParameterValue.Decimal(BigDecimal.valueOf(number));
            }
            problems.add(where + ": value must be a finite number, was " + raw);
            return null;
        }
        if (raw instanceof Number number) {
            return new ParameterValue.Decimal(new BigDecimal(number.toString()));
        }
        problems.add(where + ": value must be a number, was " + raw);
        return null;
    }

    private static ParameterDomain domainOf(String file) {
        return Arrays.stream(ParameterDomain.values())
                .filter(domain -> domain.fileName().equals(file))
                .findFirst()
                .orElseThrow();
    }
}
