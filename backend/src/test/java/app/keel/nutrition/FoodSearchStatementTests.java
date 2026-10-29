package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** The search's SQL (K-1061) read without a database: every placeholder has a value, typos are asked for only when asked. */
class FoodSearchStatementTests {

    private static final FoodRanking.Weights WEIGHTS = new FoodRanking.Weights(20, 25, 30, 15, 8, 5, 4, 100, 0.45);
    private static final FoodStore.Searcher US = new FoodStore.Searcher(Optional.empty(), Optional.of("US"));

    private static FoodStore.Statement statement(String query, boolean typos) {
        return FoodStore.statement(FoodSearchTerms.of(query), US, typos, 100, WEIGHTS);
    }

    /** The :names in the SQL outside quoted text and comments (the regex class "[[:space:]]" is quoted text). */
    private static Set<String> placeholders(String sql) {
        String bare = sql.replaceAll("--[^\n]*", "").replaceAll("'[^']*'", "''");
        Set<String> names = new HashSet<>();
        Matcher match = Pattern.compile("(?<!:):([a-zA-Z][a-zA-Z0-9]*)").matcher(bare);
        while (match.find()) {
            names.add(match.group(1));
        }
        return names;
    }

    @Test
    void everyPlaceholderHasAValueAndEveryValueAPlaceholder() {
        for (String query : new String[] {"egg", "rice white", "Chicken breast raw", "100%_pure", "ülker gofret", "bananas"}) {
            for (boolean typos : new boolean[] {false, true}) {
                FoodStore.Statement statement = statement(query, typos);

                assertThat(statement.sql()).doesNotContain("{", "}");
                assertThat(placeholders(statement.sql())).as(query + " typos=" + typos).isEqualTo(statement.params().keySet());
            }
        }
    }

    @Test
    void aTypoIsAskedForOnlyOnTheSecondRead() {
        FoodStore.Statement exact = statement("bananna", false);
        FoodStore.Statement typos = statement("bananna", true);

        assertThat(exact.sql()).doesNotContain("<%").doesNotContain("word_similarity");
        assertThat(typos.sql()).contains("cast(:t0 as text) <% f.search_text").contains("word_similarity(cast(:t0 as text), search_text)");
        assertThat(typos.params()).containsEntry("t0", "bananna");
    }

    @Test
    void onlyTheWordsThatMayHaveATypoAreAskedAboutAndTheLikenessFollowsTheFirstOfThem() {
        FoodStore.Statement statement = statement("egg chiken", true);

        assertThat(statement.sql()).as("egg is three letters").doesNotContain(":t0");
        assertThat(statement.sql()).contains("cast(:t1 as text) <% f.search_text").contains("word_similarity(cast(:t1 as text), search_text)");
    }

    @Test
    void everyWordMustMatchAndEachBringsItsPluralAndSingular() {
        FoodStore.Statement statement = statement("blueberries pancakes", false);

        assertThat(statement.sql()).contains("f.search_text like any (cast(:w0 as text[])) and f.search_text like any (cast(:w1 as text[]))");
        assertThat((String[]) statement.params().get("w0")).containsExactly("%blueberries%", "%blueberry%");
        assertThat((String[]) statement.params().get("w1")).containsExactly("%pancakes%", "%pancake%");
        assertThat(statement.params()).containsEntry("firstLike", "blueberries").containsEntry("firstLikeS", "blueberry").containsEntry("wholeS", "blueberry pancake");
    }

    @Test
    void theRegionAndTheWeightsAreParametersNotText() {
        FoodStore.Statement statement = statement("egg", false);

        assertThat(statement.params()).containsEntry("region", "US").containsEntry("rankStep", 20).containsEntry("genericBonus", 25)
                .containsEntry("brandBonus", 30).containsEntry("regionBonus", 15).containsEntry("pool", 100);
        assertThat(FoodStore.statement(FoodSearchTerms.of("egg"), FoodStore.Searcher.ANYONE, false, 100, WEIGHTS).params()).containsEntry("region", "");
    }
}
