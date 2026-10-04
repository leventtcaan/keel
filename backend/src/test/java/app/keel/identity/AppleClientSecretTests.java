package app.keel.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.crypto.ECDSAVerifier;
import com.nimbusds.jwt.SignedJWT;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * The client secret Apple's REST API asks for (K-812, ADR-062; developer.apple.com "Creating a client secret"): a JWT signed
 * ES256 with the developer account's .p8 key — header alg ES256 and the key's id, claims iss the Team ID, iat, exp (Apple
 * refuses more than six months), aud https://appleid.apple.com, sub the app's id.
 */
class AppleClientSecretTests {

    static final Instant NOW = Instant.parse("2026-10-05T10:00:00Z");

    static KeyPair keys() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        return generator.generateKeyPair();
    }

    /** The key as Apple hands it out: a .p8 file, PKCS#8 in PEM. */
    static String p8(KeyPair keys) {
        String body = Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(keys.getPrivate().getEncoded());
        return "-----BEGIN PRIVATE KEY-----\n" + body + "\n-----END PRIVATE KEY-----\n";
    }

    @Test
    void signedES256WithTheKeyAndItsId() throws Exception {
        KeyPair keys = keys();

        SignedJWT secret = SignedJWT.parse(AppleClientSecret.sign("TEAM123456", "KEY1234567", AppleClientSecret.parse(p8(keys)), "app.keel", NOW));

        assertThat(secret.getHeader().getAlgorithm()).isEqualTo(JWSAlgorithm.ES256);
        assertThat(secret.getHeader().getKeyID()).isEqualTo("KEY1234567");
        assertThat(secret.verify(new ECDSAVerifier((ECPublicKey) keys.getPublic()))).isTrue();
    }

    @Test
    void itsClaimsAreApplesAndItLivesMinutes() throws Exception {
        SignedJWT secret = SignedJWT.parse(AppleClientSecret.sign("TEAM123456", "KEY1234567", AppleClientSecret.parse(p8(keys())), "app.keel", NOW));

        var claims = secret.getJWTClaimsSet();
        assertThat(claims.getIssuer()).isEqualTo("TEAM123456");
        assertThat(claims.getSubject()).isEqualTo("app.keel");
        assertThat(claims.getAudience()).isEqualTo(List.of("https://appleid.apple.com"));
        assertThat(claims.getIssueTime()).isEqualTo(Date.from(NOW));
        assertThat(Duration.between(NOW, claims.getExpirationTime().toInstant())).isEqualTo(AppleClientSecret.LIFETIME)
                .isLessThanOrEqualTo(Duration.ofDays(180));
    }

    @Test
    void aKeyFileWithSpacesAndWindowsLineEndsStillReads() throws Exception {
        KeyPair keys = keys();
        String messy = "  " + p8(keys).replace("\n", "\r\n") + "\r\n";

        assertThat(AppleClientSecret.parse(messy).getS()).isEqualTo(((java.security.interfaces.ECPrivateKey) keys.getPrivate()).getS());
    }

    @Test
    void aKeyKeptOnOneLineWithEscapedLineEndsReads() throws Exception {
        // An environment file holds one line: the PEM's line ends written as \n (Docker --env-file, GitHub secrets pasted so).
        KeyPair keys = keys();
        String oneLine = p8(keys).replace("\n", "\\n");

        assertThat(AppleClientSecret.parse(oneLine).getS()).isEqualTo(((java.security.interfaces.ECPrivateKey) keys.getPrivate()).getS());
    }

    @Test
    void somethingElseIsRefusedWithoutItsContentInTheMessage() {
        assertThatThrownBy(() -> AppleClientSecret.parse("-----BEGIN PRIVATE KEY-----\nbm90LWEta2V5\n-----END PRIVATE KEY-----"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageNotContaining("bm90LWEta2V5");
    }
}
