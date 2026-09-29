package app.keel.nutrition;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * A food's energy and macros as ranges (K-208, U5; arastirma/ham/H7-besin-araligi.md). A logged item's value is the
 * database's per-100 g value times the amount, and both are uncertain:
 * <ul>
 *   <li><b>The value</b> (§5-6): an analysis mean (FDC Foundation, SR Legacy) ± analysed_value_error_ratio; a label (FDC
 *       Branded) one-sided as US law allows — energy and fat up to label_value_tolerance_ratio over the label, protein
 *       and carbs down to it under.</li>
 *   <li><b>The amount</b> (§2-4): weighed, a serving (spoon, cup, "1 large"), or eyeballed — each with its error ratio.</li>
 * </ul>
 * The two multiply, worst case on both sides; low rounds down and high rounds up, so a range never claims more certainty
 * than the numbers carry.
 */
final class FoodRanges {

    /** Where the per-100 g value comes from: a product's label, or a laboratory analysis mean. */
    enum Source { BRANDED, ANALYSED }

    /** How the amount is known: on a scale, as a serving (spoon, cup, piece), or by eye. */
    enum Certainty { WEIGHED, MEASURED, ESTIMATED }

    record Per100g(BigDecimal kcal, BigDecimal proteinG, BigDecimal carbsG, BigDecimal fatG) {
    }

    record Range(int low, int high) {
    }

    record Nutrients(Range kcal, Range proteinG, Range carbsG, Range fatG) {
    }

    /** A logged item as the gram question sees it. */
    record Item(String foodId, Nutrients nutrients, Certainty certainty) {
    }

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private FoodRanges() {
    }

    /** The database value alone, per 100 g (Contract Food.per100g). */
    static Nutrients per100g(Per100g value, Source source, Parameters parameters) {
        return ranges(value, source, HUNDRED, BigDecimal.ZERO, parameters);
    }

    /** An amount of a food: the value's error times the amount's. */
    static Nutrients item(Per100g value, Source source, BigDecimal grams, Certainty certainty, Parameters parameters) {
        return ranges(value, source, grams, ratio(parameters, switch (certainty) {
            case WEIGHED -> ParameterKey.AMOUNT_ERROR_WEIGHED_RATIO;
            case MEASURED -> ParameterKey.AMOUNT_ERROR_MEASURED_RATIO;
            case ESTIMATED -> ParameterKey.AMOUNT_ERROR_ESTIMATED_RATIO;
        }), parameters);
    }

    /** A meal: the sum of its items' lows and of their highs. */
    static Nutrients total(List<Nutrients> items) {
        return new Nutrients(sum(items.stream().map(Nutrients::kcal).toList()), sum(items.stream().map(Nutrients::proteinG).toList()),
                sum(items.stream().map(Nutrients::carbsG).toList()), sum(items.stream().map(Nutrients::fatG).toList()));
    }

    /**
     * The item to ask "how many grams?" about, if any (H7 §7): the widest item not already weighed, when its energy range
     * is as wide as the engine's smallest calorie step (bulk_step_kcal) — one item's uncertainty worth a decision.
     */
    static Optional<String> question(List<Item> items, Parameters parameters) {
        int step = parameters.wholeNumber(ParameterKey.BULK_STEP_KCAL);
        return items.stream().filter(item -> item.certainty() != Certainty.WEIGHED)
                .max(Comparator.comparingInt(item -> width(item.nutrients().kcal())))
                .filter(item -> width(item.nutrients().kcal()) >= step)
                .map(Item::foodId);
    }

    private static Nutrients ranges(Per100g value, Source source, BigDecimal grams, BigDecimal amountError, Parameters parameters) {
        BigDecimal portion = grams.divide(HUNDRED);
        BigDecimal analysed = ratio(parameters, ParameterKey.ANALYSED_VALUE_ERROR_RATIO);
        BigDecimal label = ratio(parameters, ParameterKey.LABEL_VALUE_TOLERANCE_RATIO);
        boolean branded = source == Source.BRANDED;
        // Label law: energy and fat may be under-declared (real up to +tolerance), protein and carbs over-declared (−tolerance).
        BigDecimal up = branded ? label : analysed;
        BigDecimal down = branded ? label : analysed;
        return new Nutrients(
                range(value.kcal(), branded ? BigDecimal.ZERO : down, up, portion, amountError),
                range(value.proteinG(), down, branded ? BigDecimal.ZERO : up, portion, amountError),
                range(value.carbsG(), down, branded ? BigDecimal.ZERO : up, portion, amountError),
                range(value.fatG(), branded ? BigDecimal.ZERO : down, up, portion, amountError));
    }

    private static Range range(BigDecimal per100g, BigDecimal valueDown, BigDecimal valueUp, BigDecimal portion, BigDecimal amountError) {
        BigDecimal low = per100g.multiply(BigDecimal.ONE.subtract(valueDown)).multiply(portion).multiply(BigDecimal.ONE.subtract(amountError));
        BigDecimal high = per100g.multiply(BigDecimal.ONE.add(valueUp)).multiply(portion).multiply(BigDecimal.ONE.add(amountError));
        return new Range(low.setScale(0, RoundingMode.FLOOR).intValueExact(), high.setScale(0, RoundingMode.CEILING).intValueExact());
    }

    private static Range sum(List<Range> ranges) {
        return new Range(ranges.stream().mapToInt(Range::low).sum(), ranges.stream().mapToInt(Range::high).sum());
    }

    private static int width(Range range) {
        return range.high() - range.low();
    }

    private static BigDecimal ratio(Parameters parameters, ParameterKey key) {
        return BigDecimal.valueOf(parameters.number(key));
    }
}
