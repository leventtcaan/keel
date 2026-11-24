package app.keel.coach;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * A text as the checks read it (K-505 review): invisible format characters dropped, compatibility forms folded (NFKC — fullwidth digits are digits), every
 * apostrophe one apostrophe (’ ‘ ʼ ′ `), every kind of space one space (a no-break space before % is a space). A model writes
 * these freely; a check that saw only ASCII would let them through.
 */
final class Words {

    private static final Pattern APOSTROPHES = Pattern.compile("[\\u2019\\u2018\\u02BC\\u2032`]");
    // Format characters: zero-width spaces and joiners, the soft hyphen, direction marks — invisible, and they split a word for a pattern.
    private static final Pattern INVISIBLE = Pattern.compile("\\p{Cf}");
    private static final Pattern SPACES = Pattern.compile("[\\p{Z}\\t\\r\\n]+");

    private Words() {
    }

    static String normalize(String text) {
        String folded = ascii(Normalizer.normalize(INVISIBLE.matcher(text).replaceAll(""), Normalizer.Form.NFKC));
        return SPACES.matcher(APOSTROPHES.matcher(folded).replaceAll("'")).replaceAll(" ");
    }

    /** Every decimal digit of every script as 0-9 (NFKC folds the fullwidth ones only; Arabic-Indic and Devanagari digits are digits too). */
    private static String ascii(String text) {
        StringBuilder out = new StringBuilder(text.length());
        text.codePoints().forEach(point -> {
            int digit = Character.getType(point) == Character.DECIMAL_DIGIT_NUMBER ? Character.digit(point, 10) : -1;
            if (digit >= 0) {
                out.append((char) ('0' + digit));
            } else {
                out.appendCodePoint(point);
            }
        });
        return out.toString();
    }
}
