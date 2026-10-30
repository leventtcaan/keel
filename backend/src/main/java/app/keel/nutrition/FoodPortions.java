package app.keel.nutrition;

import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * The ways to log a food (K-1061, ADR-090 #1 and #5): its household measures ("1 large", "1 slice", "1 cup"), a product's
 * label serving, and always g and oz (ml where the density is known) — each with the food's numbers for one of it, as single
 * numbers (the middle of the range; a product's label value). And where the app starts: a natural portion, not 100 g.
 *
 * <p>The start: a product, its label serving. Otherwise a countable — "1 large" for an egg, "1 medium" for a banana (of
 * the sizes the database has, the middle one by weight: the size people mean when they say "a banana"), else its first
 * piece ("1 slice") — then a serving ("1 NLEA serving"), then a measure of volume ("1 cup"), then of weight ("3 oz"). 100 g
 * only when the database gives the food no household measure at all. Pure: the food comes in, the list goes out.
 */
final class FoodPortions {

    enum Kind { PIECE, SERVING, MEASURE, WEIGHT, VOLUME }

    /** One way to log; {@code unit} is what the app sends as Amount.unit, the numbers are for one of it. */
    record Portion(String unit, String label, Kind kind, BigDecimal grams, BigDecimal kcal, BigDecimal proteinG, BigDecimal carbsG, BigDecimal fatG) {
    }

    /** The portions, the default one first, and the amount to start from. */
    record Portions(List<Portion> portions, FoodEstimator.Amount defaultAmount) {
    }

    /** {@code sizeWords}: the words that name a size of a piece, smallest to largest (keel.nutrition.portions.size-words). */
    @ConfigurationProperties("keel.nutrition.portions")
    record Settings(List<String> sizeWords) {
    }

    static final String GRAMS = "g";
    static final String OUNCES = "oz";
    static final String MILLILITRES = "ml";
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    // A gram's or a millilitre's worth is a small number the app multiplies by hundreds: four decimals, not two.
    static final int DECIMALS = 4;
    private static final int GRAMS_DECIMALS = 3;
    private static final BigDecimal LAST_RESORT_GRAMS = HUNDRED;

    private FoodPortions() {
    }

    static Portions of(FoodStore.Food food, Settings settings) {
        List<Portion> measures = new ArrayList<>();
        for (FoodStore.Serving serving : food.servings()) {
            if (serving.grams().signum() > 0) {
                measures.add(portion(food, serving.name(), serving.name(), kind(food, serving.name()), serving.grams()));
            }
        }
        Optional<Portion> start = start(food, measures, settings);
        List<Portion> portions = new ArrayList<>();
        start.ifPresent(portions::add);
        measures.stream().filter(measure -> start.isEmpty() || measure != start.get()).forEach(portions::add);
        portions.add(portion(food, GRAMS, GRAMS, Kind.WEIGHT, BigDecimal.ONE));
        portions.add(portion(food, OUNCES, OUNCES, Kind.WEIGHT, Measures.OUNCE_GRAMS));
        if (food.gramsPerMl() != null) {
            portions.add(portion(food, MILLILITRES, MILLILITRES, Kind.VOLUME, food.gramsPerMl()));
        }
        FoodEstimator.Amount amount = start.map(portion -> new FoodEstimator.Amount(BigDecimal.ONE, portion.unit(), null))
                .orElseGet(() -> new FoodEstimator.Amount(LAST_RESORT_GRAMS, GRAMS, null));
        return new Portions(List.copyOf(portions), amount);
    }

    /** What kind of measure a serving name is; a product's every serving is its label's. */
    static Kind kind(FoodStore.Food food, String name) {
        if (food.source() == FoodRanges.Source.BRANDED) {
            return Kind.SERVING;
        }
        if (Measures.isVolume(name) || Measures.isWeight(name)) {
            return Kind.MEASURE;
        }
        String lower = name.toLowerCase(Locale.ROOT);
        return Measures.parse(lower).map(label -> label.what().startsWith("serving") || label.what().contains("nlea serving")).orElse(false)
                ? Kind.SERVING : Kind.PIECE;
    }

    private static Optional<Portion> start(FoodStore.Food food, List<Portion> measures, Settings settings) {
        if (food.source() == FoodRanges.Source.BRANDED) {
            return measures.stream().findFirst();
        }
        List<Portion> pieces = measures.stream().filter(portion -> portion.kind() == Kind.PIECE).toList();
        List<Portion> sized = pieces.stream().filter(piece -> singular(piece) && sizeWord(piece, settings).isPresent())
                .sorted(Comparator.comparing(Portion::grams)).toList();
        if (!sized.isEmpty()) {
            // The middle one; of an even number the larger of the two middle ones.
            return Optional.of(sized.get(sized.size() / 2));
        }
        return pieces.stream().filter(FoodPortions::singular).findFirst()
                .or(() -> pieces.stream().findFirst())
                .or(() -> measures.stream().filter(portion -> portion.kind() == Kind.SERVING).findFirst())
                .or(() -> measures.stream().filter(portion -> Measures.isVolume(portion.unit()) && singular(portion)).findFirst())
                .or(() -> measures.stream().filter(portion -> Measures.isVolume(portion.unit())).findFirst())
                .or(() -> measures.stream().filter(portion -> Measures.isWeight(portion.unit())).findFirst());
    }

    /** Whether the portion counts one ("1 large"), not several ("2 slices"). */
    private static boolean singular(Portion portion) {
        return Measures.parse(portion.unit()).map(label -> label.count().compareTo(BigDecimal.ONE) == 0).orElse(false);
    }

    /** The size word a piece starts with ("1 medium (7 in long)" → medium), if it is one of the settings'. */
    private static Optional<String> sizeWord(Portion piece, Settings settings) {
        String what = Measures.parse(piece.unit()).map(Measures.Label::what).orElse("").toLowerCase(Locale.ROOT);
        return settings.sizeWords().stream()
                .filter(word -> what.startsWith(word) && (what.length() == word.length() || !Character.isLetter(what.charAt(word.length()))))
                .max(Comparator.comparingInt(String::length));
    }

    private static Portion portion(FoodStore.Food food, String unit, String label, Kind kind, BigDecimal grams) {
        FoodRanges.Per100g value = food.per100g();
        BigDecimal portion = grams.divide(HUNDRED);
        return new Portion(unit, label, kind, Decimals.plain(grams.setScale(GRAMS_DECIMALS, RoundingMode.HALF_UP)), scaled(value.kcal(), portion),
                scaled(value.proteinG(), portion), scaled(value.carbsG(), portion), scaled(value.fatG(), portion));
    }

    private static BigDecimal scaled(BigDecimal per100g, BigDecimal portion) {
        return Decimals.plain(per100g.multiply(portion).setScale(DECIMALS, RoundingMode.HALF_UP));
    }
}
