package app.keel.identity;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.interfaces.ECPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

/**
 * The client secret Apple's REST API asks for (K-812, ADR-062; developer.apple.com "Creating a client secret"): a JWT signed
 * ES256 (P-256, SHA-256) with the developer account's .p8 key. Header: alg, and kid — the key's 10-character id. Claims:
 * iss the 10-character Team ID, iat, exp (Apple refuses more than six months; this one lives minutes, made per request),
 * aud https://appleid.apple.com, sub the app's id (the bundle ID, as at sign-in).
 */
final class AppleClientSecret {

    static final String AUDIENCE = "https://appleid.apple.com";
    static final Duration LIFETIME = Duration.ofMinutes(5);

    private AppleClientSecret() {
    }

    static String sign(String teamId, String keyId, ECPrivateKey key, String clientId, Instant now) throws JOSEException {
        JWTClaimsSet claims = new JWTClaimsSet.Builder().issuer(teamId).issueTime(Date.from(now)).expirationTime(Date.from(now.plus(LIFETIME)))
                .audience(AUDIENCE).subject(clientId).build();
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.ES256).keyID(keyId).build(), claims);
        jwt.sign(new ECDSASigner(key));
        return jwt.serialize();
    }

    /** The .p8 file's text: PKCS#8 in PEM. A key that does not read stops here, its content never in the message (V5). */
    static ECPrivateKey parse(String pem) {
        String body = pem.replaceAll("-----(BEGIN|END) PRIVATE KEY-----", "").replaceAll("\\s", "");
        try {
            return (ECPrivateKey) KeyFactory.getInstance("EC").generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(body)));
        } catch (GeneralSecurityException | IllegalArgumentException | ClassCastException unreadable) {
            throw new IllegalArgumentException("the Sign in with Apple key is not a PKCS#8 EC private key");
        }
    }
}
