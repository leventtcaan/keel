package app.keel.privacy;

import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * The deletion's second pass (K-214 review, V6). Once DELETE answers, the account's tokens are refused; but a request
 * already past that check can still write after the modules have deleted. Some minutes later — longer than any request
 * runs — every module deletes again, and the deletion's record goes with it.
 */
@Component
@EnableConfigurationProperties(PrivacyProperties.class)
class DeletionSweep {

    private final JdbcClient jdbc;
    private final ApplicationEventPublisher events;
    private final PrivacyProperties properties;
    private final Clock clock;

    DeletionSweep(JdbcClient jdbc, ApplicationEventPublisher events, PrivacyProperties properties, Clock clock) {
        this.jdbc = jdbc;
        this.events = events;
        this.properties = properties;
        this.clock = clock;
    }

    /** Records the deletion for its second pass; in the DELETE's transaction. */
    void record(AccountId account) {
        jdbc.sql("insert into privacy.deletion (deleted_account_id, requested_at) values (:account, :at) on conflict do nothing")
                .param("account", account.value()).param("at", clock.instant().atOffset(ZoneOffset.UTC)).update();
    }

    // Transactional here, not only on sweep(): the scheduler calls this method through the proxy, and sweep() called from
    // inside the bean skips its own annotation. Without a transaction the modules' listeners would not run (K-231 review).
    @Scheduled(initialDelayString = "${keel.privacy.sweep-every}", fixedDelayString = "${keel.privacy.sweep-every}")
    @Transactional
    void scheduled() {
        sweep(clock.instant());
    }

    /** Publishes the second pass of every deletion asked for longer than second-pass-after before {@code now}. */
    @Transactional
    void sweep(Instant now) {
        List<UUID> due = jdbc.sql("select deleted_account_id from privacy.deletion where requested_at <= :cutoff for update skip locked")
                .param("cutoff", now.minus(properties.secondPassAfter()).atOffset(ZoneOffset.UTC)).query(UUID.class).list();
        for (UUID account : due) {
            // Published in this transaction: the registry keeps it until every module has handled it (DeletionRetry).
            events.publishEvent(new AccountDeletionRequested(new AccountId(account)));
            jdbc.sql("delete from privacy.deletion where deleted_account_id = :account").param("account", account).update();
        }
    }
}
