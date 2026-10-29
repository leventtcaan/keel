package app.keel.nutrition;

import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The food tables (K-208): read-only here; the FDC import writes them. */
@Repository
class FoodStore {

    record Serving(String name, BigDecimal grams) {
    }

    record Food(String id, String name, String brand, FoodRanges.Source source, FoodRanges.Per100g per100g, BigDecimal gramsPerMl,
            List<Serving> servings) {
    }

    private final JdbcClient jdbc;

    FoodStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Foods whose name or brand holds every word of the query (ADR-085 #7-9), best first, each name once.
     *
     * <p>Names and words are folded alike (lower case, ı and İ as i; the translate comes before lower, which leaves İ with a
     * combining dot). The words are matched as text: LIKE's % and _ are escaped. The order is by word boundary on the
     * folded name — 0 the name is the query; 1 its first word is the query's first word and a comma follows ("Egg, whole");
     * 2 its first word is that word; 3 it starts with it; 4 some word of it starts with it; 5 it holds it somewhere —
     * then Foundation before SR Legacy before Branded, then the shorter name. Of foods with one folded name and brand
     * the first by that order is kept, and only then is the limit applied.
     */
    List<Food> search(String query, int limit) {
        FoodSearchTerms terms = FoodSearchTerms.of(query);
        if (terms.words().isEmpty()) {
            return List.of();
        }
        List<Food> foods = jdbc.sql("""
                with folded as (
                    select food.*,
                           lower(translate(name, :dotted, 'ii')) as folded_name,
                           lower(translate(name || ' ' || coalesce(brand, ''), :dotted, 'ii')) as folded_text
                    from nutrition.food),
                matching as (
                    select folded.*,
                           -- the name as words behind a space: commas, brackets, slashes, hyphens, runs of spaces become one space
                           ' ' || regexp_replace(folded_name, '[[:space:],;:()/"-]+', ' ', 'g') as spaced
                    from folded
                    where folded_text like all (cast(:contains as text[]))),
                ranked as (
                    select matching.*,
                           case
                               when folded_name = cast(:whole as text) then 0
                               when folded_name like cast(:firstLike as text) || ',%' then 1
                               when spaced = ' ' || cast(:first as text) or spaced like ' ' || cast(:firstLike as text) || ' %' then 2
                               when folded_name like cast(:firstLike as text) || '%' then 3
                               when spaced like '% ' || cast(:firstLike as text) || '%' then 4
                               else 5
                           end as word_rank,
                           case source when 'FOUNDATION' then 0 when 'SR_LEGACY' then 1 else 2 end as source_rank
                    from matching)
                select * from (
                    select distinct on (folded_name, coalesce(brand, '')) *
                    from ranked
                    order by folded_name, coalesce(brand, ''), word_rank, source_rank, length(name), name, id) best
                order by word_rank, source_rank, length(name), name, id
                limit :limit""")
                .param("dotted", FoodSearchTerms.DOTTED_AND_DOTLESS).param("contains", terms.contains()).param("whole", terms.whole())
                .param("first", terms.first()).param("firstLike", terms.firstEscaped()).param("limit", limit)
                .query((row, n) -> food(row)).list();
        return withServings(foods);
    }

    Optional<Food> find(String id) {
        return jdbc.sql("select * from nutrition.food where id = :id").param("id", id).query((row, n) -> food(row)).optional()
                .map(food -> withServings(List.of(food)).getFirst());
    }

    /** The product with this barcode, as GTIN-14. */
    Optional<Food> byGtin(String gtin14) {
        return jdbc.sql("select * from nutrition.food where gtin = :gtin").param("gtin", gtin14).query((row, n) -> food(row)).optional()
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
