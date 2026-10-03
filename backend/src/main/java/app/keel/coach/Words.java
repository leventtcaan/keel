package app.keel.coach;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * A text as the checks read it (K-505 review): compatibility forms folded (NFKC — fullwidth digits are digits), every
 * apostrophe one apostrophe (’ ‘ ʼ ′ `), every kind of space one space (a no-break space before % is a space). A model writes
 * these freely; a check that saw only ASCII would let them through.
 */
final class Words {

    private static final Pattern APOSTROPHES = Pattern.compile("[\\u2019\\u2018\\u02BC\\u2032`]");
    private static final Pattern SPACES = Pattern.compile("[\\p{Z}\\t\\r\\n]+");

    private Words() {
    }

    static String normalize(String text) {
        String folded = Normalizer.normalize(text, Normalizer.Form.NFKC);
        return SPACES.matcher(APOSTROPHES.matcher(folded).replaceAll("'")).replaceAll(" ");
    }
}
