package app.keel.nutrition;

import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The foods a user starred (K-1063): a food id each, newest star first. Health data, as meals are. */
@Repository
class FoodFavorites {

    private final JdbcClient jdbc;

    FoodFavorites(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    int count(AccountId account) {
        return jdbc.sql("select count(*) from nutrition.food_favorite where account_id = :account").param("account", account.value())
                .query(Integer.class).single();
    }

    boolean has(AccountId account, String foodId) {
        return jdbc.sql("select count(*) from nutrition.food_favorite where account_id = :account and food_id = :food")
                .param("account", account.value()).param("food", foodId).query(Integer.class).single() > 0;
    }

    /** Starring again keeps the first time. */
    void add(AccountId account, String foodId) {
        jdbc.sql("""
                insert into nutrition.food_favorite (account_id, food_id, created_at) values (:account, :food, now())
                on conflict (account_id, food_id) do nothing""")
                .param("account", account.value()).param("food", foodId).update();
    }

    void remove(AccountId account, String foodId) {
        jdbc.sql("delete from nutrition.food_favorite where account_id = :account and food_id = :food").param("account", account.value())
                .param("food", foodId).update();
    }

    /** Food ids, newest star first. */
    List<String> ids(AccountId account) {
        return jdbc.sql("select food_id from nutrition.food_favorite where account_id = :account order by created_at desc, food_id")
                .param("account", account.value()).query(String.class).list();
    }

    /** Every star with its time (the export). */
    List<Starred> all(AccountId account) {
        return jdbc.sql("select food_id, created_at from nutrition.food_favorite where account_id = :account order by created_at, food_id")
                .param("account", account.value())
                .query((row, n) -> new Starred(row.getString("food_id"), row.getObject("created_at", OffsetDateTime.class).toInstant())).list();
    }

    record Starred(String foodId, Instant at) {
    }

    void deleteAll(AccountId account) {
        jdbc.sql("delete from nutrition.food_favorite where account_id = :account").param("account", account.value()).update();
    }
}
