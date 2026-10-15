package app.keel.subscription;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * How much REST asking one webhook may cause (K-704, keel.subscription.revenuecat.refresh): at most {@code maxAccounts}
 * accounts (a TRANSFER names a list), and no new ask once {@code deadline} has passed since the first. Each ask is also bounded
 * by privacy's egress timeout. Accounts left out catch up with their next event.
 */
@ConfigurationProperties("keel.subscription.revenuecat.refresh")
record RevenueCatRefreshProperties(Integer maxAccounts, Duration deadline) {

    RevenueCatRefreshProperties {
        if (maxAccounts == null || maxAccounts < 1 || deadline == null || deadline.isNegative() || deadline.isZero()) {
            throw new IllegalStateException("keel.subscription.revenuecat.refresh: max-accounts at least 1 and a deadline above zero");
        }
    }
}
