package app.keel.identity;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Revoking Sign in with Apple at account deletion (K-812, ADR-062): the developer account's Team ID, the .p8 key's id and
 * the key itself (PEM text), all from the environment (V5); Apple's address. Any of the three not set — an unset
 * environment variable binds as the literal "${…}" — and revocation is unavailable: deletion goes on without it.
 */
@ConfigurationProperties("keel.apple.revocation")
record AppleRevocationProperties(String teamId, String keyId, String privateKey, URI baseUri) {

    boolean configured() {
        return set(teamId) && set(keyId) && set(privateKey) && baseUri != null;
    }

    private static boolean set(String value) {
        return value != null && !value.isBlank() && !value.contains("${");
    }
}
