package app.keel.identity;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import com.nimbusds.jwt.SignedJWT;
import java.time.Instant;
import java.util.Date;
import java.util.function.UnaryOperator;

/**
 * Stands in for Apple in tests: an RSA key pair published as a key set (as appleid.apple.com/auth/keys publishes its
 * RS256 keys) and identity tokens signed with it, their claims as Apple sets them unless a test changes one.
 */
final class AppleTestTokens {

    static final String CLIENT_ID = "app.keel.test";
    static final String ISSUER = "https://appleid.apple.com";
    static final String RAW_NONCE = "raw-nonce-from-the-phone";

    private final RSAKey key;
    private final RSAKey otherKey;

    AppleTestTokens() {
        try {
            key = new RSAKeyGenerator(2048).keyID("apple-test-key").generate();
            otherKey = new RSAKeyGenerator(2048).keyID("apple-test-key").generate();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }

    /** The public half, as Apple publishes it. */
    JWKSource<SecurityContext> keys() {
        return new ImmutableJWKSet<>(new JWKSet(key.toPublicJWK()));
    }

    /** A token Apple would issue to our app now, for this subject, with the phone's hashed nonce. */
    static JWTClaimsSet.Builder claims(String subject, Instant now) {
        return new JWTClaimsSet.Builder().issuer(ISSUER).audience(CLIENT_ID).subject(subject)
                .issueTime(Date.from(now)).expirationTime(Date.from(now.plusSeconds(600)))
                .claim("nonce", AppleIdentityVerifier.hash(RAW_NONCE));
    }

    String signed(String subject, Instant now, UnaryOperator<JWTClaimsSet.Builder> change) {
        return sign(key, change.apply(claims(subject, now)).build());
    }

    String signedWithAnotherKey(String subject, Instant now) {
        return sign(otherKey, claims(subject, now).build());
    }

    /** HS256 with the RSA public key's encoded bytes as the HMAC secret: the classic algorithm-confusion forgery. */
    String hmacWithPublicKey(String subject, Instant now) {
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.HS256).keyID(key.getKeyID()).build(), claims(subject, now).build());
            jwt.sign(new MACSigner(key.toRSAPublicKey().getEncoded()));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }

    static String unsigned(String subject, Instant now) {
        return new PlainJWT(claims(subject, now).build()).serialize();
    }

    private static String sign(RSAKey with, JWTClaimsSet claims) {
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(with.getKeyID()).build(), claims);
            jwt.sign(new RSASSASigner(with));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }
}
