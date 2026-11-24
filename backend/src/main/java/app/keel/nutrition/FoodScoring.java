package app.keel.nutrition;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * How well one food's text answers the query, read off EVERY word of the query (K-1208, ADR-091; audit 1.4: the old order looked at the
 * first word only, so "breast" never changed the order of "chicken breast"). Pure: a name, a brand, a source, a query in; points out. The
 * database cuts the pool with a coarse score of its own (FoodStore.statement); the order the user sees is this one, plus what
 * {@link FoodRanking} adds from the logs.
 *
 * <p>Points: for each query word the best way a word of the name holds it (the same word, a word it starts, somewhere inside a word, or
 * spelled alike); the name's first word being the query's first word (and USDA's headline comma after it, "Egg, whole"); the words
 * standing in the query's order, and next to each other; the name being nothing but the query; a point off for each word of the name
 * that is not asked for (shorter names first); then what kind of food it is: a generic food whose words are all held, a product whose
 * brand a word names, how good its source is (Foundation, SR Legacy, Survey, Branded) and the user's region. A word held only by a
 * look-alike costs {@code typoPenalty}.
 */
final class FoodScoring {

    /**
     * The weights (keel.nutrition.search.score), all product choices (K2): no source gives a number for them, they are tuned on
     * FoodUsSearchTests and FoodScoringTests. {@code wordExact}, {@code wordPrefix}, {@code wordInside}, {@code wordFuzzy} per query word;
     * {@code leadBonus}, {@code headlineBonus}, {@code orderBonus}, {@code adjacencyBonus}, {@code wholeNameBonus}; {@code extraWordPenalty}
     * per unasked word of the name up to {@code extraWordCap} words; {@code sourceBonus} by source; {@code typoPenalty} per look-alike word,
     * a look-alike is at most {@code min(typoMaxEdits, letters / typoCharsPerEdit)} edits away; {@code favoriteBonus} for a starred food;
     * {@code ownFoodBonus} for a food the user made (their label's numbers are the one they mean, but a weak name match is not first);
     * the user's logs weigh {@code 1} today and half as much {@code ownHalfLifeDays} ago, looking back {@code ownLookbackDays}, and
     * {@code ownPool} of the foods they eat most that hold the words always enter the pool; the typo pass (a costly read) runs only when the exact
     * search found fewer than {@code typoBelowExactHits} foods or none scoring {@code typoWeakScore} (as {@link #score} counts: 80 is a generic food that starts with the words).
     */
    @ConfigurationProperties("keel.nutrition.search.score")
    record Settings(int wordExact, int wordPrefix, int wordInside, int wordFuzzy, int leadBonus, int headlineBonus, int orderBonus,
            int adjacencyBonus, int wholeNameBonus, int extraWordPenalty, int extraWordCap, Map<String, Integer> sourceBonus, int typoPenalty,
            int typoMaxEdits, int typoCharsPerEdit, int favoriteBonus, int ownFoodBonus, double ownHalfLifeDays, int ownLookbackDays,
            int ownPool, int typoBelowExactHits, int typoWeakScore) {

        public Settings {
            if (sourceBonus == null || ownHalfLifeDays <= 0 || ownLookbackDays < 1 || ownPool < 0 || typoCharsPerEdit < 1 || typoMaxEdits < 0
                    || typoBelowExactHits < 1 || typoWeakScore < 0 || extraWordCap < 0) {
                throw new IllegalArgumentException("keel.nutrition.search.score: source-bonus given, own-half-life-days above 0, own-lookback-days"
                        + " and typo-chars-per-edit and typo-below-exact-hits at least 1, typo-weak-score own-pool, typo-max-edits and extra-word-cap not negative");
            }
        }
    }

    private enum Kind {
        NONE, FUZZY, INSIDE, PREFIX, EXACT
    }

    private FoodScoring() {
    }

    /**
     * The text points of one food (see the class); {@code sameRegion}: it is of the searcher's region. Two parts. The first is ADR-085's rule,
     * whole points: how the name holds the query's first word (the {@link #tier}, a step of {@code rank-step} each), a generic food that
     * starts with it, a brand it starts, the region. It is the order accepted in ADR-085 and K-1061 and nothing below can overturn it.
     * The second is this card's (K-1208): every word of the query, their order, the source quality, the length; it only breaks the ties of
     * the first (it is added as a thousandth, always under the smallest step), so the log bonuses of {@link FoodRanking} still weigh against whole steps.
     */
    static double score(String name, String brand, String source, boolean sameRegion, FoodSearchTerms terms, Settings s, FoodRanking.Weights w) {
        String folded = FoodSearchTerms.fold(name);
        List<String> nameWords = words(folded);
        int n = terms.words().size();
        int[] at = new int[n];
        Kind[] kind = new Kind[n];
        List<String> spelled = new ArrayList<>();
        int points = 0;
        int fuzzy = 0;
        for (int i = 0; i < n; i++) {
            at[i] = -1;
            kind[i] = Kind.NONE;
            for (int j = 0; j < nameWords.size(); j++) {
                Kind k = kind(nameWords.get(j), terms, i, s);
                if (k.compareTo(kind[i]) > 0) {
                    kind[i] = k;
                    at[i] = j;
                }
            }
            points += switch (kind[i]) {
                case EXACT -> s.wordExact();
                case PREFIX -> s.wordPrefix();
                case INSIDE -> s.wordInside();
                case FUZZY -> s.wordFuzzy();
                case NONE -> 0;
            };
            fuzzy += kind[i] == Kind.FUZZY ? 1 : 0;
            // A word spelled alike is read as the name spells it, so "chiken breast" holds "Chicken, breast, raw" as that name holds the query.
            spelled.add(kind[i] == Kind.FUZZY ? nameWords.get(at[i]) : terms.words().get(i));
        }
        // The name's first word is the query's first word; USDA's headline form puts a comma after it ("Egg, whole").
        if (!nameWords.isEmpty() && holds(kind(nameWords.getFirst(), terms, 0, s))) {
            points += s.leadBonus();
            if (kind(nameWords.getFirst(), terms, 0, s) == Kind.EXACT && folded.startsWith(nameWords.getFirst() + ",")) {
                points += s.headlineBonus();
            }
        }
        // Order and adjacency over the words the name holds.
        List<Integer> positions = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            if (at[i] >= 0) {
                positions.add(at[i]);
            }
        }
        boolean ordered = positions.size() >= 2 && positions.size() == n;
        boolean adjacent = ordered;
        for (int i = 1; i < positions.size(); i++) {
            ordered &= positions.get(i) > positions.get(i - 1);
            adjacent &= positions.get(i) == positions.get(i - 1) + 1;
        }
        points += ordered ? s.orderBonus() : 0;
        points += ordered && adjacent ? s.adjacencyBonus() : 0;
        long distinct = positions.stream().distinct().count();
        boolean allExact = Arrays.stream(kind).allMatch(k -> k == Kind.EXACT);
        points += allExact && nameWords.size() == n && (n == 1 || ordered) ? s.wholeNameBonus() : 0;
        points -= Math.min((int) Math.max(0, nameWords.size() - distinct), s.extraWordCap()) * s.extraWordPenalty();
        points += s.sourceBonus().getOrDefault(source, 0);
        points -= fuzzy * s.typoPenalty();

        int tier = tier(folded, spelled);
        boolean branded = "BRANDED".equals(source);
        String foldedBrand = FoodSearchTerms.fold(brand == null ? "" : brand);
        int whole = (5 - tier) * w.rankStep()
                + (!branded && tier <= 2 ? w.genericBonus() : 0)
                + (!foldedBrand.isEmpty() && (" " + foldedBrand).contains(" " + spelled.getFirst()) ? w.brandBonus() : 0)
                + (sameRegion ? w.regionBonus() : 0);
        return whole + points / TIE_BREAK_DIVISOR;
    }

    /** The finer points are divided by this: a few hundred at most become less than one, under the smallest whole step. */
    private static final double TIE_BREAK_DIVISOR = 1000.0;

    /**
     * How the name holds the query's first word, 0 to 5 (ADR-085 #8; the SQL's rank, read the same way): 0 the name is the query; 1 its
     * first word is that word and a comma follows ("Egg, whole"); 2 its first word is that word; 3 it starts with it; 4 some word starts
     * with it; 5 somewhere inside or not at all. The plural of the word counts as the word, and so does the plural in the name: the best of the readings.
     */
    static int tier(String folded, List<String> words) {
        // The name is read as it is and with each of its words made singular: "Eggs" is the word "egg" (a whole word, not a word that merely starts with it).
        String stemmed = Pattern.compile("[\\p{L}\\p{N}']+").matcher(folded).replaceAll(word -> FoodSearchTerms.singular(word.group()));
        int best = 5;
        for (String name : new String[] {folded, stemmed}) {
            String spaced = " " + name.replaceAll("[\\s,;:()/\"-]+", " ");
            for (boolean singular : new boolean[] {false, true}) {
                List<String> read = singular ? words.stream().map(FoodSearchTerms::singular).toList() : words;
                String first = read.getFirst();
                int rank = name.equals(String.join(" ", read)) ? 0
                        : name.startsWith(first + ",") ? 1
                        : spaced.equals(" " + first) || spaced.startsWith(" " + first + " ") ? 2
                        : name.startsWith(first) ? 3
                        : spaced.contains(" " + first) ? 4 : 5;
                best = Math.min(best, rank);
            }
        }
        return best;
    }

    /** Whether a way of holding a word counts as the word being there (not just somewhere inside another word, not missing). */
    private static boolean holds(Kind kind) {
        return kind == Kind.EXACT || kind == Kind.PREFIX || kind == Kind.FUZZY;
    }

    /** How one word of a name holds query word {@code i}. A plural is the singular ("Eggs" is the word "egg"). */
    private static Kind kind(String word, FoodSearchTerms terms, int i, Settings s) {
        String typed = terms.words().get(i);
        String singular = FoodSearchTerms.singular(typed);
        if (word.equals(typed) || word.equals(singular) || FoodSearchTerms.singular(word).equals(singular)) {
            return Kind.EXACT;
        }
        if (word.startsWith(typed) || word.startsWith(singular)) {
            return Kind.PREFIX;
        }
        if (word.contains(typed) || word.contains(singular)) {
            return Kind.INSIDE;
        }
        if (terms.fuzzy(i) && Math.abs(word.length() - typed.length()) <= s.typoMaxEdits()
                && distance(word, typed) <= Math.min(s.typoMaxEdits(), typed.length() / s.typoCharsPerEdit())) {
            return Kind.FUZZY;
        }
        return Kind.NONE;
    }

    private static List<String> words(String folded) {
        return Arrays.stream(folded.split("[^\\p{L}\\p{N}']+")).filter(word -> !word.isEmpty()).toList();
    }

    /** Edit distance (insert, delete, change one letter). */
    static int distance(String a, String b) {
        int[] previous = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            previous[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            int[] row = new int[b.length() + 1];
            row[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                row[j] = Math.min(Math.min(row[j - 1], previous[j]) + 1, previous[j - 1] + (a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1));
            }
            previous = row;
        }
        return previous[b.length()];
    }
}
