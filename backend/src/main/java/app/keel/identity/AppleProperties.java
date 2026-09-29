package app.keel.identity;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Sign in with Apple (K-203). {@code clientId} is the app's bundle ID — Apple's {@code aud} for a native app — read
 * from the environment (KEEL_APPLE_CLIENT_ID); the issuer and key set URL are Apple's published values.
 */
@ConfigurationProperties("keel.apple")
record AppleProperties(String clientId, String issuer, URI jwksUri) {

    AppleProperties {
        // An unset environment variable binds as the literal "${…}": stop at startup instead of failing every sign-in.
        if (clientId == null || clientId.isBlank() || clientId.contains("${")) {
            throw new IllegalArgumentException("keel.apple.client-id (KEEL_APPLE_CLIENT_ID, the app's bundle ID) is not set");
        }
        if (issuer == null || issuer.isBlank() || jwksUri == null) {
            throw new IllegalArgumentException("keel.apple.issuer and keel.apple.jwks-uri must be set");
        }
    }
}
