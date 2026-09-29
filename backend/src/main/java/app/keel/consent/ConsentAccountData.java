package app.keel.consent;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Consent's part of the user's data (K-214): every grant and withdrawal. */
@Component
class ConsentAccountData implements AccountDataExport {

    private final JdbcClient jdbc;
    private final ConsentEvents events;

    ConsentAccountData(JdbcClient jdbc, ConsentEvents events) {
        this.jdbc = jdbc;
        this.events = events;
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
        // The whole record the user agreed to (V2): for the AI consent, the provider and the data it may send.
        return Map.of("events", events.history(account).stream().map(event -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("kind", event.kind().name());
            entry.put("action", event.action().name());
            entry.put("textVersion", event.textVersion());
            if (event.provider() != null) {
                entry.put("provider", event.provider());
            }
            if (event.dataTypes() != null) {
                entry.put("dataTypes", event.dataTypes());
            }
            entry.put("at", event.at());
            return entry;
        }).toList());
    }
}
