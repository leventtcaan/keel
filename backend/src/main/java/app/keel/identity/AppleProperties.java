package app.keel.identity;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Sign in with Apple (K-203). {@code clientId} is the app's bundle ID — Apple's {@code aud} for a native app — read
 * from the environment (KEEL_APPLE_CLIENT_ID); the issuer and key set URL are Apple's published values.
 */
@ConfigurationProperties("keel.apple")
record AppleProperties(String clientId, String issuer, URI jwksUri) {
}
