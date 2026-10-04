package app.keel.identity;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Expired refresh tokens go each night (K-810, GDPR Art. 5(1)(e)): one past its expiry is refused whatever it is, so it
 * is kept for no purpose. A revoked one stays until it expires: a copy of it coming back is how a stolen token is caught,
 * and its whole family stops working (RefreshTokens.rotate).
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

    /** Deletes every refresh token that expired before {@code now}. */
    void cleanUp(Instant now) {
        jdbc.sql("delete from identity.refresh_token where expires_at < :now").param("now", now.atOffset(ZoneOffset.UTC)).update();
    }
}
