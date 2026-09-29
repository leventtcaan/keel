package app.keel.identity;

import java.time.Duration;
import java.util.Base64;
import java.util.Objects;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Session tokens (K-203). The signing key comes from the environment (KEEL_SESSION_SECRET, base64, V5) and must be
 * at least 256 bits, what HS256 needs; a missing or short key stops the application from starting. Access tokens
 * live minutes, refresh tokens weeks (application.yml).
 */
@ConfigurationProperties("keel.session")
record SessionProperties(String secret, Duration accessTtl, Duration refreshTtl) {

    private static final int MIN_KEY_BYTES = 32;

    SessionProperties {
        if (secret == null || secret.isBlank() || Base64.getDecoder().decode(secret).length < MIN_KEY_BYTES) {
            throw new IllegalArgumentException("keel.session.secret must be base64 of at least " + MIN_KEY_BYTES + " bytes");
        }
        Objects.requireNonNull(accessTtl, "keel.session.access-ttl");
        Objects.requireNonNull(refreshTtl, "keel.session.refresh-ttl");
    }

    byte[] key() {
        return Base64.getDecoder().decode(secret);
    }
}
