package app.keel.identity;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * A refresh token family goes the night after its last token expires (K-810, GDPR Art. 5(1)(e)): then nobody can use it,
 * so it is kept for no purpose. Not before: each renewal gives the new token its own lifetime, so a family's old tokens
 * expire while its newest still works — and an old copy coming back is how a stolen token is caught, the whole family
 * stopping (RefreshTokens.rotate). Deleting the expired ones alone would turn that catch into a plain refusal.
 */
@Component
class RefreshTokenCleanup {

    private final JdbcClient jdbc;
    private final Clock clock;

    RefreshTokenCleanup(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    // @Async: the scheduler's own handler would log the failure's message; run as a listener does, a failure goes to
    // BackgroundFailures — which task, its type and where, never the message (V3).
    @Scheduled(cron = "${keel.session.expired-cleanup}", zone = "${keel.session.expired-cleanup-zone}")
    @Async
    void nightly() {
        cleanUp(clock.instant());
    }

    /** Deletes every family whose every token expired before {@code now}. */
    void cleanUp(Instant now) {
        jdbc.sql("""
                delete from identity.refresh_token old where old.expires_at < :now
                and not exists (select 1 from identity.refresh_token live where live.family_id = old.family_id and live.expires_at >= :now)""")
                .param("now", now.atOffset(ZoneOffset.UTC)).update();
    }
}
