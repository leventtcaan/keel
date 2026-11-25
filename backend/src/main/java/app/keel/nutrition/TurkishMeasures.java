package app.keel.nutrition;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * The Turkish household measures (K-1213, data/food/tr-measures.json; K2: no gram is in the code): a su bardağı is 200 ml, a çay
 * bardağı 100 ml, and what a spoon or a cup weighs depends on what is in it — yogurt, oil, flour, sugar, cooked rice or bulgur,
 * cooked legumes, a liquid. A food belongs to the first class whose word is one of the words of its name before the first comma
 * ("Rice, white, ..., cooked" → rice) and that holds an "also" word when the class has one (cooked), unless the name has an "except"
 * word. Names are folded as the search folds them, so "Süt" is milk. A food of no class has no Turkish measure: nothing is guessed.
 *
 * <p>The values are from the research notes' reading of TÜBER 2022 and the Rakıcıoğlu catalogue, [doğrulanmadı] against the primary
 * documents; the file says so ({@link #source()}). A measure goes to the app as the unit {@code tr:<id>}; the app names it in the
 * language it shows and offers it in Turkish.
 */
final class TurkishMeasures {

    /** One measure of a food: {@code unit} is "tr:su-bardagi", {@code grams} what one of it weighs for this food. */
    record Measure(String unit, BigDecimal grams) {
    }

    /** What a unit's id is on the wire. */
    static final String PREFIX = "tr:";
    private static final String RESOURCE = "/data/food/tr-measures.json";

    private record Group(String id, Set<String> first, Set<String> also, Set<String> except, Map<String, BigDecimal> grams) {
        boolean holds(String foldedName) {
            String head = foldedName.contains(",") ? foldedName.substring(0, foldedName.indexOf(',')) : foldedName;
            Set<String> words = Set.copyOf(Arrays.asList(head.split("[^\\p{L}\\p{N}]+")));
            Set<String> all = Set.copyOf(Arrays.asList(foldedName.split("[^\\p{L}\\p{N}]+")));
            return words.stream().anyMatch(first::contains) && (also.isEmpty() || all.stream().anyMatch(also::contains))
                    && all.stream().noneMatch(except::contains);
        }
    }

    private final String source;
    private final List<String> units;
    private final List<Group> groups;

    private TurkishMeasures(String source, List<String> units, List<Group> groups) {
        this.source = source;
        this.units = units;
        this.groups = groups;
    }

    /** The measures this build ships with. */
    static TurkishMeasures load() {
        try (InputStream in = TurkishMeasures.class.getResourceAsStream(RESOURCE)) {
            if (in == null) {
                throw new IllegalStateException("missing " + RESOURCE);
            }
            return read(new String(in.readAllBytes(), StandardCharsets.UTF_8));
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
    }

    static TurkishMeasures read(String json) {
        JsonNode root = JsonMapper.builder().build().readTree(json);
        List<String> units = new ArrayList<>();
        root.path("units").forEach(unit -> units.add(unit.path("id").asString()));
        List<Group> groups = new ArrayList<>();
        for (JsonNode group : root.path("classes")) {
            Map<String, BigDecimal> grams = new LinkedHashMap<>();
            group.path("grams").properties().forEach(entry -> {
                String unit = entry.getKey();
                JsonNode value = entry.getValue();
                if (!units.contains(unit) || !value.path("grams").isNumber() || value.path("grams").decimalValue().signum() <= 0) {
                    throw new IllegalArgumentException("not a measure of " + group.path("id").asString() + ": " + unit);
                }
                grams.put(unit, value.path("grams").decimalValue());
            });
            groups.add(new Group(group.path("id").asString(), words(group.path("first")), words(group.path("also")), words(group.path("except")), grams));
        }
        return new TurkishMeasures(root.path("source").asString(""), List.copyOf(units), List.copyOf(groups));
    }

    private static Set<String> words(JsonNode array) {
        List<String> words = new ArrayList<>();
        array.forEach(word -> words.add(word.asString()));
        return Set.copyOf(words);
    }

    /** The unit ids, "su-bardagi" … (without the prefix). */
    List<String> units() {
        return units;
    }

    /** Where the values come from, and that they are not yet checked against it. */
    String source() {
        return source;
    }

    /** The measures of a food by its name, in the order of the file; none when the food is of no class. */
    List<Measure> forFood(String name) {
        String folded = FoodSearchTerms.fold(name);
        return groups.stream().filter(group -> group.holds(folded)).findFirst()
                .map(group -> group.grams().entrySet().stream().map(entry -> new Measure(PREFIX + entry.getKey(), entry.getValue())).toList())
                .orElse(List.of());
    }

    /** What one of the unit weighs for this food ("tr:su-bardagi"); empty when the food has no such measure. */
    Optional<BigDecimal> grams(String name, String unit) {
        return forFood(name).stream().filter(measure -> measure.unit().equals(unit)).map(Measure::grams).findFirst();
    }
}
