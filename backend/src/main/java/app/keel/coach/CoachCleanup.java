package app.keel.coach;

import java.time.Clock;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** The conversation older than {@code coach_history_days} goes each night (ADR-092 #3), as the daily counts do (QuotaCleanup). */
@Component
class CoachCleanup {

    private final CoachConversation conversation;
    private final Clock clock;

    CoachCleanup(CoachConversation conversation, Clock clock) {
        this.conversation = conversation;
        this.clock = clock;
    }

    // @Async: a failure goes to BackgroundFailures — which task, its type and where, never the message (V3).
    @Scheduled(cron = "${keel.coach.history-cleanup}", zone = "${keel.coach.history-cleanup-zone}")
    @Async
    void nightly() {
        cleanUp(clock.instant());
    }

    /** Deletes the messages older than coach_history_days before {@code now}. */
    void cleanUp(java.time.Instant now) {
        conversation.purge(now);
    }
}
