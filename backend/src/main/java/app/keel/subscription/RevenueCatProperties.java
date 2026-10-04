package app.keel.subscription;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * RevenueCat's webhook (K-701, ADR-056; keel.subscription.revenuecat). The signing secret comes from the environment
 * (KEEL_REVENUECAT_WEBHOOK_SECRET, V5) and a server without one does not start. The entitlement is the name set in
 * RevenueCat (ADR-012 addendum 1: a proposal until the store is set up); the environments are the stores' whose events
 * count (SANDBOX is TestFlight's; it goes at the store launch, ADR-056 #4).
 */
@ConfigurationProperties("keel.subscription.revenuecat")
record RevenueCatProperties(String webhookSecret, Duration signatureTolerance, String entitlement, Set<String> environments, Integer maxBodyBytes) {

    private static final Set<String> KNOWN_ENVIRONMENTS = Set.of("SANDBOX", "PRODUCTION");

    RevenueCatProperties {
        // An unset environment variable binds as the literal "${…}": stop at startup, not at every event (as AppleProperties).
        if (webhookSecret == null || webhookSecret.isBlank() || webhookSecret.contains("${")) {
            throw new IllegalStateException("keel.subscription.revenuecat.webhook-secret is missing (KEEL_REVENUECAT_WEBHOOK_SECRET)");
        }
        if (signatureTolerance == null || signatureTolerance.isNegative() || signatureTolerance.isZero() || entitlement == null || entitlement.isBlank()
                || environments == null || environments.isEmpty() || !KNOWN_ENVIRONMENTS.containsAll(environments) || maxBodyBytes == null || maxBodyBytes < 1) {
            throw new IllegalStateException("keel.subscription.revenuecat: signature-tolerance above zero, an entitlement, environments of "
                    + KNOWN_ENVIRONMENTS + ", max-body-bytes at least 1");
        }
        environments = Set.copyOf(environments);
    }

    byte[] secret() {
        return webhookSecret.getBytes(StandardCharsets.UTF_8);
    }

    // The secret stays out of any log or error that prints this record (V5).
    @Override
    public String toString() {
        return "RevenueCatProperties[signatureTolerance=" + signatureTolerance + ", entitlement=" + entitlement + ", environments=" + environments
                + ", maxBodyBytes=" + maxBodyBytes + "]";
    }
}
