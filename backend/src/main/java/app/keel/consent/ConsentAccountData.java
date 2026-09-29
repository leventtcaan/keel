package app.keel.consent;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Consent's part of the user's data (K-214): every grant and withdrawal. */
@Component
class ConsentAccountData implements AccountDataExport {

    private final JdbcClient jdbc;

    ConsentAccountData(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        jdbc.sql("delete from consent.consent_event where account_id = :account").param("account", deletion.account().value()).update();
    }

    @Override
    public String section() {
        return "consent";
    }

    @Override
    public Object export(AccountId account) {
        return Map.of("events", jdbc.sql("""
                select kind, action, text_version, provider, occurred_at from consent.consent_event
                where account_id = :account order by seq""").param("account", account.value())
                .query((row, n) -> {
                    Map<String, Object> event = new LinkedHashMap<>();
                    event.put("kind", row.getString("kind"));
                    event.put("action", row.getString("action"));
                    event.put("textVersion", row.getString("text_version"));
                    if (row.getString("provider") != null) {
                        event.put("provider", row.getString("provider"));
                    }
                    event.put("at", row.getObject("occurred_at", OffsetDateTime.class).toInstant());
                    return event;
                }).list());
    }
}
