package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import java.time.Duration;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * RevenueCat's settings (K-701, ADR-056; V5): without the signing secret no webhook could ever be proven RevenueCat's, so
 * the server does not start — an unset KEEL_REVENUECAT_WEBHOOK_SECRET binds as the literal "${…}", which is no secret
 * either. The secret never shows in what the settings print.
 */
class RevenueCatConfigurationTests {

    private static final Duration FIVE_MINUTES = Duration.ofMinutes(5);
    private static final Set<String> BOTH = Set.of("PRODUCTION", "SANDBOX");

    @Test
    void noSecretNoStart() {
        for (String secret : new String[] {null, "", "  ", "${KEEL_REVENUECAT_WEBHOOK_SECRET}"}) {
            assertThatIllegalStateException().as(String.valueOf(secret))
                    .isThrownBy(() -> new RevenueCatProperties(secret, FIVE_MINUTES, "premium", BOTH, 65536));
        }
    }

    @Test
    void theOtherSettingsAreChecked() {
        assertThatIllegalStateException().as("no tolerance").isThrownBy(() -> new RevenueCatProperties("s", Duration.ZERO, "premium", BOTH, 65536));
        assertThatIllegalStateException().as("no entitlement").isThrownBy(() -> new RevenueCatProperties("s", FIVE_MINUTES, " ", BOTH, 65536));
        assertThatIllegalStateException().as("no environment").isThrownBy(() -> new RevenueCatProperties("s", FIVE_MINUTES, "premium", Set.of(), 65536));
        assertThatIllegalStateException().as("a store that is none").isThrownBy(() -> new RevenueCatProperties("s", FIVE_MINUTES, "premium",
                Set.of("PRODUCTION", "STAGING"), 65536));
        assertThatIllegalStateException().as("no body").isThrownBy(() -> new RevenueCatProperties("s", FIVE_MINUTES, "premium", BOTH, 0));
        assertThatIllegalStateException().as("a negative tolerance").isThrownBy(() -> new RevenueCatProperties("s", Duration.ofMinutes(-5), "premium", BOTH, 65536));
        assertThatIllegalStateException().as("no tolerance at all").isThrownBy(() -> new RevenueCatProperties("s", null, "premium", BOTH, 65536));
        assertThatIllegalStateException().as("an entitlement unset").isThrownBy(() -> new RevenueCatProperties("s", FIVE_MINUTES, null, BOTH, 65536));
        assertThatIllegalStateException().as("environments unset").isThrownBy(() -> new RevenueCatProperties("s", FIVE_MINUTES, "premium", null, 65536));
        assertThatIllegalStateException().as("max body unset").isThrownBy(() -> new RevenueCatProperties("s", FIVE_MINUTES, "premium", BOTH, null));
    }

    @Test
    void theSecretIsNeverPrinted() {
        RevenueCatProperties properties = new RevenueCatProperties("the-real-secret", FIVE_MINUTES, "premium", BOTH, 65536);

        assertThat(properties.toString()).doesNotContain("the-real-secret").contains("premium");
    }
}
