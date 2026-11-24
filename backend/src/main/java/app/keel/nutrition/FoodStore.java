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
    private static final String COLUMNS = "id, name, brand, source, region, kcal, protein_g, carbs_g, fat_g, grams_per_ml";

    private final JdbcClient jdbc;
    private final FoodRanking.Weights weights;
    private final FoodScoring.Settings scoring;
    private final TransactionTemplate transaction;

    FoodStore(JdbcClient jdbc, FoodRanking.Weights weights, FoodScoring.Settings scoring, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.weights = weights;
        this.scoring = scoring;
        this.transaction = new TransactionTemplate(transactions);
        this.transaction.setReadOnly(true);
    }

    /** A candidate as the database read it: the food, its source and region, and whether the user made it (own_food). */
    private record Row(Food food, String source, String region, boolean made) {
    }

    /** The search without a user: the order by the text alone. */
    List<Food> search(String query, int limit) {
        return search(query, limit, Searcher.ANYONE, List.of());
    }

    /**
     * Foods whose name or brand holds every word of the query (ADR-085 #7-9, K-1061, K-1208), best first, each name once.
     *
     * <p>Names and words are folded alike (lower case, ı and İ as i; the translate comes before lower, which leaves İ with a
     * combining dot) in nutrition.food.search_text, which a trigram index serves. The words are matched as text: LIKE's % and _
     * are escaped. A plural is read as its singular too ("eggs" holds "egg"). The database cuts a pool of the best candidates by a
     * coarse score (how the name holds the first word, how many words start a word of it, generic or brand, region); the pool then
     * gets (1) the foods the user logged lately that hold the words, however low the text puts them, so a staple is never cut,
     * (2) the user's own foods ({@code made}) and (3) with fewer exact finds than {@code typo-skip-exact-hits}, the foods spelled alike
     * (pg_trgm word similarity). {@link FoodScoring} scores every one of them on every word of the query, and {@link FoodRanking} adds
     * the logs (recency-weighted) and the favorites and cuts.
     */
    List<Food> search(String query, int limit, Searcher searcher, List<Food> made) {
        FoodSearchTerms terms = FoodSearchTerms.of(query);
        if (terms.words().isEmpty()) {
            return List.of();
        }
        int pool = Math.max(limit, weights.pool());
        Map<String, Row> rows = new LinkedHashMap<>();
        List<Row> exact = candidates(terms, searcher, false, pool);
        exact.forEach(row -> rows.putIfAbsent(row.food().id(), row));
        searcher.account().ifPresent(account -> ownLogged(terms, account).forEach(row -> rows.putIfAbsent(row.food().id(), row)));
        made.forEach(food -> rows.put(food.id(), new Row(food, "BRANDED", NO_REGION, true)));
        boolean typoWorthLookingFor = java.util.stream.IntStream.range(0, terms.words().size()).anyMatch(terms::fuzzy);
        if (typoWorthLookingFor && exact.size() < scoring.typoSkipExactHits()) {
            typos(terms, searcher, pool).forEach(row -> rows.putIfAbsent(row.food().id(), row));
        }
        List<String> ids = List.copyOf(rows.keySet());
        Set<String> starred = favorites(ids, searcher.account());
        String region = searcher.region().orElse(NO_REGION);
        List<FoodRanking.Hit> hits = rows.values().stream().map(row -> new FoodRanking.Hit(row.food(),
                FoodScoring.score(row.food().name(), row.food().brand(), row.source(), !region.isEmpty() && row.region().equals(region), terms, scoring, weights)
                        + (row.made() ? scoring.ownFoodBonus() : 0) + (starred.contains(row.food().id()) ? scoring.favoriteBonus() : 0))).toList();
        return withServings(FoodRanking.rank(hits, popularity(ids, searcher.account()), weights, limit));
    }

    /**
     * The foods that hold the words or words spelled alike. pg_trgm's word similarity needs its threshold set for the transaction
     * (keel.nutrition.search.typo-similarity: "chiken" is 0.50 of "chicken", "avacado" 0.45 of "avocado"; the database's 0.6 would
     * miss them) — the operator is served by the index at any threshold.
     */
    private List<Row> typos(FoodSearchTerms terms, Searcher searcher, int pool) {
        return transaction.execute(status -> {
            jdbc.sql("select set_config('pg_trgm.word_similarity_threshold', :threshold, true)")
                    .param("threshold", Double.toString(weights.typoSimilarity())).query().singleValue();
            return candidates(terms, searcher, true, pool);
        });
    }

    private List<Row> candidates(FoodSearchTerms terms, Searcher searcher, boolean typos, int pool) {
        Statement statement = statement(terms, searcher, typos, pool, weights);
        return jdbc.sql(statement.sql()).params(statement.params()).query((row, n) -> row(row)).list();
    }

    private static Row row(java.sql.ResultSet row) throws java.sql.SQLException {
        String region = row.getString("region");
        return new Row(food(row), row.getString("source"), region == null ? NO_REGION : region, false);
    }

    /** One log's weight: 1 now, a half every half-life (numeric, so a very old log is a very small number, not an error). */
    private static final String DECAY = "exp(-ln(2.0) * extract(epoch from (now() - m.eaten_at)) / 86400.0 / cast(:half as numeric))";

    /**
     * The foods the user logged within {@code own-lookback-days} that hold every word, the {@code own-pool} they eat most (each log weighs
     * 1 today and half as much {@code own-half-life-days} ago): the pool cut must not lose a staple to a hundred better texts.
     */
    private List<Row> ownLogged(FoodSearchTerms terms, UUID account) {
        if (scoring.ownPool() == 0) {
            return List.of();
        }
        Map<String, Object> params = new LinkedHashMap<>();
        String matches = matches(terms, false, params);
        params.put("account", account);
        params.put("half", scoring.ownHalfLifeDays());
        params.put("lookback", scoring.ownLookbackDays());
        params.put("ownPool", scoring.ownPool());
        String sql = """
                select {columns} from nutrition.food f join (
                    select mi.food_id, sum({decay}) as w
                    from nutrition.meal m join nutrition.meal_item mi on mi.meal_id = m.id
                    where m.account_id = :account and m.eaten_at >= now() - cast(:lookback as int) * interval '1 day'
                    group by mi.food_id) mine on mine.food_id = f.id
                where {matches}
                order by mine.w desc, f.id
                limit :ownPool"""
                .replace("{columns}", "f." + COLUMNS.replace(", ", ", f.")).replace("{decay}", DECAY).replace("{matches}", matches);
        return jdbc.sql(sql).params(params).query((row, n) -> row(row)).list();
    }

    /** The ids the user starred, of these. */
    private Set<String> favorites(List<String> ids, Optional<UUID> account) {
        if (ids.isEmpty() || account.isEmpty()) {
            return Set.of();
        }
        return Set.copyOf(jdbc.sql("select food_id from nutrition.food_favorite where account_id = :account and food_id = any (cast(:ids as text[]))")
                .param("account", account.get()).param("ids", ids.toArray(String[]::new)).query(String.class).list());
    }

    /** The WHERE of a search: every word held (or, with typos, held by a look-alike), the words' parameters put into {@code params}. */
    private static String matches(FoodSearchTerms terms, boolean typos, Map<String, Object> params) {
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
        return matches.toString();
    }

    /** The search as SQL with named parameters; a function of the query, the searcher and the weights, so it can be read without a database. */
    record Statement(String sql, Map<String, Object> params) {
    }

    static Statement statement(FoodSearchTerms terms, Searcher searcher, boolean typos, int pool, FoodRanking.Weights weights) {
        FoodSearchTerms singular = terms.singulars();
        Map<String, Object> params = new LinkedHashMap<>();
        String matches = matches(terms, typos, params);
        // How many words of the query start a word of the name: the coarse all-words part of the pool's cut (FoodScoring is the final score).
        StringBuilder started = new StringBuilder("0");
        for (int i = 0; i < terms.words().size(); i++) {
            started.append(" + (case when spaced_name like '% ' || cast(:p").append(i).append(" as text) || '%' then 1 else 0 end)");
            params.put("p" + i, terms.escapedWord(i));
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
                           + (cast(:rankStep as int) * ({started})) / 2
                           + {alike} as score
                    from ranked)
                select {columns}, score from (
                    select distinct on (folded_name, coalesce(brand, '')) *
                    from scored
                    order by folded_name, coalesce(brand, ''), score desc, source_rank, length(name), name, id) best
                order by score desc, source_rank, length(name), name, id
                limit :pool"""
                .replace("{matches}", matches).replace("{started}", started).replace("{alike}", alike).replace("{rank}", rankCase("whole", "first", "firstLike"))
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
        record Others(String food, int accounts) {
        }
        record Mine(String food, double weight) {
        }
        UUID me = account.orElse(NOBODY);
        String[] foods = ids.toArray(String[]::new);
        Map<String, Integer> others = jdbc.sql("""
                select food_id, count(distinct account_id) as others
                from nutrition.meal_item where food_id = any (cast(:ids as text[])) and account_id <> :account group by food_id""")
                .param("ids", foods).param("account", me)
                .query((row, n) -> new Others(row.getString("food_id"), row.getInt("others"))).list().stream()
                .collect(Collectors.toMap(Others::food, Others::accounts));
        Map<String, Double> mine = account.isEmpty() ? Map.of() : jdbc.sql("""
                select mi.food_id, sum({decay}) as w
                from nutrition.meal_item mi join nutrition.meal m on m.id = mi.meal_id
                where mi.account_id = :account and mi.food_id = any (cast(:ids as text[]))
                  and m.eaten_at >= now() - cast(:lookback as int) * interval '1 day'
                group by mi.food_id""".replace("{decay}", DECAY))
                .param("ids", foods).param("account", me).param("half", scoring.ownHalfLifeDays()).param("lookback", scoring.ownLookbackDays())
                .query((row, n) -> new Mine(row.getString("food_id"), row.getDouble("w"))).list().stream()
                .collect(Collectors.toMap(Mine::food, Mine::weight));
        Map<String, FoodRanking.Popularity> popularity = new java.util.HashMap<>();
        for (String id : ids) {
            popularity.put(id, new FoodRanking.Popularity(mine.getOrDefault(id, 0.0), others.getOrDefault(id, 0)));
        }
        return popularity;
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
