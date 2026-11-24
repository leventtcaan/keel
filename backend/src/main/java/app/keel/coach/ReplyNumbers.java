package app.keel.coach;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The numbers a reply says, and whether each is one of the facts' (ADR-092 #2, U1). Digits are read as written ("1,900", "0.4",
 * "0,4", fullwidth digits after NFKC) and so are number words in English and Turkish ("two", "iki", "half", "twice"): a number
 * spelled out is still a number. A number matches a fact when it is the fact's size (the sign is a direction, not a size) or the
 * fact rounded to the reply's own decimals (half up, or cut off), or, written with a percent sign, the fact as a fraction. A
 * number with more decimals than the fact has is a number the engine never said.
 */
final class ReplyNumbers {

    /** A number in a reply: its value and whether a percent sign follows it. */
    record Said(BigDecimal value, boolean percent) {
    }

    // 1,900 (thousands, exactly three digits after the comma) · 0,4 / 0.4 · 12. A sign is a direction, so it is not read.
    private static final Pattern DIGITS = Pattern.compile("(?<![\\p{N}.,])(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:[.,]\\d+)?)(\\s?%)?");
    private static final Pattern WORDS;
    private static final Map<String, BigDecimal> WORD_VALUES = Map.ofEntries(
            // English: "one" is left out — it is a pronoun more often than a count, and "once" is not a number of anything.
            Map.entry("zero", bd("0")), Map.entry("two", bd("2")), Map.entry("three", bd("3")), Map.entry("four", bd("4")), Map.entry("five", bd("5")),
            Map.entry("six", bd("6")), Map.entry("seven", bd("7")), Map.entry("eight", bd("8")), Map.entry("nine", bd("9")), Map.entry("ten", bd("10")),
            Map.entry("eleven", bd("11")), Map.entry("twelve", bd("12")), Map.entry("thirteen", bd("13")), Map.entry("fourteen", bd("14")),
            Map.entry("fifteen", bd("15")), Map.entry("sixteen", bd("16")), Map.entry("seventeen", bd("17")), Map.entry("eighteen", bd("18")),
            Map.entry("nineteen", bd("19")), Map.entry("twenty", bd("20")), Map.entry("thirty", bd("30")), Map.entry("forty", bd("40")),
            Map.entry("fifty", bd("50")), Map.entry("sixty", bd("60")), Map.entry("seventy", bd("70")), Map.entry("eighty", bd("80")),
            Map.entry("ninety", bd("90")), Map.entry("hundred", bd("100")), Map.entry("thousand", bd("1000")), Map.entry("million", bd("1000000")),
            Map.entry("twice", bd("2")), Map.entry("double", bd("2")), Map.entry("triple", bd("3")), Map.entry("half", bd("0.5")),
            Map.entry("dozen", bd("12")), Map.entry("couple", bd("2")),
            // Turkish: "on" (ten) is left out — it is an English word too; "bir" (one) is the article.
            Map.entry("iki", bd("2")), Map.entry("üç", bd("3")), Map.entry("dört", bd("4")), Map.entry("beş", bd("5")), Map.entry("altı", bd("6")),
            Map.entry("yedi", bd("7")), Map.entry("sekiz", bd("8")), Map.entry("dokuz", bd("9")), Map.entry("yirmi", bd("20")),
            Map.entry("otuz", bd("30")), Map.entry("kırk", bd("40")), Map.entry("elli", bd("50")), Map.entry("altmış", bd("60")),
            Map.entry("yetmiş", bd("70")), Map.entry("seksen", bd("80")), Map.entry("doksan", bd("90")), Map.entry("yüz", bd("100")),
            Map.entry("bin", bd("1000")), Map.entry("yarım", bd("0.5")));

    static {
        WORDS = Pattern.compile("(?<![\\p{L}])(" + String.join("|", WORD_VALUES.keySet()) + ")(?![\\p{L}])");
    }

    private ReplyNumbers() {
    }

    private static BigDecimal bd(String value) {
        return new BigDecimal(value);
    }

    /** Every number the text says, in order; the text as {@link Words#normalize} reads it. */
    static List<Said> in(String text) {
        List<Said> said = new ArrayList<>();
        String read = Words.normalize(text);
        Matcher digits = DIGITS.matcher(read);
        while (digits.find()) {
            String written = digits.group(1);
            // "1,900": thousands. "0,4": a decimal comma (Turkish). "1.9": a decimal point.
            String plain = written.matches("\\d{1,3}(,\\d{3})+(\\.\\d+)?") ? written.replace(",", "") : written.replace(',', '.');
            said.add(new Said(new BigDecimal(plain), digits.group(2) != null));
        }
        Matcher words = WORDS.matcher(read.toLowerCase(Locale.ROOT));
        while (words.find()) {
            said.add(new Said(WORD_VALUES.get(words.group(1)), false));
        }
        return said;
    }

    /** Whether {@code said} is {@code fact}'s size, rounded to what was said, or its percent. */
    static boolean matches(Said said, BigDecimal fact) {
        BigDecimal wanted = said.value().abs();
        BigDecimal size = fact.abs();
        if (sameSize(wanted, size, said.value().scale())) {
            return true;
        }
        // "50%" for a fraction of 0.5: the fraction in percent.
        return said.percent() && sameSize(wanted, size.movePointRight(2), said.value().scale());
    }

    private static boolean sameSize(BigDecimal said, BigDecimal fact, int decimals) {
        if (said.compareTo(fact) == 0) {
            return true;
        }
        // Rounded to the decimals the reply gives (never more than the fact has: that would be a number of the model's own).
        return fact.scale() > decimals && (fact.setScale(decimals, RoundingMode.HALF_UP).compareTo(said) == 0
                || fact.setScale(decimals, RoundingMode.DOWN).compareTo(said) == 0);
    }

    /** Whether a number the model listed is the size of a number it said (one the same under the same rounding). */
    static boolean listed(Said said, BigDecimal listed) {
        return matches(said, listed);
    }
}
