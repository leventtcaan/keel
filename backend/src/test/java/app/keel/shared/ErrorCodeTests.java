package app.keel.shared;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * The error codes (ADR-024, K-703): a 403 the server itself names says why — the consent (CONSENT_REQUIRED) or the
 * subscription (ENTITLEMENT_REQUIRED). A bare 403 from Spring or the container is neither: it is FORBIDDEN, so the app
 * never asks for a consent or opens the paywall for a refusal that is about something else.
 */
class ErrorCodeTests {

    @Test
    void theSubscriptionHasItsOwn403() {
        assertThat(ErrorCode.valueOf("ENTITLEMENT_REQUIRED").status()).isEqualTo(403);
        assertThat(ErrorCode.valueOf("ENTITLEMENT_REQUIRED").message()).doesNotContainIgnoringCase("credit");
    }

    @Test
    void aBare403IsForbiddenNeverAConsentOrASubscription() {
        assertThat(ErrorCode.forStatus(403)).isEqualTo(ErrorCode.FORBIDDEN);
    }
}
