package app.keel.privacy;

import java.net.URI;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * RevenueCat's REST API (K-704, ADR-056 Ek 3; keel.privacy.revenuecat): its address and the secret API key, from the
 * environment (V5, KEEL_REVENUECAT_API_KEY). Not set (an unset environment variable binds as the literal "${…}") and the
 * refresh is off, and the customer's deletion waits for the key in production (RevenueCatRest).
 *
 * <p>The key is trimmed (a value pasted with a newline), and the address must be https, so the key never travels in the clear:
 * plain http only to this machine, for tests and development. A wrong address stops the server at start.
 */
@ConfigurationProperties("keel.privacy.revenuecat")
record RevenueCatRestProperties(String apiKey, URI baseUri) {

    private static final Set<String> THIS_MACHINE = Set.of("localhost", "127.0.0.1", "[::1]");

    RevenueCatRestProperties {
        apiKey = apiKey == null ? null : apiKey.strip();
        if (baseUri != null && !"https".equals(baseUri.getScheme())
                && !("http".equals(baseUri.getScheme()) && baseUri.getHost() != null && THIS_MACHINE.contains(baseUri.getHost()))) {
            throw new IllegalStateException("keel.privacy.revenuecat.base-uri must be https (plain http only to localhost)");
        }
    }

    boolean configured() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.contains("${") && baseUri != null;
    }

    // The key stays out of any log or error that prints this record (V5).
    @Override
    public String toString() {
        return "RevenueCatRestProperties[baseUri=" + baseUri + ", configured=" + configured() + "]";
    }
}
