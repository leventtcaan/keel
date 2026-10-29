package app.keel.nutrition;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Household measures as text (K-1061): "1 cup", "2/3 cup (55 g)", "1 1/2 tbsp", "1 large". The count in front and what it
 * counts behind; whether that is a volume (a cup, a tablespoon, a fluid ounce) or a weight (an ounce, a gram), and how many
 * millilitres a volume is. The definitions are the US customary ones (not tunable values).
 */
final class Measures {

    /** The ounce, in grams (international avoirdupois ounce: a definition). */
    static final BigDecimal OUNCE_GRAMS = new BigDecimal("28.349523125");

    /** What a measure counts: {@code count} of {@code what}. */
    record Label(BigDecimal count, String what) {
    }

    // US customary volumes in millilitres. Longer names first matters not: a unit must end at a word end.
    private static final Map<String, BigDecimal> MILLILITRES = Map.ofEntries(
            Map.entry("cup", new BigDecimal("236.588")), Map.entry("cups", new BigDecimal("236.588")),
            Map.entry("tablespoon", new BigDecimal("14.7868")), Map.entry("tablespoons", new BigDecimal("14.7868")),
            Map.entry("tbsp", new BigDecimal("14.7868")), Map.entry("tbs", new BigDecimal("14.7868")),
            Map.entry("teaspoon", new BigDecimal("4.92892")), Map.entry("teaspoons", new BigDecimal("4.92892")),
            Map.entry("tsp", new BigDecimal("4.92892")),
            Map.entry("fl oz", new BigDecimal("29.5735")), Map.entry("fluid ounce", new BigDecimal("29.5735")),
            Map.entry("fluid ounces", new BigDecimal("29.5735")),
            Map.entry("pint", new BigDecimal("473.176")), Map.entry("quart", new BigDecimal("946.353")),
            Map.entry("gallon", new BigDecimal("3785.41")),
            Map.entry("milliliter", BigDecimal.ONE), Map.entry("milliliters", BigDecimal.ONE), Map.entry("ml", BigDecimal.ONE),
            Map.entry("liter", new BigDecimal("1000")), Map.entry("liters", new BigDecimal("1000")), Map.entry("l", new BigDecimal("1000")));
    private static final Map<String, BigDecimal> GRAMS = Map.ofEntries(
            Map.entry("oz", OUNCE_GRAMS), Map.entry("ounce", OUNCE_GRAMS), Map.entry("ounces", OUNCE_GRAMS),
            Map.entry("lb", new BigDecimal("453.59237")), Map.entry("lbs", new BigDecimal("453.59237")),
            Map.entry("pound", new BigDecimal("453.59237")), Map.entry("pounds", new BigDecimal("453.59237")),
            Map.entry("g", BigDecimal.ONE), Map.entry("gram", BigDecimal.ONE), Map.entry("grams", BigDecimal.ONE),
            Map.entry("kg", new BigDecimal("1000")));

    private static final Pattern MIXED = Pattern.compile("^(\\d+)\\s+(\\d+)/(\\d+)\\s+(.*)$");
    private static final Pattern FRACTION = Pattern.compile("^(\\d+)/(\\d+)\\s+(.*)$");
    private static final Pattern DECIMAL = Pattern.compile("^(\\d*\\.?\\d+)\\s*(.*)$");
    private static final int FRACTION_DIGITS = 4;

    private Measures() {
    }

    /** The count and what it counts; empty when the text does not start with a number (or the count is not positive). */
    static Optional<Label> parse(String text) {
        if (text == null) {
            return Optional.empty();
        }
        String label = text.strip();
        Matcher mixed = MIXED.matcher(label);
        if (mixed.matches()) {
            BigDecimal whole = new BigDecimal(mixed.group(1));
            return label(whole.add(fraction(mixed.group(2), mixed.group(3))), mixed.group(4));
        }
        Matcher fraction = FRACTION.matcher(label);
        if (fraction.matches()) {
            return label(fraction(fraction.group(1), fraction.group(2)), fraction.group(3));
        }
        Matcher decimal = DECIMAL.matcher(label);
        if (decimal.matches()) {
            return label(new BigDecimal(decimal.group(1)), decimal.group(2));
        }
        return Optional.empty();
    }

    private static Optional<Label> label(BigDecimal count, String what) {
        return count.signum() > 0 ? Optional.of(new Label(count, what.strip())) : Optional.empty();
    }

    private static BigDecimal fraction(String numerator, String denominator) {
        BigDecimal by = new BigDecimal(denominator);
        return by.signum() == 0 ? BigDecimal.ZERO : new BigDecimal(numerator).divide(by, FRACTION_DIGITS, java.math.RoundingMode.HALF_UP);
    }

    /** The millilitres the measure holds ("2 tbsp" → 29.57); empty when it is not a volume. */
    static Optional<BigDecimal> millilitres(String text) {
        return parse(text).flatMap(label -> unit(MILLILITRES, label.what()).map(ml -> ml.multiply(label.count(), MathContext.DECIMAL64)));
    }

    /** The grams a weight measure is ("3 oz" → 85.05); empty when it is not a weight. */
    static Optional<BigDecimal> grams(String text) {
        return parse(text).flatMap(label -> unit(GRAMS, label.what()).map(g -> g.multiply(label.count(), MathContext.DECIMAL64)));
    }

    static boolean isVolume(String text) {
        return millilitres(text).isPresent();
    }

    static boolean isWeight(String text) {
        return grams(text).isPresent();
    }

    /** The unit the text starts with, ending at a word end ("cup, chopped" is a cup; "cupcake" is not). */
    private static Optional<BigDecimal> unit(Map<String, BigDecimal> units, String what) {
        String lower = what.toLowerCase(Locale.ROOT);
        return units.entrySet().stream()
                .filter(unit -> lower.startsWith(unit.getKey())
                        && (lower.length() == unit.getKey().length() || !Character.isLetter(lower.charAt(unit.getKey().length()))))
                // "fl oz" and "oz" both start a text only one of which is right; the longest name wins.
                .max(java.util.Comparator.comparingInt(unit -> unit.getKey().length())).map(Map.Entry::getValue);
    }
}
