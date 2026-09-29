package app.keel.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

/**
 * Apple's identity token is checked the way Apple's "Verifying a user" says (K-203, ADR-011): the signature against
 * Apple's published keys, the issuer, the audience (our app), the expiry, and the nonce the phone hashed into the
 * request. Anything else is refused as UNAUTHENTICATED, with nothing of the token in the error.
 */
class AppleTokenVerifierTests {

    private static final Instant NOW = Instant.parse("2026-09-30T08:00:00Z");
    private static final String SUBJECT = "001234.abcdef.0909";

    private final AppleTestTokens apple = new AppleTestTokens();
    private final AppleIdentityVerifier verifier = new AppleIdentityVerifier(apple.keys(),
            new AppleProperties(AppleTestTokens.CLIENT_ID, AppleTestTokens.ISSUER, null), Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void aTokenAppleSignedForOurAppWithTheRightNonceNamesTheUser() {
        String token = apple.signed(SUBJECT, NOW, claims -> claims);

        assertThat(verifier.verify(token, AppleTestTokens.RAW_NONCE)).isEqualTo(new AppleIdentity(SUBJECT));
    }

    @Test
    void anUnsignedTokenIsRefused() {
        assertRefused(AppleTestTokens.unsigned(SUBJECT, NOW), AppleTestTokens.RAW_NONCE);
    }

    @Test
    void aTokenSignedWithAnotherKeyIsRefused() {
        assertRefused(apple.signedWithAnotherKey(SUBJECT, NOW), AppleTestTokens.RAW_NONCE);
    }

    @Test
    void anExpiredTokenIsRefused() {
        // Issued 20 minutes ago, valid for 10: expired 10 minutes ago, past the 60-second clock tolerance.
        String token = apple.signed(SUBJECT, NOW.minusSeconds(1200), claims -> claims);

        assertRefused(token, AppleTestTokens.RAW_NONCE);
    }

    @Test
    void aTokenJustInsideTheClockToleranceIsStillAccepted() {
        // Expired 30 seconds ago by our clock: within the 60 seconds our clock and Apple's may differ.
        String token = apple.signed(SUBJECT, NOW.minusSeconds(630), claims -> claims);

        assertThat(verifier.verify(token, AppleTestTokens.RAW_NONCE)).isEqualTo(new AppleIdentity(SUBJECT));
    }

    @Test
    void aTokenForAnotherAppIsRefused() {
        assertRefused(apple.signed(SUBJECT, NOW, claims -> claims.audience("com.someone.else")), AppleTestTokens.RAW_NONCE);
    }

    @Test
    void aTokenFromAnotherIssuerIsRefused() {
        assertRefused(apple.signed(SUBJECT, NOW, claims -> claims.issuer("https://evil.example")), AppleTestTokens.RAW_NONCE);
    }

    @Test
    void aTokenReplayedWithAnotherNonceIsRefused() {
        assertRefused(apple.signed(SUBJECT, NOW, claims -> claims), "a-different-raw-nonce");
    }

    @Test
    void aTokenWithoutANonceIsRefused() {
        assertRefused(apple.signed(SUBJECT, NOW, claims -> claims.claim("nonce", null)), AppleTestTokens.RAW_NONCE);
    }

    @Test
    void aTokenWithoutASubjectIsRefused() {
        assertRefused(apple.signed(SUBJECT, NOW, claims -> claims.subject(null)), AppleTestTokens.RAW_NONCE);
    }

    @Test
    void theNonceIsComparedAsTheSha256HexThePhoneSentApple() {
        // expo-apple-authentication passes SHA-256(raw) to Apple; the raw value comes to us.
        assertThat(AppleIdentityVerifier.hash("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    private void assertRefused(String token, String rawNonce) {
        assertThatThrownBy(() -> verifier.verify(token, rawNonce)).isInstanceOfSatisfying(ApiException.class,
                refused -> assertThat(refused.code()).isEqualTo(ErrorCode.UNAUTHENTICATED));
    }
}
