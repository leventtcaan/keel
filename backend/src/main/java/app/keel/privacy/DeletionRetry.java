package app.keel.privacy;

import app.keel.shared.AccountDeletionRequested;
import org.springframework.modulith.events.FailedEventPublications;
import org.springframework.modulith.events.ResubmissionOptions;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * A module whose deletion failed tries again (K-214 review, V6). The event registry marks a publication failed when its
 * listener throws, or when it stayed unfinished too long (spring.modulith.events.staleness, a restart mid-way); nothing
 * resends it on its own. Only deletions are resent: each module's deletion is a delete by account, harmless twice.
 */
@Component
class DeletionRetry {

    private final FailedEventPublications failed;
    private final PrivacyProperties properties;

    DeletionRetry(FailedEventPublications failed, PrivacyProperties properties) {
        this.failed = failed;
        this.properties = properties;
    }

    @Scheduled(initialDelayString = "${keel.privacy.retry-every}", fixedDelayString = "${keel.privacy.retry-every}")
    void retry() {
        failed.resubmit(ResubmissionOptions.defaults().withMinAge(properties.retryAfter())
                .withFilter(publication -> publication.getEvent() instanceof AccountDeletionRequested));
    }
}
