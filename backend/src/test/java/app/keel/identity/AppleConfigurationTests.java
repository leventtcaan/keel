package app.keel.identity;

import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatNoException;

import java.net.URI;
import org.junit.jupiter.api.Test;

/**
 * A missing Apple setting stops the application from starting (K-203 review): an unset KEEL_APPLE_CLIENT_ID would
 * otherwise bind as the literal "${KEEL_APPLE_CLIENT_ID}", and every sign-in would fail with nothing to say why.
 */
class AppleConfigurationTests {

    private static final URI KEYS = URI.create("https://appleid.apple.com/auth/keys");

    @Test
    void theClientIdMustBeSetForReal() {
        assertThatIllegalArgumentException().isThrownBy(() -> new AppleProperties(null, "https://appleid.apple.com", KEYS));
        assertThatIllegalArgumentException().isThrownBy(() -> new AppleProperties(" ", "https://appleid.apple.com", KEYS));
        assertThatIllegalArgumentException().isThrownBy(() -> new AppleProperties("${KEEL_APPLE_CLIENT_ID}", "https://appleid.apple.com", KEYS));
    }

    @Test
    void theIssuerAndKeysMustBeSet() {
        assertThatIllegalArgumentException().isThrownBy(() -> new AppleProperties("app.keel", null, KEYS));
        assertThatIllegalArgumentException().isThrownBy(() -> new AppleProperties("app.keel", "https://appleid.apple.com", null));
        assertThatNoException().isThrownBy(() -> new AppleProperties("app.keel", "https://appleid.apple.com", KEYS));
    }
}
