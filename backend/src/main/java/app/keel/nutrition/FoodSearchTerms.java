package app.keel.nutrition;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * A food search query as the database compares it (ADR-085 #7, K-1061, K-1213): every word folded — lower case, and the Turkish
 * letters (ı İ ş ğ ç ö ü) as their plain ones — so a Turkish keyboard finds "chicken" and a keyboard without the Turkish letters
 * finds "mercimek çorbası" by typing "mercimek corbasi". The SQL folds the names the same way ({@link #TURKISH_LETTERS} to
 * {@link #PLAIN_LETTERS}, then lower), see FoodStore.search. A plural is read as its singular too ("eggs" finds
 * "Egg, whole"): the words as typed and the words made singular are both what a name may hold.
 */
record FoodSearchTerms(List<String> words) {

    /**
     * The Turkish letters the SQL's translate() turns into the plain ones (the same position in {@link #PLAIN_LETTERS}) before it
     * lower-cases: dotless ı and dotted İ (U+0131, U+0130) are "i"; ş, ğ, ç, ö, ü are s, g, c, o, u, in both cases.
     */
    static final String TURKISH_LETTERS = "ıİşŞğĞçÇöÖüÜ";
    static final String PLAIN_LETTERS = "iisSgGcCoOuU";

    /** U+0307, the dot a decomposed or lower-cased İ leaves behind: dropped by the fold, in the code and in the database. */
    static final char COMBINING_DOT = '\u0307';

    /** A word shorter than this is matched as typed only: a typo in three letters is another word ("egg" and "leg"). */
    static final int MIN_FUZZY_LENGTH = 4;

    static FoodSearchTerms of(String query) {
        return new FoodSearchTerms(Arrays.stream(fold(query).trim().split("\\s+")).filter(word -> !word.isEmpty()).toList());
    }

    /**
     * The words as the old search text holds them (V52: lower case, ı and İ as i, the other Turkish letters kept), for the time before
     * the folded text is filled (nutrition.food.search_folded, see SearchFoldBackfill).
     */
    static FoodSearchTerms ofLegacy(String query) {
        return new FoodSearchTerms(Arrays.stream(java.text.Normalizer.normalize(query, java.text.Normalizer.Form.NFC).replace('ı', 'i')
                .replace('İ', 'i').toLowerCase(Locale.ROOT).trim().split("\\s+")).filter(word -> !word.isEmpty()).toList());
    }

    /**
     * Composed (NFC: a letter and its accent mark are one letter), then lower case with the Turkish letters as plain ones, and a
     * stray dot above dropped; the replacement comes first, since lower-casing İ alone leaves a combining dot. The database folds
     * with nutrition.fold_text (V62), made of the same lists.
     */
    static String fold(String text) {
        String composed = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFC);
        StringBuilder folded = new StringBuilder(composed.length());
        for (int i = 0; i < composed.length(); i++) {
            char letter = composed.charAt(i);
            int at = TURKISH_LETTERS.indexOf(letter);
            if (at >= 0) {
                folded.append(PLAIN_LETTERS.charAt(at));
            } else if (letter != COMBINING_DOT) {
                folded.append(letter);
            }
        }
        return folded.toString().toLowerCase(Locale.ROOT);
    }

    /**
     * The singular of an English word, as far as food names need: "eggs" → "egg", "tomatoes" → "tomato", "berries" → "berry",
     * "sandwiches" → "sandwich". A word that only looks plural stays ("hummus", "asparagus", "swiss"). The singular is only an
     * extra thing a name may hold beside the word as typed (the SQL matches either), never a change to what a name says.
     */
    static String singular(String word) {
        int n = word.length();
        if (n > 4 && word.endsWith("ies")) {
            return word.substring(0, n - 3) + "y";
        }
        if (n > 4 && (word.endsWith("oes") || word.endsWith("ches") || word.endsWith("shes") || word.endsWith("xes") || word.endsWith("zes"))) {
            return word.substring(0, n - 2);
        }
        if (n > 3 && word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us") && !word.endsWith("is")) {
            return word.substring(0, n - 1);
        }
        return word;
    }

    /** The same words, each in its singular. */
    FoodSearchTerms singulars() {
        return new FoodSearchTerms(words.stream().map(FoodSearchTerms::singular).toList());
    }

    /** What the word may be in a name: as typed, and in the singular. */
    Set<String> variants(int index) {
        Set<String> variants = new LinkedHashSet<>();
        variants.add(words.get(index));
        variants.add(singular(words.get(index)));
        return variants;
    }

    /**
     * Whether a typo in this word is worth looking for: four letters or more, and only letters — trigram matching ignores
     * punctuation, so "egg_" (the user's underscore is text, not a pattern) would otherwise be a typo of "egg".
     */
    boolean fuzzy(int index) {
        String word = words.get(index);
        return word.length() >= MIN_FUZZY_LENGTH && word.codePoints().allMatch(Character::isLetter);
    }

    String first() {
        return words.getFirst();
    }

    /** All the words, one space apart: what a name must equal to be the very thing asked for. */
    String whole() {
        return String.join(" ", words);
    }

    /** The first word as LIKE text: % _ and the escape character match themselves. */
    String firstEscaped() {
        return escape(first());
    }

    /** One word as LIKE text: % _ and the escape character match themselves. */
    String escapedWord(int index) {
        return escape(words.get(index));
    }

    /** One LIKE pattern per word, each "anywhere in the text". */
    String[] contains() {
        return words.stream().map(word -> "%" + escape(word) + "%").toArray(String[]::new);
    }

    /** The LIKE patterns of one word's variants. */
    String[] containsAny(int index) {
        return variants(index).stream().map(word -> "%" + escape(word) + "%").toArray(String[]::new);
    }

    private static String escape(String word) {
        return word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
