package app.keel.identity;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/**
 * Checks Apple's identity token the way Apple's "Verifying a user" lists it (K-203, ADR-011): the signature against
 * Apple's published keys (RS256, appleid.apple.com/auth/keys), the issuer {@code https://appleid.apple.com}, the
 * audience — our app's client ID — the expiry, and the nonce. The phone sends Apple SHA-256(raw nonce) and sends us the
 * raw nonce, so a token captured from someone else's sign-in cannot be replayed here. Every failure of the token is the
 * same UNAUTHENTICATED: which check failed stays out of the answer and the log. If Apple's keys cannot be fetched, the
 * answer is SERVICE_UNAVAILABLE, with the cause for the log.
 */
class AppleIdentityVerifier {

    private static final String NONCE = "nonce";
    // Tolerance for the two clocks (ours and Apple's) on exp and nbf.
    private static final Duration CLOCK_SKEW = Duration.ofSeconds(60);

    private final NimbusJwtDecoder decoder;

    AppleIdentityVerifier(JWKSource<SecurityContext> appleKeys, AppleProperties apple, Clock clock) {
        decoder = NimbusJwtDecoder.withJwkSource(appleKeys).jwsAlgorithm(SignatureAlgorithm.RS256).build();
        JwtTimestampValidator expiry = new JwtTimestampValidator(CLOCK_SKEW);
        expiry.setClock(clock);
        expiry.setAllowEmptyExpiryClaim(false);
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(expiry, new JwtIssuerValidator(apple.issuer()),
                new JwtClaimValidator<List<String>>(JwtClaimNames.AUD, audience -> audience != null && audience.contains(apple.clientId()))));
    }

    AppleIdentity verify(String identityToken, String rawNonce) {
        Jwt token;
        try {
            token = decoder.decode(identityToken);
        } catch (BadJwtException refused) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        } catch (JwtException unreachable) {
            // Not the token: Apple's keys could not be fetched. Try again later, rather than "sign in again" in a loop.
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE, unreachable);
        }
        String nonce = token.getClaimAsString(NONCE);
        boolean nonceMatches = nonce != null && rawNonce != null
                && MessageDigest.isEqual(nonce.getBytes(StandardCharsets.UTF_8), hash(rawNonce).getBytes(StandardCharsets.UTF_8));
        if (!nonceMatches || token.getSubject() == null || token.getSubject().isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        return new AppleIdentity(token.getSubject());
    }

    /** SHA-256 of the raw nonce, lowercase hex — what the phone put in Apple's request. */
    static String hash(String rawNonce) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(rawNonce.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is part of every Java platform", e);
        }
    }
}
