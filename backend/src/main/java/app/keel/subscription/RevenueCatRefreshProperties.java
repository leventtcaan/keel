package app.keel.subscription;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * How REST asking is bounded and weighed (K-704, keel.subscription.revenuecat.refresh): one webhook asks about at most
 * {@code maxAccounts} accounts (a TRANSFER names a list), and no new ask starts once {@code deadline} has passed since the first.
 * Each ask is also bounded by privacy's egress timeout. Accounts left out catch up with their next event. A REST answer counts only
 * when it was made at least {@code settle} after the state's own moment: RevenueCat's REST API can lag a webhook, so inside the
 * window the webhook's state stands (SubscriptionState.afterAnswer).
 */
@ConfigurationProperties("keel.subscription.revenuecat.refresh")
record RevenueCatRefreshProperties(Integer maxAccounts, Duration deadline, Duration settle) {

    RevenueCatRefreshProperties {
        if (maxAccounts == null || maxAccounts < 1 || deadline == null || deadline.isNegative() || deadline.isZero()
                || settle == null || settle.isNegative()) {
            throw new IllegalStateException("keel.subscription.revenuecat.refresh: max-accounts at least 1, a deadline above zero and a settle of zero or more");
        }
    }
}
