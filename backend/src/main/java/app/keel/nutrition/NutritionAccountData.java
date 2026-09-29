package app.keel.nutrition;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Nutrition's part of the user's data (K-214, K-209): every meal with its items. The food database is nobody's data. */
@Component
class NutritionAccountData implements AccountDataExport {

    private final JdbcClient jdbc;
    private final MealStore meals;

    NutritionAccountData(JdbcClient jdbc, MealStore meals) {
        this.jdbc = jdbc;
        this.meals = meals;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        // Items go with their meal (on delete cascade); by account too, as for sets.
        jdbc.sql("delete from nutrition.meal_item where account_id = :account").param("account", deletion.account().value()).update();
        jdbc.sql("delete from nutrition.meal where account_id = :account").param("account", deletion.account().value()).update();
    }

    @Override
    public String section() {
        return "nutrition";
    }

    @Override
    public Object export(AccountId account) {
        return Map.of("meals", meals.all(account));
    }
}
