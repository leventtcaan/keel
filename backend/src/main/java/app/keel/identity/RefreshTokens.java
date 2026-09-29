package app.keel.identity;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * Refresh tokens (K-203): 256 random bits, given to the phone once and stored only as their SHA-256. Each refresh
 * trades the token for a new one in the same family; a token used a second time means someone else has a copy, so the
 * whole family stops working and the user signs in again (rotation with reuse detection).
 */
@Repository
class RefreshTokens {

    private static final int TOKEN_BYTES = 32;

    private final JdbcClient jdbc;
    private final SessionProperties session;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    RefreshTokens(JdbcClient jdbc, SessionProperties session, Clock clock) {
        this.jdbc = jdbc;
        this.session = session;
        this.clock = clock;
    }

    /** A new family, for a fresh sign-in. */
    String start(AccountId account) {
        return issue(account, UUID.randomUUID());
    }

    /**
     * The account the token belongs to, and its replacement; UNAUTHENTICATED if it is unknown, used, revoked or old.
     * The refusal must not roll back: revoking the family on reuse is the point of refusing.
     */
    @Transactional(noRollbackFor = ApiException.class)
    Rotated rotate(String raw) {
        Stored stored = find(raw).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHENTICATED));
        int claimed = jdbc.sql("""
                update identity.refresh_token set revoked_at = :now
                where id = :id and revoked_at is null and expires_at > :now""")
                .param("id", stored.id()).param("now", now()).update();
        if (claimed == 0) {
            revokeFamily(stored.family());
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        return new Rotated(stored.account(), issue(stored.account(), stored.family()));
    }

    /** Sign-out: the token's whole family stops working. Unknown tokens are ignored, so signing out twice is fine. */
    @Transactional
    void end(String raw) {
        find(raw).ifPresent(stored -> revokeFamily(stored.family()));
    }

    record Rotated(AccountId account, String refreshToken) {
    }

    private record Stored(UUID id, AccountId account, UUID family) {
    }

    private Optional<Stored> find(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        return jdbc.sql("select id, account_id, family_id from identity.refresh_token where token_hash = :hash")
                .param("hash", AppleIdentityVerifier.hash(raw))
                .query((row, n) -> new Stored(row.getObject("id", UUID.class), new AccountId(row.getObject("account_id", UUID.class)),
                        row.getObject("family_id", UUID.class)))
                .optional();
    }

    private String issue(AccountId account, UUID family) {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        jdbc.sql("""
                insert into identity.refresh_token (id, account_id, family_id, token_hash, expires_at, created_at)
                values (:id, :account, :family, :hash, :expires, :now)""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("family", family)
                .param("hash", AppleIdentityVerifier.hash(raw)).param("expires", now().plus(session.refreshTtl()))
                .param("now", now()).update();
        return raw;
    }

    private void revokeFamily(UUID family) {
        jdbc.sql("update identity.refresh_token set revoked_at = :now where family_id = :family and revoked_at is null")
                .param("family", family).param("now", now()).update();
    }

    private OffsetDateTime now() {
        return clock.instant().atOffset(ZoneOffset.UTC);
    }
}
