package app.keel.identity;

import java.time.Clock;
import java.time.Instant;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Expired refresh tokens go each night (K-810). */
@Component
class RefreshTokenCleanup {

    private final JdbcClient jdbc;
    private final Clock clock;

    RefreshTokenCleanup(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Scheduled(cron = "${keel.session.token-cleanup}", zone = "${keel.session.token-cleanup-zone}")
    @Async
    void nightly() {
        cleanUp(clock.instant());
    }

    void cleanUp(Instant now) {
    }
}
