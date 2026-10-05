package app.keel.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import java.net.URI;
import java.time.Clock;
import org.junit.jupiter.api.Test;

/**
 * A production server without the Sign in with Apple key does not start (K-907, ADR-062 #3): deleting an account there
 * must end the user's Apple sign-in too, and a deletion is not the moment to find the key missing. In development the key
 * may be absent — revocation answers "unavailable" and the deletion goes on (AppleRevocationUnavailableTests).
 */
class AppleAccountsProductionTests {

    private static final URI APPLE = URI.create("https://appleid.apple.com");
    private static final AppleProperties APP = new AppleProperties("app.keel", "https://appleid.apple.com", URI.create("https://appleid.apple.com/auth/keys"));

    private static AppleAccounts accounts(AppleRevocationProperties revocation, boolean production) {
        return new AppleAccounts(revocation, APP, null, null, Clock.systemUTC(), production);
    }

    @Test
    void inProductionAMissingKeyStopsTheServer() {
        // An unset environment variable binds as the literal "${…}" (AppleRevocationProperties.configured).
        AppleRevocationProperties unset = new AppleRevocationProperties("${KEEL_APPLE_TEAM_ID}", "${KEEL_APPLE_KEY_ID}", "${KEEL_APPLE_PRIVATE_KEY}", APPLE);
        AppleRevocationProperties partly = new AppleRevocationProperties("TEAM123456", "KEY1234567", " ", APPLE);

        for (AppleRevocationProperties missing : new AppleRevocationProperties[] {unset, partly}) {
            assertThatIllegalStateException().isThrownBy(() -> accounts(missing, true))
                    .withMessageContaining("KEEL_APPLE_TEAM_ID").withMessageContaining("KEEL_APPLE_KEY_ID")
                    .withMessageContaining("KEEL_APPLE_PRIVATE_KEY").withMessageContaining("production");
        }
    }

    @Test
    void inProductionWithTheKeyItStarts() throws Exception {
        String key = AppleClientSecretTests.p8(AppleClientSecretTests.keys());

        assertThat(accounts(new AppleRevocationProperties("TEAM123456", "KEY1234567", key, APPLE), true).revocationConfigured()).isTrue();
    }

    @Test
    void inDevelopmentAMissingKeyIsRevocationUnavailable() {
        AppleRevocationProperties unset = new AppleRevocationProperties("${KEEL_APPLE_TEAM_ID}", "${KEEL_APPLE_KEY_ID}", "${KEEL_APPLE_PRIVATE_KEY}", APPLE);

        assertThat(accounts(unset, false).revocationConfigured()).isFalse();
    }
}
