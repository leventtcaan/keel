package app.keel.nutrition;

import app.keel.shared.AccountDataExport;
import app.keel.consent.ConsentKind;
import app.keel.consent.ConsentWithdrawn;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.Map;
import org.springframework.context.event.EventListener;
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
        delete(deletion.account());
    }

    /** Meals are health data (K-231): in the withdrawal's transaction. */
    @EventListener
    void on(ConsentWithdrawn withdrawn) {
        if (withdrawn.kind() == ConsentKind.HEALTH_DATA) {
            delete(withdrawn.account());
        }
    }

    private void delete(AccountId account) {
        // Items go with their meal (on delete cascade); by account too, as for sets.
        jdbc.sql("delete from nutrition.meal_item where account_id = :account").param("account", account.value()).update();
        jdbc.sql("delete from nutrition.meal where account_id = :account").param("account", account.value()).update();
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
