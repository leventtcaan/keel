package app.keel.subscription;

import app.keel.shared.AccountId;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * The free full calls an account has spent (ADR-091 Ek 1, K-1201). A count kept here and not with the calls: the calls are
 * health data and go when the consent is withdrawn, and a spent allowance must not come back with them. Gone only with the account.
 */
@Service
public class FreeCallUse {

    private final JdbcClient jdbc;

    FreeCallUse(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public long used(AccountId account) {
        return jdbc.sql("select used from subscription.free_call_use where account_id = :account").param("account", account.value())
                .query(Long.class).optional().orElse(0L);
    }

    /** One more full call made. */
    public void record(AccountId account) {
        jdbc.sql("""
                insert into subscription.free_call_use (account_id, used) values (:account, 1)
                on conflict (account_id) do update set used = subscription.free_call_use.used + 1""")
                .param("account", account.value()).update();
    }
}
