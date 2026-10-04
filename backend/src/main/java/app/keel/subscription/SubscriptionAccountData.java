package app.keel.subscription;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * Subscription's part of the user's data (K-214, K-508, K-701): the daily uses — counts, no content — and the subscription
 * as RevenueCat's events left it, with the events that touched it (their kind and moment; nothing else of them is kept).
 */
@Component
class SubscriptionAccountData implements AccountDataExport {

    private final JdbcClient jdbc;

    SubscriptionAccountData(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        for (String table : new String[] {"subscription.daily_use", "subscription.subscription", "subscription.webhook_event"}) {
            jdbc.sql("delete from " + table + " where account_id = :account").param("account", deletion.account().value()).update();
        }
    }

    @Override
    public String section() {
        return "subscription";
    }

    @Override
    public Object export(AccountId account) {
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("dailyUses", jdbc.sql("select day, use, used from subscription.daily_use where account_id = :account order by day, use")
                .param("account", account.value()).query((row, n) -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("day", row.getObject("day", LocalDate.class).toString());
                    entry.put("use", row.getString("use"));
                    entry.put("used", row.getInt("used"));
                    return entry;
                }).list());
        section.put("subscription", jdbc.sql("select status, access_until, last_event_at from subscription.subscription where account_id = :account")
                .param("account", account.value()).query((row, n) -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("status", row.getString("status"));
                    entry.put("accessUntil", row.getObject("access_until", OffsetDateTime.class).toInstant().toString());
                    entry.put("lastEventAt", row.getObject("last_event_at", OffsetDateTime.class).toInstant().toString());
                    return entry;
                }).optional().orElse(null));
        section.put("subscriptionEvents", jdbc.sql("select type, event_at from subscription.webhook_event where account_id = :account order by event_at, type")
                .param("account", account.value()).query((row, n) -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("type", row.getString("type"));
                    entry.put("at", row.getObject("event_at", OffsetDateTime.class).toInstant().toString());
                    return entry;
                }).list());
        return section;
    }
}
