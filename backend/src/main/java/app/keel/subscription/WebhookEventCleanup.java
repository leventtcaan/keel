package app.keel.subscription;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Applied RevenueCat events go after the retention (K-814). */
@Component
class WebhookEventCleanup {

    private final JdbcClient jdbc;
    private final Clock clock;
    private final Duration retention;

    WebhookEventCleanup(JdbcClient jdbc, Clock clock, @Value("${keel.subscription.event-retention}") Duration retention) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.retention = retention;
    }

    @Scheduled(cron = "${keel.subscription.event-cleanup}", zone = "${keel.subscription.event-cleanup-zone}")
    @Async
    void nightly() {
        cleanUp(clock.instant());
    }

    void cleanUp(Instant now) {
    }
}
