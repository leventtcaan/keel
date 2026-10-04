package app.keel.subscription;

import app.keel.identity.KnownAccounts;
import app.keel.shared.AccountId;
import java.sql.ResultSet;
import java.sql.SQLException;
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
        // No environment is none allowed (an immutable set's contains(null) throws: a 500 RevenueCat would send five times more).
        if (event.environment() == null || !properties.environments().contains(event.environment())) {
            return;
        }
        if ("TRANSFER".equals(event.type())) {
            // The purchases moved to another app user id: the accounts they left have no access from that moment (ADR-056 #6).
            for (String from : event.transferredFrom() == null ? List.<String>of() : event.transferredFrom()) {
                accounts.of(from).ifPresent(account -> apply(account, event, SubscriptionState.transferredAway(event.at())));
            }
            return;
        }
        SubscriptionState.of(event, properties.entitlement())
                .ifPresent(implied -> accounts.of(event.appUserId()).ifPresent(account -> apply(account, event, implied)));
    }

    private void apply(AccountId account, SubscriptionEvent event, SubscriptionState implied) {
        int first = jdbc.sql("""
                        insert into subscription.webhook_event (event_id, account_id, type, event_at) values (:id, :account, :type, :at)
                        on conflict do nothing""")
                .param("id", event.id()).param("account", account.value()).param("type", event.type()).param("at", utc(event.at())).update();
        if (first == 0) {
            return; // sent again: applied the first time
        }
        Optional<SubscriptionState> current = locked(account);
        if (current.isEmpty()) {
            // The account's first state; an event for it at the same moment may have made it first — then it is weighed below.
            int made = jdbc.sql("""
                            insert into subscription.subscription (account_id, status, access_until, last_event_at)
                            values (:account, :status, :until, :at) on conflict do nothing""")
                    .param("account", account.value()).param("status", implied.status().name()).param("until", utc(implied.accessUntil()))
                    .param("at", utc(implied.lastEventAt())).update();
            if (made == 1) {
                return;
            }
            current = locked(account);
        }
        SubscriptionState next = SubscriptionState.next(current, implied);
        jdbc.sql("""
                        update subscription.subscription set status = :status, access_until = :until, last_event_at = :at
                        where account_id = :account""")
                .param("account", account.value()).param("status", next.status().name()).param("until", utc(next.accessUntil()))
                .param("at", utc(next.lastEventAt())).update();
    }

    /** The account's state as kept, read only (K-705); none for an account that never subscribed. */
    Optional<SubscriptionState> kept(AccountId account) {
        return jdbc.sql("select status, access_until, last_event_at from subscription.subscription where account_id = :account")
                .param("account", account.value()).query((row, n) -> state(row)).optional();
    }

    /** The account's state, held until the transaction ends: two events for one account are weighed one after the other. */
    private Optional<SubscriptionState> locked(AccountId account) {
        return jdbc.sql("select status, access_until, last_event_at from subscription.subscription where account_id = :account for update")
                .param("account", account.value()).query((row, n) -> state(row)).optional();
    }

    private static SubscriptionState state(ResultSet row) throws SQLException {
        return new SubscriptionState(SubscriptionState.Status.valueOf(row.getString("status")), row.getObject("access_until", OffsetDateTime.class).toInstant(),
                row.getObject("last_event_at", OffsetDateTime.class).toInstant());
    }

    private static OffsetDateTime utc(Instant instant) {
        return instant.atOffset(ZoneOffset.UTC);
    }
}
