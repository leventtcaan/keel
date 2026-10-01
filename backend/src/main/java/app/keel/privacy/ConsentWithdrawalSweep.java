package app.keel.privacy;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.consent.ConsentWithdrawn;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * The second pass of a consent withdrawal's deletion (K-231, as DeletionSweep for the account, K-214). The modules
 * delete in the withdrawal's transaction; but a request already past the consent check can still write after they
 * have. Some minutes later — longer than any request runs — the withdrawal is told again and every module deletes
 * once more, unless the consent was given again by then: what was written under the new consent is the user's.
 */
@Component
class ConsentWithdrawalSweep {

    private record Due(UUID account, String kind) {
    }

    private final JdbcClient jdbc;
    private final ApplicationEventPublisher events;
    private final ConsentGate consents;
    private final PrivacyProperties properties;
    private final Clock clock;

    ConsentWithdrawalSweep(JdbcClient jdbc, ApplicationEventPublisher events, ConsentGate consents, PrivacyProperties properties, Clock clock) {
        this.jdbc = jdbc;
        this.events = events;
        this.consents = consents;
        this.properties = properties;
        this.clock = clock;
    }

    /** Records the withdrawal for its second pass; in the withdrawal's transaction. A later withdrawal moves it later. */
    @EventListener
    void record(ConsentWithdrawn withdrawn) {
        if (!withdrawn.kind().coversStoredData()) {
            return;
        }
        jdbc.sql("""
                insert into privacy.consent_withdrawal (withdrawn_account_id, kind, withdrawn_at) values (:account, :kind, :at)
                on conflict (withdrawn_account_id, kind) do update set withdrawn_at = excluded.withdrawn_at""")
                .param("account", withdrawn.account().value()).param("kind", withdrawn.kind().name())
                .param("at", clock.instant().atOffset(ZoneOffset.UTC)).update();
    }

    // Transactional here, not only on sweep(): the scheduler calls this method through the proxy, and sweep() called from
    // inside the bean skips its own annotation. Without one, "for update skip locked" would hold nothing and each module
    // would delete in its own commit (K-231 review).
    @Scheduled(initialDelayString = "${keel.privacy.sweep-every}", fixedDelayString = "${keel.privacy.sweep-every}")
    @Transactional
    void scheduled() {
        sweep(clock.instant());
    }

    /** The second pass of every withdrawal made longer than second-pass-after before {@code now}. */
    @Transactional
    void sweep(Instant now) {
        List<Due> due = jdbc.sql("""
                select withdrawn_account_id, kind from privacy.consent_withdrawal where withdrawn_at <= :cutoff for update skip locked""")
                .param("cutoff", now.minus(properties.secondPassAfter()).atOffset(ZoneOffset.UTC))
                .query((row, n) -> new Due(row.getObject("withdrawn_account_id", UUID.class), row.getString("kind"))).list();
        for (Due withdrawal : due) {
            AccountId account = new AccountId(withdrawal.account());
            ConsentKind kind = ConsentKind.valueOf(withdrawal.kind());
            if (!consents.granted(account, kind)) {
                // The modules delete in this transaction; record() above moves the row, which goes next.
                events.publishEvent(new ConsentWithdrawn(account, kind));
            }
            jdbc.sql("delete from privacy.consent_withdrawal where withdrawn_account_id = :account and kind = :kind")
                    .param("account", withdrawal.account()).param("kind", withdrawal.kind()).update();
        }
    }
}
