package app.keel.privacy;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.shared.RevenueCatSubscribers;
import app.keel.shared.SafeLog;
import java.net.URI;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

/**
 * RevenueCat's REST API v1 (K-704, ADR-056 Ek 3; docs https://www.revenuecat.com/docs/api-v1/customers): {@code GET
 * /subscribers/{app_user_id}} for the subscriber's current state, and {@code DELETE /subscribers/{app_user_id}} for the
 * customer at account deletion. Only our opaque account id goes out, with the secret key as a Bearer; the call runs through
 * EgressGate (bounded by its timeout, redirects refused). With no key set the read is off and the delete waits (in production),
 * and that is said once, at start.
 *
 * <p>Docs: GET answers 200, or 201 when it created the customer; DELETE "is queued asynchronously" and, for retry-safe
 * flows, 200 and 404 both mean deleted. A 401 is a key that is not accepted, which is our setup (INTERNAL, as Apple's);
 * anything else is RevenueCat not being able to answer now (SERVICE_UNAVAILABLE).
 */
@Service
@EnableConfigurationProperties(RevenueCatRestProperties.class)
class RevenueCatRest implements RevenueCatSubscribers {

    private final EgressGate egress;
    private final RevenueCatRestProperties properties;
    private final boolean production;

    RevenueCatRest(EgressGate egress, RevenueCatRestProperties properties, @Value("${keel.production}") boolean production) {
        this.egress = egress;
        this.properties = properties;
        this.production = production;
        if (!properties.configured()) {
            try {
                SafeLog.degraded(RevenueCatRest.class.getDeclaredMethod("fetch", AccountId.class));
            } catch (NoSuchMethodException e) {
                throw new IllegalStateException(e);
            }
        }
    }

    @Override
    public Optional<String> fetch(AccountId account) {
        if (!properties.configured()) {
            return Optional.empty();
        }
        EgressGate.Answer answer = egress.call(EgressGate.Destination.REVENUECAT_ACCOUNT, "GET", subscriber(account), authorization());
        accepted(answer);
        return Optional.ofNullable(answer.body());
    }

    /**
     * The customer is deleted at RevenueCat; 200 and 404 are both "deleted". Anything else raises, for the deletion's retry.
     * With no key in production it raises too: the app's own SDK makes the customer whether or not the server has a key, so
     * completing here would leave it for good. The deletion then stays pending (DeletionRetry resends it) until the key is set.
     * Outside production there is nothing to keep waiting for.
     */
    void delete(AccountId account) {
        if (!properties.configured()) {
            if (production) {
                throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE);
            }
            return;
        }
        EgressGate.Answer answer = egress.call(EgressGate.Destination.REVENUECAT_ACCOUNT, "DELETE", subscriber(account), authorization());
        if (answer.status() != 404) {
            accepted(answer);
        }
    }

    private URI subscriber(AccountId account) {
        // base-uri ends in a slash (…/v1/): resolve keeps its path.
        return properties.baseUri().resolve("subscribers/" + account.value());
    }

    private Map<String, String> authorization() {
        return Map.of("Authorization", "Bearer " + properties.apiKey());
    }

    private static void accepted(EgressGate.Answer answer) {
        if (answer.ok()) {
            return;
        }
        throw new ApiException(answer.status() == 401 ? ErrorCode.INTERNAL : ErrorCode.SERVICE_UNAVAILABLE);
    }
}
