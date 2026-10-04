package app.keel.subscription;

import app.keel.identity.KnownAccounts;
import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The accounts' subscriptions, kept from RevenueCat's events (K-701, ADR-056). An event counts only from an allowed store
 * environment, for an account of ours that still exists; each event is applied to an account once (its id), in the same
 * transaction as the state it leads to, and never takes the state back (SubscriptionState.next).
 */
@Service
@EnableConfigurationProperties(RevenueCatProperties.class)
class Subscriptions {

    private final JdbcClient jdbc;
    private final KnownAccounts accounts;
    private final RevenueCatProperties properties;

    Subscriptions(JdbcClient jdbc, KnownAccounts accounts, RevenueCatProperties properties) {
        this.jdbc = jdbc;
        this.accounts = accounts;
        this.properties = properties;
    }

    @Transactional
    void receive(SubscriptionEvent event) {
        // Skeleton (RED commit): nothing is applied yet.
    }

    private static OffsetDateTime utc(Instant instant) {
        return instant.atOffset(ZoneOffset.UTC);
    }
}
