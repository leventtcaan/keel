package app.keel.subscription;

import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.OffsetDateTime;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Accounts that have used a phone saying it shows locked calls (ADR-091 Ek 1): the server's own memory of it, so the lock does
 * not depend on a header the client may leave off. Account data, not health data; gone with the account.
 */
@Service
public class LockedCallsClients {

    private final JdbcClient jdbc;
    private final Clock clock;

    LockedCallsClients(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public boolean marked(AccountId account) {
        return jdbc.sql("select exists (select 1 from subscription.locked_calls_client where account_id = :account)")
                .param("account", account.value()).query(Boolean.class).single();
    }

    /** The first time wins; marked twice, nothing changes. */
    public void mark(AccountId account) {
        jdbc.sql("insert into subscription.locked_calls_client (account_id, since) values (:account, :since) on conflict do nothing")
                .param("account", account.value()).param("since", OffsetDateTime.ofInstant(clock.instant(), java.time.ZoneOffset.UTC)).update();
    }
}
