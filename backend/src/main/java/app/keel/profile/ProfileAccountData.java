package app.keel.profile;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * Profile's part of the user's data (K-214): the whole stored profile — the foods to avoid too, even while the health
 * data consent is not given (the right of access covers what is kept, GDPR Art. 15; the API hides them, K-225).
 */
@Component
class ProfileAccountData implements AccountDataExport {

    private final JdbcClient jdbc;
    private final ProfileStore store;

    ProfileAccountData(JdbcClient jdbc, ProfileStore store) {
        this.jdbc = jdbc;
        this.store = store;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        jdbc.sql("delete from profile.profile where account_id = :account").param("account", deletion.account().value()).update();
    }

    @Override
    public String section() {
        return "profile";
    }

    @Override
    public Object export(AccountId account) {
        return store.find(account).<Object>map(profile -> profile).orElse(Map.of());
    }
}
