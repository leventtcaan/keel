package app.keel.subscription;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Applied RevenueCat events go after the retention (K-814, GDPR Art. 5(1)(e)). An event's record exists so a second
 * delivery of it is not applied twice. RevenueCat's own retries end within about two and a half hours; a delivery later
 * than the retention (its dashboard's manual retry) is weighed again, and an event older than the current state cannot
 * take it back (SubscriptionState.next). Only one from the very same moment as the state could, which needs two events
 * in one millisecond and a manual retry a month on (ADR-056 Ek 2). Kept longer, it is one more line in the export.
 */
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

    // @Async: the scheduler's own handler would log the failure's message; run as a listener does, a failure goes to
    // BackgroundFailures — which task, its type and where, never the message (V3).
    @Scheduled(cron = "${keel.subscription.event-cleanup}", zone = "${keel.subscription.event-cleanup-zone}")
    @Async
    void nightly() {
        cleanUp(clock.instant());
    }

    /** Deletes every applied event from before {@code now} minus the retention. */
    void cleanUp(Instant now) {
        jdbc.sql("delete from subscription.webhook_event where event_at < :cut").param("cut", now.minus(retention).atOffset(ZoneOffset.UTC)).update();
    }
}
