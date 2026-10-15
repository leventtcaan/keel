package app.keel.subscription;

import app.keel.shared.AccountId;
import app.keel.shared.RevenueCatSubscribers;
import app.keel.shared.SafeLog;
import java.lang.reflect.Method;
import org.springframework.stereotype.Service;

/**
 * After a webhook, the account's entitlement is read again from RevenueCat's REST API (K-704, ADR-056 Ek 3): what its webhook docs
 * recommend after every webhook, and the only way a TRANSFER's receiver gets an end date. The answer is weighed by its moment
 * (RevenueCatSubscriber, Subscriptions.answered), so it never takes the state back.
 *
 * <p>The refresh only adds to what the webhook did: whatever goes wrong with it (no key, RevenueCat not answering, an answer that
 * is not usable) leaves the webhook's result, and the webhook is answered 200 all the same — RevenueCat would only send the
 * event again for a state already applied. A failure is logged by type and place, never its message (V3, V5).
 */
@Service
class RevenueCatRefresh {

    /** The task a failure is logged under: SafeLog names a background task by its method. */
    private static final Method REFRESH;

    static {
        try {
            REFRESH = RevenueCatRefresh.class.getDeclaredMethod("refresh", AccountId.class);
        } catch (NoSuchMethodException e) {
            throw new IllegalStateException(e);
        }
    }

    private final RevenueCatSubscribers revenueCat;
    private final Subscriptions subscriptions;
    private final RevenueCatProperties properties;

    RevenueCatRefresh(RevenueCatSubscribers revenueCat, Subscriptions subscriptions, RevenueCatProperties properties) {
        this.revenueCat = revenueCat;
        this.subscriptions = subscriptions;
        this.properties = properties;
    }

    /** Not in a transaction: the call out may take its timeout, and holds no lock while it does. */
    void refresh(AccountId account) {
        try {
            revenueCat.fetch(account)
                    .flatMap(body -> RevenueCatSubscriber.read(body, properties.entitlement(), properties.environments()))
                    .ifPresent(answer -> subscriptions.answered(account, answer));
        } catch (RuntimeException failure) {
            SafeLog.backgroundFailure(REFRESH, failure);
        }
    }
}
