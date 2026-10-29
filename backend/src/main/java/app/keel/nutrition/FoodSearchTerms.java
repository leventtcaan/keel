package app.keel.nutrition;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * A food search query as the database compares it (ADR-085 #7, K-1061): every word folded — lower case, and the Turkish dotless
 * "ı" and dotted "İ" as plain "i" — so a Turkish keyboard finds "chicken". The SQL folds the names the same way
 * ({@link #DOTTED_AND_DOTLESS} to "ii", then lower), see FoodStore.search. A plural is read as its singular too ("eggs" finds
 * "Egg, whole"): the words as typed and the words made singular are both what a name may hold.
 */
record FoodSearchTerms(List<String> words) {

    /** "ı" (U+0131) and "İ" (U+0130): the letters the SQL's translate() turns into "i" before it lower-cases. */
    static final String DOTTED_AND_DOTLESS = "ıİ";

    /** A word shorter than this is matched as typed only: a typo in three letters is another word ("egg" and "leg"). */
    static final int MIN_FUZZY_LENGTH = 4;

    static FoodSearchTerms of(String query) {
        return new FoodSearchTerms(Arrays.stream(fold(query).trim().split("\\s+")).filter(word -> !word.isEmpty()).toList());
    }

    /** Lower case with ı and İ as i; the replacement comes first, since lower-casing İ alone leaves a combining dot. */
    static String fold(String text) {
        return text.replace('ı', 'i').replace('İ', 'i').toLowerCase(Locale.ROOT);
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
