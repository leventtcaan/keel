package app.keel.nutrition;

import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Locale;
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
     * Foods whose name or brand holds every word, names that start with the first word first, then shorter names. The
     * words are matched as text: LIKE's % and _ are escaped.
     */
    List<Food> search(String query, int limit) {
        String[] words = Arrays.stream(query.toLowerCase(Locale.ROOT).trim().split("\\s+"))
                .map(word -> "%" + escape(word) + "%").toArray(String[]::new);
        List<Food> foods = jdbc.sql("""
                select * from nutrition.food
                where lower(name || ' ' || coalesce(brand, '')) like all (cast(:words as text[]))
                order by lower(name) like :first desc, length(name), name, id limit :limit""")
                .param("words", words).param("first", words[0].substring(1)).param("limit", limit)
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

    private static String escape(String word) {
        return word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
