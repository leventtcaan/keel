package app.keel.identity;

import app.keel.shared.AccountId;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/**
 * Our session's access token (K-203): a JWT whose subject is the account id, issued by "keel", signed HS256 with the
 * key from the environment, valid for access_ttl. The same key checks it on every request (Spring Security's resource
 * server). It carries nothing but the id: no health data rides in a token (V3).
 */
class SessionTokens {

    static final String ISSUER = "keel";
    private static final Duration CLOCK_SKEW = Duration.ofSeconds(60);

    record Access(String token, Instant expiresAt) {
    }

    private final JwtEncoder encoder;
    private final NimbusJwtDecoder decoder;
    private final Duration accessTtl;
    private final Clock clock;

    SessionTokens(SessionProperties session, Clock clock) {
        SecretKey key = new SecretKeySpec(session.key(), "HmacSHA256");
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        JwtTimestampValidator expiry = new JwtTimestampValidator(CLOCK_SKEW);
        expiry.setClock(clock);
        expiry.setAllowEmptyExpiryClaim(false);
        this.decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(expiry, new JwtIssuerValidator(ISSUER)));
        this.accessTtl = session.accessTtl();
        this.clock = clock;
    }

    Access issue(AccountId account) {
        Instant now = clock.instant();
        Instant expiresAt = now.plus(accessTtl);
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(ISSUER).subject(account.value().toString())
                .issuedAt(now).expiresAt(expiresAt).build();
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new Access(token, expiresAt);
    }

    JwtDecoder decoder() {
        return decoder;
    }
}
