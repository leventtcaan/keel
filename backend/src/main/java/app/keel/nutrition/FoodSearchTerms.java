package app.keel.nutrition;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * A food search query as the database compares it (ADR-085 #7): every word folded — lower case, and the Turkish dotless
 * "ı" and dotted "İ" as plain "i" — so a Turkish keyboard finds "chicken". The SQL folds the names the same way
 * ({@link #DOTTED_AND_DOTLESS} to "ii", then lower), see FoodStore.search.
 */
record FoodSearchTerms(List<String> words) {

    /** "ı" (U+0131) and "İ" (U+0130): the letters the SQL's translate() turns into "i" before it lower-cases. */
    static final String DOTTED_AND_DOTLESS = "ıİ";

    static FoodSearchTerms of(String query) {
        return new FoodSearchTerms(Arrays.stream(fold(query).trim().split("\\s+")).filter(word -> !word.isEmpty()).toList());
    }

    /** Lower case with ı and İ as i; the replacement comes first, since lower-casing İ alone leaves a combining dot. */
    static String fold(String text) {
        return text.replace('ı', 'i').replace('İ', 'i').toLowerCase(Locale.ROOT);
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

    private static String escape(String word) {
        return word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
