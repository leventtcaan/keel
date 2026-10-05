package app.keel.identity;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.nimbusds.jose.JOSEException;
import java.net.URI;
import java.security.interfaces.ECPrivateKey;
import java.time.Clock;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

/**
 * What identity knows of Sign in with Apple, for the account's deletion (K-812, ADR-062): the app's id, a client secret
 * signed with the developer account's key, Apple's address, whether an identity token Apple answered with is valid and
 * whose it is, and whose an account is. The call to Apple itself is privacy's (the one way out, EgressRuleTests).
 */
@Service
@EnableConfigurationProperties(AppleRevocationProperties.class)
public class AppleAccounts {

    private final AppleRevocationProperties revocation;
    private final AppleProperties apple;
    private final AppleIdentityVerifier verifier;
    private final Accounts accounts;
    private final Clock clock;
    private final ECPrivateKey key;

    AppleAccounts(AppleRevocationProperties revocation, AppleProperties apple, AppleIdentityVerifier verifier, Accounts accounts, Clock clock,
            @Value("${keel.production}") boolean production) {
        this.revocation = revocation;
        this.apple = apple;
        this.verifier = verifier;
        this.accounts = accounts;
        this.clock = clock;
        // In production a deletion must end the Apple sign-in too (ADR-062 #3, K-907): no key, no start.
        if (production && !revocation.configured()) {
            throw new IllegalStateException("In production (keel.production) Sign in with Apple revocation needs KEEL_APPLE_TEAM_ID, KEEL_APPLE_KEY_ID and "
                    + "KEEL_APPLE_PRIVATE_KEY (ADR-062)");
        }
        // Read once, at start: a key that is set but does not read stops the server here, not at someone's deletion.
        this.key = revocation.configured() ? AppleClientSecret.parse(revocation.privateKey()) : null;
    }

    /** Whether revoking can be done: the Team ID, the key's id and the key are all set. */
    public boolean revocationConfigured() {
        return key != null;
    }

    public String clientId() {
        return apple.clientId();
    }

    /** Apple's endpoint at this path (/auth/token, /auth/revoke). */
    public URI endpoint(String path) {
        return revocation.baseUri().resolve(path);
    }

    /** A client secret for one request: minutes long, signed now. */
    public String clientSecret() {
        if (key == null) {
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE);
        }
        try {
            return AppleClientSecret.sign(revocation.teamId(), revocation.keyId(), key, apple.clientId(), clock.instant());
        } catch (JOSEException failed) {
            throw new ApiException(ErrorCode.INTERNAL, failed);
        }
    }

    /** Whose an identity token Apple answered our server with is; VALIDATION_FAILED when it is not a valid one of Apple's. */
    public String subjectOf(String identityToken) {
        return verifier.subjectOf(identityToken);
    }

    /** Apple's id for this account's person; none when the account is gone. */
    public Optional<String> subjectOf(AccountId account) {
        return accounts.appleSubject(account);
    }
}
