package app.keel.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtException;

/** Our own session token (K-203): a short-lived JWT naming the account, signed with a key from the environment (V5). */
class SessionTokensTests {

    private static final Instant NOW = Instant.parse("2026-09-30T08:00:00Z");
    private static final String SECRET = Base64.getEncoder().encodeToString("0123456789abcdef0123456789abcdef".getBytes());
    private static final AccountId ACCOUNT = new AccountId(UUID.fromString("7a1c0de0-0000-4000-8000-000000000001"));
    private static final Duration ACCESS = Duration.ofMinutes(15);

    private final SessionTokens tokens = new SessionTokens(new SessionProperties(SECRET, ACCESS, Duration.ofDays(60)),
            Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void anAccessTokenNamesTheAccountAndExpires() {
        SessionTokens.Access access = tokens.issue(ACCOUNT);
        Jwt decoded = tokens.decoder().decode(access.token());

        assertThat(decoded.getSubject()).isEqualTo(ACCOUNT.value().toString());
        assertThat(decoded.getClaimAsString(JwtClaimNames.ISS)).isEqualTo(SessionTokens.ISSUER);
        assertThat(decoded.getExpiresAt()).isEqualTo(NOW.plus(ACCESS));
        assertThat(access.expiresAt()).isEqualTo(NOW.plus(ACCESS));
    }

    @Test
    void aTokenSignedWithAnotherKeyIsRefused() {
        String other = Base64.getEncoder().encodeToString("fedcba9876543210fedcba9876543210".getBytes());
        String forged = new SessionTokens(new SessionProperties(other, ACCESS, Duration.ofDays(60)), Clock.fixed(NOW, ZoneOffset.UTC))
                .issue(ACCOUNT).token();

        assertThatThrownBy(() -> tokens.decoder().decode(forged)).isInstanceOf(JwtException.class);
    }

    @Test
    void anExpiredTokenIsRefused() {
        String old = new SessionTokens(new SessionProperties(SECRET, ACCESS, Duration.ofDays(60)),
                Clock.fixed(NOW.minus(ACCESS).minusSeconds(120), ZoneOffset.UTC)).issue(ACCOUNT).token();

        assertThatThrownBy(() -> tokens.decoder().decode(old)).isInstanceOf(JwtException.class);
    }

    @Test
    void aShortKeyStopsTheApplicationFromStarting() {
        // HS256 needs at least 256 bits; a short key from a misconfigured environment must not be used quietly.
        String short16 = Base64.getEncoder().encodeToString("0123456789abcdef".getBytes());

        assertThatIllegalArgumentException().isThrownBy(() -> new SessionProperties(short16, ACCESS, Duration.ofDays(60)));
        assertThatIllegalArgumentException().isThrownBy(() -> new SessionProperties(null, ACCESS, Duration.ofDays(60)));
    }
}
