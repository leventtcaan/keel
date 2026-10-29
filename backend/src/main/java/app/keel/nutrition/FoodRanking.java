package app.keel.nutrition;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * How the food search orders what it found (K-1061, ADR-090 #1). The database scores the text of each candidate (how the
 * name matches, a generic food for a generic word, a brand for a brand word, the user's region); this adds what only the logs
 * know — the foods this user logs, and the foods everyone logs — and cuts the list. Pure: the scores and counts come in.
 *
 * <p>A candidate's popularity is a bonus on its text score, never a match on its own: a food that does not hold the words is
 * not a candidate. The user's own logs count first (a point each up to a cap: the food they eat is the one they mean), the
 * logs of everyone by their logarithm (ten logs are worth much more than none, ten thousand are not worth a thousand times).
 * The ties the bonuses leave keep the database's order (source, shorter name).
 */
final class FoodRanking {

    /** How often a food is logged: by this user, by everyone. */
    record Popularity(int mine, int everyone) {
        static final Popularity NONE = new Popularity(0, 0);
    }

    /** What the database made of one candidate. */
    record Hit(FoodStore.Food food, int score) {
    }

    /**
     * The weights of the ranking (keel.nutrition.search): the text score's steps (applied in SQL), and the popularity bonuses.
     * {@code rankStep} points for each step of how well the name matches (6 steps, 0 to 5), {@code genericBonus} for a generic
     * food whose name starts with the word, {@code brandBonus} for a brand the word starts, {@code regionBonus} for the user's
     * region, {@code personalBonus} points per own log up to {@code personalCap} logs, {@code globalBonus} points per
     * natural-log unit of everyone's logs, {@code pool} candidates read before the cut, {@code typoSimilarity} (0 to 1) how like
     * a typed word another must be spelled to be offered when the exact search finds few (pg_trgm word similarity).
     */
    @ConfigurationProperties("keel.nutrition.search")
    record Weights(int rankStep, int genericBonus, int brandBonus, int regionBonus, int personalBonus, int personalCap, int globalBonus, int pool,
            double typoSimilarity) {

        public Weights {
            if (rankStep < 1 || pool < 1 || personalCap < 0 || typoSimilarity <= 0 || typoSimilarity > 1) {
                throw new IllegalArgumentException(
                        "keel.nutrition.search: rank-step and pool at least 1, personal-cap not negative, typo-similarity in (0, 1]");
            }
        }
    }

    private FoodRanking() {
    }

    /** The bonus a food's logs earn. */
    static int bonus(Popularity popularity, Weights weights) {
        return Math.min(popularity.mine(), weights.personalCap()) * weights.personalBonus()
                + (int) Math.round(weights.globalBonus() * Math.log1p(popularity.everyone()));
    }

    /** The hits by text score plus popularity, best first, at most {@code limit}; a tie keeps the order the hits came in. */
    static List<FoodStore.Food> rank(List<Hit> hits, Map<String, Popularity> popularity, Weights weights, int limit) {
        return hits.stream()
                .sorted(Comparator.comparingInt((Hit hit) -> hit.score() + bonus(popularity.getOrDefault(hit.food().id(), Popularity.NONE), weights))
                        .reversed())
                .limit(limit).map(Hit::food).toList();
    }
}
