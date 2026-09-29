package app.keel.privacy;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * How deletion keeps its promise (K-214, keel.privacy): the second pass comes {@code secondPassAfter} the DELETE,
 * failed module deletions are resent every {@code retryEvery} once they are {@code retryAfter} old.
 */
@ConfigurationProperties("keel.privacy")
record PrivacyProperties(Duration secondPassAfter, Duration sweepEvery, Duration retryAfter, Duration retryEvery) {
}
