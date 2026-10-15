package app.keel.subscription;

import app.keel.shared.AccountId;
import app.keel.shared.RevenueCatSubscribers;
import app.keel.shared.SafeLog;
import java.lang.reflect.Method;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * After a webhook, the account's entitlement is read again from RevenueCat's REST API (K-704, ADR-056 Ek 3): what its webhook docs
 * recommend after every webhook, and the only way a TRANSFER's receiver gets an end date. The answer is weighed by its moment
 * and counts only outside the settle window after the state's own moment (RevenueCatSubscriber, SubscriptionState.afterAnswer).
 *
 * <p>The refresh only adds to what the webhook did, and runs after the webhook has been answered, on its own thread: RevenueCat
 * waits 60 seconds for a 200 and sends the event again otherwise, and a slow REST API must not turn into retries. Whatever goes
 * wrong (no key, RevenueCat not answering, an answer that is not usable) leaves the webhook's result. A failure is logged by type
 * and place, never its message (V3, V5).
 */
@Service
@EnableConfigurationProperties(RevenueCatRefreshProperties.class)
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
    private final RevenueCatRefreshProperties budget;
    private final Clock clock;

    RevenueCatRefresh(RevenueCatSubscribers revenueCat, Subscriptions subscriptions, RevenueCatProperties properties,
            RevenueCatRefreshProperties budget, Clock clock) {
        this.revenueCat = revenueCat;
        this.subscriptions = subscriptions;
        this.properties = properties;
        this.budget = budget;
        this.clock = clock;
    }

    /**
     * The accounts one webhook concerned, asked about one after the other on a thread of their own (the caller does not wait):
     * the first {@code maxAccounts} of them, and none once the deadline since the first ask has passed.
     */
    @Async
    void afterWebhook(List<AccountId> accounts) {
        Instant started = clock.instant();
        for (AccountId account : accounts.stream().limit(budget.maxAccounts()).toList()) {
            if (clock.instant().isAfter(started.plus(budget.deadline()))) {
                return;
            }
            refresh(account);
        }
    }

    /** Not in a transaction: the call out may take its timeout, and holds no lock while it does. */
    void refresh(AccountId account) {
        try {
            revenueCat.fetch(account)
                    .flatMap(body -> RevenueCatSubscriber.read(body, properties.entitlement(), properties.environments()))
                    .ifPresent(answer -> subscriptions.answered(account, answer, budget.settle()));
        } catch (RuntimeException failure) {
            SafeLog.backgroundFailure(REFRESH, failure);
        }
    }
}
