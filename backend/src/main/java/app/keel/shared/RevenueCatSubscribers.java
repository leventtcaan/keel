package app.keel.shared;

import java.util.Optional;

/**
 * RevenueCat's REST answer about one subscriber (K-704, ADR-056 Ek 3): {@code GET /v1/subscribers/{app_user_id}}, the call its
 * webhook docs recommend after every webhook. In shared because the call itself is privacy's (the one way out, EgressRuleTests)
 * and the state it refreshes is subscription's, and subscription may not depend on privacy.
 */
public interface RevenueCatSubscribers {

    /**
     * The answer's body (JSON text), or none when no secret API key is set: the refresh is then off, and says so once at start.
     * A key that is set but an answer that is not (RevenueCat down, key refused, too slow) is an {@link ApiException}.
     */
    Optional<String> fetch(AccountId account);
}
