package app.keel.subscription;

import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.OffsetDateTime;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Whether an account may use what the subscription pays for (K-701, ADR-012, ADR-056 #9): the coach's language model
 * and the meal photo. Decided on the server, from RevenueCat's events — never from what the phone says. An account
 * with no subscription kept has none; the rest of the app works without one (the deterministic mode).
 */
@Service
public class Entitlements {

    private final JdbcClient jdbc;

    Entitlements(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public boolean active(AccountId account, Instant now) {
        return jdbc.sql("select access_until from subscription.subscription where account_id = :account").param("account", account.value())
                .query((row, n) -> row.getObject("access_until", OffsetDateTime.class).toInstant()).optional()
                .map(until -> now.isBefore(until)).orElse(false);
    }
}
