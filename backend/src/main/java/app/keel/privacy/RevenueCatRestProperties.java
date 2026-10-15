package app.keel.privacy;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * RevenueCat's REST API (K-704, ADR-056 Ek 3; keel.privacy.revenuecat): its address and the secret API key, from the
 * environment (V5, KEEL_REVENUECAT_API_KEY). Not set (an unset environment variable binds as the literal "${…}") and the
 * refresh and the customer's deletion are off: the webhook alone keeps the entitlement, as before.
 */
@ConfigurationProperties("keel.privacy.revenuecat")
record RevenueCatRestProperties(String apiKey, URI baseUri) {

    boolean configured() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.contains("${") && baseUri != null;
    }

    // The key stays out of any log or error that prints this record (V5).
    @Override
    public String toString() {
        return "RevenueCatRestProperties[baseUri=" + baseUri + ", configured=" + configured() + "]";
    }
}
