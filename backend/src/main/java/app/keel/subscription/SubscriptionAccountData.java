package app.keel.subscription;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Subscription's part of the user's data (K-214, K-508): the daily uses — counts, no content. */
@Component
class SubscriptionAccountData implements AccountDataExport {

    private final JdbcClient jdbc;

    SubscriptionAccountData(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        jdbc.sql("delete from subscription.daily_use where account_id = :account").param("account", deletion.account().value()).update();
    }

    @Override
    public String section() {
        return "subscription";
    }

    @Override
    public Object export(AccountId account) {
        return Map.of("dailyUses", jdbc.sql("select day, use, used from subscription.daily_use where account_id = :account order by day, use")
                .param("account", account.value()).query((row, n) -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("day", row.getObject("day", java.time.LocalDate.class).toString());
                    entry.put("use", row.getString("use"));
                    entry.put("used", row.getInt("used"));
                    return entry;
                }).list());
    }
}
