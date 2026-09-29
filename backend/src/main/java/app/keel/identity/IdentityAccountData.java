package app.keel.identity;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * Identity's part of the user's data (K-214): the account and its sessions. Revoking Apple's tokens on deletion waits
 * for Apple's key (ADR-025, DURUM question 7); until then the account is deleted here and Apple keeps its grant.
 */
@Component
class IdentityAccountData implements AccountDataExport {

    private final JdbcClient jdbc;

    IdentityAccountData(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        jdbc.sql("delete from identity.refresh_token where account_id = :account").param("account", deletion.account().value()).update();
        jdbc.sql("delete from identity.account where id = :account").param("account", deletion.account().value()).update();
    }

    @Override
    public String section() {
        return "identity";
    }

    @Override
    public Object export(AccountId account) {
        // The sign-in's Apple identifier and when the account was made; tokens are credentials, not data to hand out.
        return jdbc.sql("select apple_subject, created_at from identity.account where id = :account").param("account", account.value())
                .query((row, n) -> Map.<String, Object>of("appleUserId", row.getString("apple_subject"),
                        "createdAt", row.getObject("created_at", OffsetDateTime.class).toInstant()))
                .optional().orElse(Map.of());
    }
}
