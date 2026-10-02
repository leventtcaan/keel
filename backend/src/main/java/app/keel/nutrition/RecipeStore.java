package app.keel.nutrition;

import app.keel.shared.AccountId;
import app.keel.shared.Decimals;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * The recipe tables (K-413, ADR-034): a recipe's name, its portions and its ingredients as they were given — no number.
 * The first write of a clientId wins (ADR-024).
 */
@Repository
class RecipeStore {

    record Recipe(UUID id, UUID clientId, String name, int portions, List<FoodEstimator.ItemRequest> items) {
    }

    record Stored(Recipe recipe, boolean created) {
    }

    private final JdbcClient jdbc;

    RecipeStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    Stored save(AccountId account, UUID clientId, String name, int portions, List<FoodEstimator.ItemRequest> items) {
        UUID id = UUID.randomUUID();
        int created = jdbc.sql("""
                insert into nutrition.recipe (id, account_id, client_id, name, portions, created_at) values (:id, :account, :client, :name, :portions, now())
                on conflict (account_id, client_id) do nothing""")
                .param("id", id).param("account", account.value()).param("client", clientId).param("name", name).param("portions", portions).update();
        if (created == 1) {
            for (int i = 0; i < items.size(); i++) {
                FoodEstimator.ItemRequest item = items.get(i);
                jdbc.sql("""
                        insert into nutrition.recipe_item (recipe_id, account_id, seq, food_id, quantity, unit, certainty)
                        values (:recipe, :account, :seq, :food, :quantity, :unit, :certainty)""")
                        .param("recipe", id).param("account", account.value()).param("seq", i).param("food", item.foodId())
                        .param("quantity", item.amount().quantity()).param("unit", item.amount().unit())
                        .param("certainty", item.amount().certainty() == null ? null : item.amount().certainty().name()).update();
            }
        }
        Recipe recipe = findByClient(account, clientId).orElseThrow();
        return new Stored(recipe, created == 1);
    }

    Optional<Recipe> findByClient(AccountId account, UUID clientId) {
        return recipes("r.account_id = :account and r.client_id = :client", Map.of("account", account.value(), "client", clientId)).stream().findFirst();
    }

    Optional<Recipe> find(AccountId account, UUID id) {
        return recipes("r.account_id = :account and r.id = :id", Map.of("account", account.value(), "id", id)).stream().findFirst();
    }

    /** Every recipe of the account, by name (case aside); the export too (K-214). */
    List<Recipe> all(AccountId account) {
        return recipes("r.account_id = :account", Map.of("account", account.value()));
    }

    boolean delete(AccountId account, UUID id) {
        return jdbc.sql("delete from nutrition.recipe where id = :id and account_id = :account").param("id", id).param("account", account.value())
                .update() == 1;
    }

    /** Recipes and their ingredients in two flat reads (no query inside a row mapper). */
    private List<Recipe> recipes(String where, Map<String, Object> params) {
        List<Recipe> recipes = jdbc.sql("select r.* from nutrition.recipe r where " + where + " order by lower(r.name), r.name, r.id").params(params)
                .query((row, n) -> new Recipe(row.getObject("id", UUID.class), row.getObject("client_id", UUID.class), row.getString("name"),
                        row.getInt("portions"), List.of()))
                .list();
        if (recipes.isEmpty()) {
            return recipes;
        }
        record Row(UUID recipe, FoodEstimator.ItemRequest item) {
        }
        Map<UUID, List<FoodEstimator.ItemRequest>> items = jdbc.sql("""
                select * from nutrition.recipe_item where recipe_id = any (cast(:ids as uuid[])) order by recipe_id, seq""")
                .param("ids", recipes.stream().map(Recipe::id).toArray(UUID[]::new))
                .query((row, n) -> new Row(row.getObject("recipe_id", UUID.class), new FoodEstimator.ItemRequest(row.getString("food_id"),
                        new FoodEstimator.Amount(Decimals.plain(row.getBigDecimal("quantity")), row.getString("unit"),
                                row.getString("certainty") == null ? null : FoodEstimator.AmountCertainty.valueOf(row.getString("certainty"))))))
                .list().stream().collect(Collectors.groupingBy(Row::recipe, Collectors.mapping(Row::item, Collectors.toList())));
        return recipes.stream().map(recipe -> new Recipe(recipe.id(), recipe.clientId(), recipe.name(), recipe.portions(),
                List.copyOf(items.getOrDefault(recipe.id(), List.of())))).toList();
    }
}
