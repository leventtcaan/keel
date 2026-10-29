package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * What the logs add to the search's text scores (K-1061, ADR-090 #1): the foods this user logs first, then the foods everyone
 * logs, never a food that did not match. No database here.
 */
class FoodRankingTests {

    // The weights of application.yml.
    private static final FoodRanking.Weights WEIGHTS = new FoodRanking.Weights(20, 25, 30, 15, 8, 5, 4, 100, 0.45, 20);

    private static FoodStore.Food food(String id) {
        return new FoodStore.Food(id, id, null, FoodRanges.Source.ANALYSED, new FoodRanges.Per100g(BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE),
                null, List.of());
    }

    private static List<String> ids(List<FoodStore.Food> foods) {
        return foods.stream().map(FoodStore.Food::id).toList();
    }

    @Test
    void withoutLogsTheTextOrderStands() {
        List<FoodRanking.Hit> hits = List.of(new FoodRanking.Hit(food("a"), 100), new FoodRanking.Hit(food("b"), 100), new FoodRanking.Hit(food("c"), 60));

        assertThat(ids(FoodRanking.rank(hits, Map.of(), WEIGHTS, 10))).containsExactly("a", "b", "c");
    }

    @Test
    void theUsersOwnLogsLiftAFoodOverABetterNameMatch() {
        // "Granola bar" (70) the user logs five times is above the exact "Granola" (100) they never log.
        List<FoodRanking.Hit> hits = List.of(new FoodRanking.Hit(food("granola"), 100), new FoodRanking.Hit(food("granola-bar"), 70));

        assertThat(ids(FoodRanking.rank(hits, Map.of("granola-bar", new FoodRanking.Popularity(5, 0)), WEIGHTS, 10))).containsExactly("granola-bar", "granola");
        assertThat(ids(FoodRanking.rank(hits, Map.of("granola-bar", new FoodRanking.Popularity(1, 0)), WEIGHTS, 10))).containsExactly("granola", "granola-bar");
    }

    @Test
    void ownLogsCountOnlyUpToTheCap() {
        assertThat(FoodRanking.bonus(new FoodRanking.Popularity(5, 0), WEIGHTS)).isEqualTo(40);
        assertThat(FoodRanking.bonus(new FoodRanking.Popularity(500, 0), WEIGHTS)).isEqualTo(40);
    }

    @Test
    void otherAccountsCountOnlyFromTheMinimumNumberOfDistinctAccountsAndByTheirLogarithm() {
        // Security review: one account logging a rare food must not show in another user's order.
        for (int accounts = 0; accounts < 20; accounts++) {
            assertThat(FoodRanking.bonus(new FoodRanking.Popularity(0, accounts), WEIGHTS)).as(accounts + " other accounts").isZero();
        }
        int atTheMinimum = FoodRanking.bonus(new FoodRanking.Popularity(0, 20), WEIGHTS);
        int many = FoodRanking.bonus(new FoodRanking.Popularity(0, 500), WEIGHTS);

        assertThat(FoodRanking.bonus(FoodRanking.Popularity.NONE, WEIGHTS)).isZero();
        assertThat(atTheMinimum).isEqualTo(12);
        assertThat(many).isGreaterThan(atTheMinimum);
    }

    @Test
    void otherAccountsNeverPutAFoodAheadOfABetterNameMatch() {
        // Their bonus stays under one step of the name match (20), however many they are.
        assertThat(FoodRanking.bonus(new FoodRanking.Popularity(0, 1_000_000), WEIGHTS)).isEqualTo(19);
        List<FoodRanking.Hit> hits = List.of(new FoodRanking.Hit(food("exact"), 100), new FoodRanking.Hit(food("prefix"), 80));

        assertThat(ids(FoodRanking.rank(hits, Map.of("prefix", new FoodRanking.Popularity(0, 1_000_000)), WEIGHTS, 10))).containsExactly("exact", "prefix");
    }

    @Test
    void fewerThanTheMinimumAccountsChangeNoOrderAndTheMinimumDoes() {
        List<FoodRanking.Hit> hits = List.of(new FoodRanking.Hit(food("a"), 80), new FoodRanking.Hit(food("b"), 80));

        assertThat(ids(FoodRanking.rank(hits, Map.of("b", new FoodRanking.Popularity(0, 19)), WEIGHTS, 10))).containsExactly("a", "b");
        assertThat(ids(FoodRanking.rank(hits, Map.of("b", new FoodRanking.Popularity(0, 20)), WEIGHTS, 10))).containsExactly("b", "a");
    }

    @Test
    void theCommonFoodBeatsAnObscureOneOfTheSameTextScore() {
        List<FoodRanking.Hit> hits = List.of(new FoodRanking.Hit(food("rare"), 80), new FoodRanking.Hit(food("common"), 80));

        assertThat(ids(FoodRanking.rank(hits, Map.of("common", new FoodRanking.Popularity(0, 2000)), WEIGHTS, 10))).containsExactly("common", "rare");
    }

    @Test
    void theListIsCutAtTheLimitAfterTheBonuses() {
        List<FoodRanking.Hit> hits = List.of(new FoodRanking.Hit(food("a"), 100), new FoodRanking.Hit(food("b"), 90), new FoodRanking.Hit(food("c"), 80));

        assertThat(ids(FoodRanking.rank(hits, Map.of("c", new FoodRanking.Popularity(5, 0)), WEIGHTS, 2))).containsExactly("c", "a");
    }

    @Test
    void weightsThatCannotRankAreRefusedAtStart() {
        assertThatThrownBy(() -> new FoodRanking.Weights(20, 25, 30, 15, 8, 5, 4, 100, 0.45, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FoodRanking.Weights(0, 25, 30, 15, 8, 5, 4, 100, 0.45, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FoodRanking.Weights(20, 25, 30, 15, 8, 5, 4, 0, 0.45, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FoodRanking.Weights(20, 25, 30, 15, 8, 5, 4, 100, 0, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FoodRanking.Weights(20, 25, 30, 15, 8, -1, 4, 100, 0.45, 20)).isInstanceOf(IllegalArgumentException.class);
    }
}
