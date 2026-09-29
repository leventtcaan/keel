package app.keel.nutrition;

import app.keel.shared.AccountId;
import app.keel.shared.Decimals;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** The meal tables (K-209). The first write of a clientId wins; a repeat reads the stored meal back (ADR-024). */
@Repository
class MealStore {

    enum Slot { BREAKFAST, LUNCH, DINNER, SNACK }

    record Meal(UUID id, UUID clientId, Instant eatenAt, LocalDate day, Slot slot, List<FoodEstimator.EstimatedItem> items) {
    }

    record Stored(Meal meal, boolean created) {
    }

    private final JdbcClient jdbc;

    MealStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    Stored log(AccountId account, UUID clientId, Instant eatenAt, LocalDate day, Slot slot, List<FoodEstimator.EstimatedItem> items) {
        UUID id = UUID.randomUUID();
        int created = jdbc.sql("""
                insert into nutrition.meal (id, account_id, client_id, eaten_at, day, slot) values (:id, :account, :client, :at, :day, :slot)
                on conflict (account_id, client_id) do nothing""")
                .param("id", id).param("account", account.value()).param("client", clientId)
                .param("at", eatenAt.atOffset(ZoneOffset.UTC)).param("day", day).param("slot", slot.name()).update();
        if (created == 1) {
            for (int i = 0; i < items.size(); i++) {
                FoodEstimator.EstimatedItem item = items.get(i);
                jdbc.sql("""
                        insert into nutrition.meal_item (meal_id, account_id, seq, food_id, name, quantity, unit, certainty, kcal_low, kcal_high,
                        protein_low, protein_high, carbs_low, carbs_high, fat_low, fat_high)
                        values (:meal, :account, :seq, :food, :name, :quantity, :unit, :certainty, :kl, :kh, :pl, :ph, :cl, :ch, :fl, :fh)""")
                        .param("meal", id).param("account", account.value()).param("seq", i).param("food", item.foodId())
                        .param("name", item.name()).param("quantity", item.amount().quantity()).param("unit", item.amount().unit())
                        .param("certainty", item.amount().certainty() == null ? null : item.amount().certainty().name())
                        .param("kl", item.kcal().low()).param("kh", item.kcal().high()).param("pl", item.proteinG().low())
                        .param("ph", item.proteinG().high()).param("cl", item.carbsG().low()).param("ch", item.carbsG().high())
                        .param("fl", item.fatG().low()).param("fh", item.fatG().high()).update();
            }
        }
        Meal meal = meals("m.account_id = :account and m.client_id = :client", Map.of("account", account.value(), "client", clientId))
                .getFirst();
        return new Stored(meal, created == 1);
    }

    Optional<Meal> find(AccountId account, UUID id) {
        return meals("m.account_id = :account and m.id = :id", Map.of("account", account.value(), "id", id)).stream().findFirst();
    }

    List<Meal> day(AccountId account, LocalDate day) {
        return meals("m.account_id = :account and m.day = :day", Map.of("account", account.value(), "day", day));
    }

    /** Every meal of the account (the export, K-214). */
    List<Meal> all(AccountId account) {
        return meals("m.account_id = :account", Map.of("account", account.value()));
    }

    boolean delete(AccountId account, UUID id) {
        return jdbc.sql("delete from nutrition.meal where id = :id and account_id = :account").param("id", id).param("account", account.value())
                .update() == 1;
    }

    /** Meals and their items in two flat reads (no query inside a row mapper), in the order they were eaten. */
    private List<Meal> meals(String where, Map<String, Object> params) {
        List<Meal> meals = jdbc.sql("select m.* from nutrition.meal m where " + where + " order by m.eaten_at, m.id").params(params)
                .query((row, n) -> new Meal(row.getObject("id", UUID.class), row.getObject("client_id", UUID.class),
                        row.getObject("eaten_at", OffsetDateTime.class).toInstant(), row.getObject("day", LocalDate.class),
                        Slot.valueOf(row.getString("slot")), List.of()))
                .list();
        if (meals.isEmpty()) {
            return meals;
        }
        record Row(UUID meal, FoodEstimator.EstimatedItem item) {
        }
        Map<UUID, List<FoodEstimator.EstimatedItem>> items = jdbc.sql("""
                select * from nutrition.meal_item where meal_id = any (cast(:ids as uuid[])) order by meal_id, seq""")
                .param("ids", meals.stream().map(Meal::id).toArray(UUID[]::new))
                .query((row, n) -> new Row(row.getObject("meal_id", UUID.class), new FoodEstimator.EstimatedItem(row.getString("food_id"),
                        row.getString("name"), new FoodEstimator.Amount(Decimals.plain(row.getBigDecimal("quantity")), row.getString("unit"),
                        row.getString("certainty") == null ? null : FoodEstimator.AmountCertainty.valueOf(row.getString("certainty"))),
                        new FoodRanges.Range(row.getInt("kcal_low"), row.getInt("kcal_high")),
                        new FoodRanges.Range(row.getInt("protein_low"), row.getInt("protein_high")),
                        new FoodRanges.Range(row.getInt("carbs_low"), row.getInt("carbs_high")),
                        new FoodRanges.Range(row.getInt("fat_low"), row.getInt("fat_high")))))
                .list().stream().collect(Collectors.groupingBy(Row::meal, Collectors.mapping(Row::item, Collectors.toList())));
        return meals.stream().map(meal -> new Meal(meal.id(), meal.clientId(), meal.eatenAt(), meal.day(), meal.slot(),
                List.copyOf(items.getOrDefault(meal.id(), List.of())))).toList();
    }
}
