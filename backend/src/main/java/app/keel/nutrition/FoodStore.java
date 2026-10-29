package app.keel.nutrition;

import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** The food tables (K-208, K-1061): read-only here; the FDC and Open Food Facts imports write them. */
@Repository
class FoodStore {

    record Serving(String name, BigDecimal grams) {
    }

    record Food(String id, String name, String brand, FoodRanges.Source source, FoodRanges.Per100g per100g, BigDecimal gramsPerMl,
            List<Serving> servings) {
    }

    /** Who is searching: their own logs rank first, their region's foods ahead of the rest. Either may be unknown. */
    record Searcher(Optional<UUID> account, Optional<String> region) {
        static final Searcher ANYONE = new Searcher(Optional.empty(), Optional.empty());
    }

    private static final String NO_REGION = "";
    private static final UUID NOBODY = new UUID(0, 0);
    // The columns a Food is read from; the search adds its score.
    private static final String COLUMNS = "id, name, brand, source, kcal, protein_g, carbs_g, fat_g, grams_per_ml";

    private final JdbcClient jdbc;
    private final FoodRanking.Weights weights;
    private final TransactionTemplate transaction;

    FoodStore(JdbcClient jdbc, FoodRanking.Weights weights, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.weights = weights;
        this.transaction = new TransactionTemplate(transactions);
        this.transaction.setReadOnly(true);
    }

    /** The search without a user: the order by the text alone. */
    List<Food> search(String query, int limit) {
        return search(query, limit, Searcher.ANYONE);
    }

    /**
     * Foods whose name or brand holds every word of the query (ADR-085 #7-9, K-1061), best first, each name once.
     *
     * <p>Names and words are folded alike (lower case, ı and İ as i; the translate comes before lower, which leaves İ with a
     * combining dot) in nutrition.food.search_text, which a trigram index serves. The words are matched as text: LIKE's % and _
     * are escaped. A plural is read as its singular too ("eggs" holds "egg"). The score of a candidate: by word boundary on the
     * folded name — 0 the name is the query; 1 its first word is the query's first word and a comma follows ("Egg, whole"); 2
     * its first word is that word; 3 it starts with it; 4 some word of it starts with it; 5 it holds it somewhere — each step
     * {@code rank-step} points, a generic food (Foundation, SR Legacy, Survey) that starts with the word {@code generic-bonus}
     * more (so "egg" is the egg before a product called "Eggs"), a product whose brand a word starts {@code brand-bonus}
     * ("chobani"), a food of the user's region {@code region-bonus}. Of foods with one folded name and brand the best by that
     * score is kept, and the best few (the pool) go on to {@link FoodRanking}, which adds what the user's own logs and everyone's
     * say. With fewer results than asked, a second read allows a typo in the longer words (pg_trgm word similarity), those after
     * the exact ones.
     */
    List<Food> search(String query, int limit, Searcher searcher) {
        FoodSearchTerms terms = FoodSearchTerms.of(query);
        if (terms.words().isEmpty()) {
            return List.of();
        }
        int pool = Math.max(limit, weights.pool());
        List<FoodRanking.Hit> hits = new ArrayList<>(candidates(terms, searcher, false, pool));
        boolean typoWorthLookingFor = java.util.stream.IntStream.range(0, terms.words().size()).anyMatch(terms::fuzzy);
        if (hits.size() < limit && typoWorthLookingFor) {
            Set<String> found = hits.stream().map(hit -> hit.food().id()).collect(Collectors.toSet());
            // Below every exact match: a food spelled as asked beats one spelled alike.
            int below = weights.rankStep() * 6;
            typos(terms, searcher, limit).stream().filter(hit -> !found.contains(hit.food().id()))
                    .forEach(hit -> hits.add(new FoodRanking.Hit(hit.food(), hit.score() - below)));
        }
        Map<String, FoodRanking.Popularity> popularity = popularity(hits.stream().map(hit -> hit.food().id()).toList(), searcher.account());
        return withServings(FoodRanking.rank(hits, popularity, weights, limit));
    }

    /**
     * The foods that hold the words or words spelled alike. pg_trgm's word similarity needs its threshold set for the transaction
     * (keel.nutrition.search.typo-similarity: "chiken" is 0.50 of "chicken", "avacado" 0.45 of "avocado"; the database's 0.6 would
     * miss them) — the operator is served by the index at any threshold.
     */
    private List<FoodRanking.Hit> typos(FoodSearchTerms terms, Searcher searcher, int limit) {
        return transaction.execute(status -> {
            jdbc.sql("select set_config('pg_trgm.word_similarity_threshold', :threshold, true)")
                    .param("threshold", Double.toString(weights.typoSimilarity())).query().singleValue();
            return candidates(terms, searcher, true, limit);
        });
    }

    private List<FoodRanking.Hit> candidates(FoodSearchTerms terms, Searcher searcher, boolean typos, int pool) {
        Statement statement = statement(terms, searcher, typos, pool, weights);
        return jdbc.sql(statement.sql()).params(statement.params()).query((row, n) -> new FoodRanking.Hit(food(row), row.getInt("score"))).list();
    }

    /** The search as SQL with named parameters; a function of the query, the searcher and the weights, so it can be read without a database. */
    record Statement(String sql, Map<String, Object> params) {
    }

    static Statement statement(FoodSearchTerms terms, Searcher searcher, boolean typos, int pool, FoodRanking.Weights weights) {
        FoodSearchTerms singular = terms.singulars();
        Map<String, Object> params = new LinkedHashMap<>();
        StringBuilder matches = new StringBuilder();
        for (int i = 0; i < terms.words().size(); i++) {
            String like = "f.search_text like any (cast(:w" + i + " as text[]))";
            params.put("w" + i, terms.containsAny(i));
            if (i > 0) {
                matches.append(" and ");
            }
            if (typos && terms.fuzzy(i)) {
                // <% is pg_trgm's word similarity (its threshold, 0.6, is the database's): the index serves it.
                matches.append("(").append(like).append(" or cast(:t").append(i).append(" as text) <% f.search_text)");
                params.put("t" + i, terms.words().get(i));
            } else {
                matches.append(like);
            }
        }
        params.put("dotted", FoodSearchTerms.DOTTED_AND_DOTLESS);
        params.put("whole", terms.whole());
        params.put("first", terms.first());
        params.put("firstLike", terms.firstEscaped());
        params.put("wholeS", singular.whole());
        params.put("firstS", singular.first());
        params.put("firstLikeS", singular.firstEscaped());
        params.put("rankStep", weights.rankStep());
        params.put("genericBonus", weights.genericBonus());
        params.put("brandBonus", weights.brandBonus());
        params.put("regionBonus", weights.regionBonus());
        params.put("region", searcher.region().orElse(NO_REGION));
        // Among the foods spelled alike, the likest first: the first word that may have a typo says how alike.
        String alike = "0";
        for (int i = 0; typos && i < terms.words().size(); i++) {
            if (terms.fuzzy(i)) {
                alike = "cast(round(word_similarity(cast(:t" + i + " as text), search_text) * cast(:rankStep as int) * 2) as int)";
                break;
            }
        }
        params.put("pool", pool);
        String sql = """
                with matching as (
                    select f.*,
                           lower(translate(f.name, :dotted, 'ii')) as folded_name,
                           lower(translate(coalesce(f.brand, ''), :dotted, 'ii')) as folded_brand
                    from nutrition.food f
                    where {matches}),
                spaced as (
                    select matching.*,
                           -- the name as words behind a space: commas, brackets, slashes, hyphens, runs of spaces become one space
                           ' ' || regexp_replace(folded_name, '[[:space:],;:()/"-]+', ' ', 'g') as spaced_name
                    from matching),
                ranked as (
                    select spaced.*,
                           least({rank}, {rankS}) as word_rank,
                           case source when 'FOUNDATION' then 0 when 'SR_LEGACY' then 1 when 'FNDDS' then 2 else 3 end as source_rank
                    from spaced),
                scored as (
                    select ranked.*,
                           (5 - word_rank) * cast(:rankStep as int)
                           + case when source <> 'BRANDED' and word_rank <= 2 then cast(:genericBonus as int) else 0 end
                           + case when folded_brand <> '' and ' ' || folded_brand like '% ' || cast(:firstLike as text) || '%' then cast(:brandBonus as int) else 0 end
                           + case when region = cast(:region as text) then cast(:regionBonus as int) else 0 end
                           + {alike} as score
                    from ranked)
                select {columns}, score from (
                    select distinct on (folded_name, coalesce(brand, '')) *
                    from scored
                    order by folded_name, coalesce(brand, ''), score desc, source_rank, length(name), name, id) best
                order by score desc, source_rank, length(name), name, id
                limit :pool"""
                .replace("{matches}", matches).replace("{alike}", alike).replace("{rank}", rankCase("whole", "first", "firstLike"))
                .replace("{rankS}", rankCase("wholeS", "firstS", "firstLikeS")).replace("{columns}", COLUMNS);
        return new Statement(sql, params);
    }

    /** How well the folded name holds the query, 0 to 5 (see {@link #search}); the parameters are the query's whole, first word and first word as LIKE text. */
    private static String rankCase(String whole, String first, String firstLike) {
        return "(case when folded_name = cast(:" + whole + " as text) then 0"
                + " when folded_name like cast(:" + firstLike + " as text) || ',%' then 1"
                + " when spaced_name = ' ' || cast(:" + first + " as text) or spaced_name like ' ' || cast(:" + firstLike + " as text) || ' %' then 2"
                + " when folded_name like cast(:" + firstLike + " as text) || '%' then 3"
                + " when spaced_name like '% ' || cast(:" + firstLike + " as text) || '%' then 4"
                + " else 5 end)";
    }

    /**
     * How each food was logged: by the user (times), by how many other accounts (distinct; the user's own are not among them). Only
     * counts leave the database; FoodRanking uses the other accounts' count only above a minimum.
     */
    private Map<String, FoodRanking.Popularity> popularity(List<String> ids, Optional<UUID> account) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        record Row(String food, FoodRanking.Popularity popularity) {
        }
        return jdbc.sql("""
                select food_id, count(distinct account_id) filter (where account_id <> :account) as others,
                       count(*) filter (where account_id = :account) as mine
                from nutrition.meal_item where food_id = any (cast(:ids as text[])) group by food_id""")
                .param("ids", ids.toArray(String[]::new)).param("account", account.orElse(NOBODY))
                .query((row, n) -> new Row(row.getString("food_id"), new FoodRanking.Popularity(row.getInt("mine"), row.getInt("others"))))
                .list().stream().collect(Collectors.toMap(Row::food, Row::popularity));
    }

    Optional<Food> find(String id) {
        return jdbc.sql("select * from nutrition.food where id = :id").param("id", id).query((row, n) -> food(row)).optional()
                .map(food -> withServings(List.of(food)).getFirst());
    }

    /** The product with this barcode, as GTIN-14, wherever it is from: USDA's label first, then a product of the user's region. */
    Optional<Food> byGtin(String gtin14) {
        return byGtin(gtin14, Optional.empty());
    }

    Optional<Food> byGtin(String gtin14, Optional<String> region) {
        // A barcode may be in USDA's Branded Foods and in the Open Food Facts files of two regions: one product of them is answered.
        // Of USDA's, the highest id (FDC numbers its releases' products upward: more digits, then larger).
        return jdbc.sql("""
                select * from nutrition.food where gtin = :gtin
                order by case dataset when 'FDC' then 0 else 1 end, case when region = :region then 0 else 1 end, length(id) desc, id desc
                limit 1""")
                .param("gtin", gtin14).param("region", region.orElse(NO_REGION)).query((row, n) -> food(row)).optional()
                .map(food -> withServings(List.of(food)).getFirst());
    }

    private static Food food(java.sql.ResultSet row) throws java.sql.SQLException {
        return new Food(row.getString("id"), row.getString("name"), row.getString("brand"),
                "BRANDED".equals(row.getString("source")) ? FoodRanges.Source.BRANDED : FoodRanges.Source.ANALYSED,
                new FoodRanges.Per100g(row.getBigDecimal("kcal"), row.getBigDecimal("protein_g"), row.getBigDecimal("carbs_g"),
                        row.getBigDecimal("fat_g")),
                row.getBigDecimal("grams_per_ml"), List.of());
    }

    /** The foods with their servings, in one read for all of them. */
    private List<Food> withServings(List<Food> foods) {
        if (foods.isEmpty()) {
            return foods;
        }
        record Row(String food, Serving serving) {
        }
        Map<String, List<Serving>> servings = jdbc.sql("""
                select food_id, name, grams from nutrition.food_serving where food_id = any (cast(:ids as text[])) order by food_id, seq""")
                .param("ids", foods.stream().map(Food::id).toArray(String[]::new))
                .query((row, n) -> new Row(row.getString("food_id"), new Serving(row.getString("name"), Decimals.plain(row.getBigDecimal("grams")))))
                .list().stream().collect(Collectors.groupingBy(Row::food, Collectors.mapping(Row::serving, Collectors.toList())));
        return foods.stream().map(food -> new Food(food.id(), food.name(), food.brand(), food.source(), food.per100g(), food.gramsPerMl(),
                List.copyOf(servings.getOrDefault(food.id(), List.of())))).toList();
    }
}
