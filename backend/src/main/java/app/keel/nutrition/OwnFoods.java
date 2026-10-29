package app.keel.nutrition;

import app.keel.shared.AccountId;
import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * The user's own foods (K-1063, ADR-090 Ek 3): a label's numbers for one serving, typed in for a product the database does not
 * have. Stored per 100 g and read back as a {@link FoodStore.Food} with the one serving, so the search, the barcode lookup, the
 * estimate and the portions treat it like a product (its numbers are a label's: {@link FoodRanges.Source#BRANDED}). Only its
 * account sees it: every read here takes the account. Its id is {@code own:<uuid>}.
 */
@Repository
class OwnFoods {

    static final String PREFIX = "own:";

    /** What the user typed: the numbers are for one serving of {@code servingGrams}. */
    record NewOwn(String name, String brand, String gtin, BigDecimal servingGrams, BigDecimal kcal, BigDecimal proteinG, BigDecimal carbsG,
            BigDecimal fatG) {
    }

    /** An own food as stored, for the export: per 100 g and the serving's weight. */
    record Stored(String id, String name, String brand, String gtin, BigDecimal servingGrams, BigDecimal kcalPer100g, BigDecimal proteinPer100g,
            BigDecimal carbsPer100g, BigDecimal fatPer100g, Instant createdAt) {
    }

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final int DECIMALS = 2;

    private final JdbcClient jdbc;

    OwnFoods(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    int count(AccountId account) {
        return jdbc.sql("select count(*) from nutrition.own_food where account_id = :account").param("account", account.value())
                .query(Integer.class).single();
    }

    /** Stores the food; {@code gtin14} is the barcode as GTIN-14, or empty. */
    FoodStore.Food create(AccountId account, NewOwn food, Optional<String> gtin14) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                insert into nutrition.own_food (id, account_id, name, brand, gtin, serving_grams, kcal, protein_g, carbs_g, fat_g, created_at)
                values (:id, :account, :name, :brand, :gtin, :serving, :kcal, :protein, :carbs, :fat, now())""")
                .param("id", id).param("account", account.value()).param("name", food.name()).param("brand", food.brand())
                .param("gtin", gtin14.orElse(null)).param("serving", food.servingGrams())
                .param("kcal", per100g(food.kcal(), food.servingGrams())).param("protein", per100g(food.proteinG(), food.servingGrams()))
                .param("carbs", per100g(food.carbsG(), food.servingGrams())).param("fat", per100g(food.fatG(), food.servingGrams()))
                .update();
        return find(account, PREFIX + id).orElseThrow();
    }

    /** The per-100 g value of a serving's number; the serving's weight is above 0. */
    static BigDecimal per100g(BigDecimal perServing, BigDecimal servingGrams) {
        return perServing.multiply(HUNDRED).divide(servingGrams, DECIMALS, RoundingMode.HALF_UP);
    }

    Optional<FoodStore.Food> find(AccountId account, String id) {
        UUID uuid;
        try {
            uuid = UUID.fromString(id.substring(PREFIX.length()));
        } catch (IllegalArgumentException | IndexOutOfBoundsException notOurs) {
            return Optional.empty();
        }
        return jdbc.sql("select * from nutrition.own_food where id = :id and account_id = :account").param("id", uuid)
                .param("account", account.value()).query((row, n) -> food(row)).optional();
    }

    /** The user's foods whose name or brand holds every word (any case, Turkish dotless i as i), newest first. */
    List<FoodStore.Food> search(AccountId account, FoodSearchTerms terms, int limit) {
        if (terms.words().isEmpty()) {
            return List.of();
        }
        Map<String, Object> params = new HashMap<>();
        StringBuilder where = new StringBuilder("account_id = :account");
        params.put("account", account.value());
        for (int i = 0; i < terms.words().size(); i++) {
            where.append(" and lower(translate(name || ' ' || coalesce(brand, ''), :dotted, 'ii')) like :w").append(i).append(" escape '\\'");
            params.put("w" + i, "%" + terms.words().get(i).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        params.put("dotted", FoodSearchTerms.DOTTED_AND_DOTLESS);
        params.put("limit", limit);
        return jdbc.sql("select * from nutrition.own_food where " + where + " order by created_at desc, id limit :limit").params(params)
                .query((row, n) -> food(row)).list();
    }

    Optional<FoodStore.Food> byGtin(AccountId account, String gtin14) {
        return jdbc.sql("select * from nutrition.own_food where account_id = :account and gtin = :gtin order by created_at desc limit 1")
                .param("account", account.value()).param("gtin", gtin14).query((row, n) -> food(row)).optional();
    }

    List<Stored> all(AccountId account) {
        return jdbc.sql("select * from nutrition.own_food where account_id = :account order by created_at, id").param("account", account.value())
                .query((row, n) -> new Stored(PREFIX + row.getObject("id", UUID.class), row.getString("name"), row.getString("brand"),
                        row.getString("gtin"), Decimals.plain(row.getBigDecimal("serving_grams")), Decimals.plain(row.getBigDecimal("kcal")),
                        Decimals.plain(row.getBigDecimal("protein_g")), Decimals.plain(row.getBigDecimal("carbs_g")),
                        Decimals.plain(row.getBigDecimal("fat_g")), row.getObject("created_at", OffsetDateTime.class).toInstant()))
                .list();
    }

    void deleteAll(AccountId account) {
        jdbc.sql("delete from nutrition.own_food where account_id = :account").param("account", account.value()).update();
    }

    private static FoodStore.Food food(java.sql.ResultSet row) throws java.sql.SQLException {
        BigDecimal grams = Decimals.plain(row.getBigDecimal("serving_grams"));
        List<FoodStore.Serving> servings = new ArrayList<>();
        servings.add(new FoodStore.Serving("1 serving (" + grams.toPlainString() + " g)", grams));
        return new FoodStore.Food(PREFIX + row.getObject("id", UUID.class), row.getString("name"), row.getString("brand"), FoodRanges.Source.BRANDED,
                new FoodRanges.Per100g(row.getBigDecimal("kcal"), row.getBigDecimal("protein_g"), row.getBigDecimal("carbs_g"),
                        row.getBigDecimal("fat_g")),
                null, List.copyOf(servings));
    }
}
