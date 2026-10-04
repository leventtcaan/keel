package app.keel.subscription;

import app.keel.shared.AccountId;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The subscription as the server keeps it (K-705, ADR-056 addendum 1): /v1/subscription, for the paywall and the settings
 * screen. Only read; no price (ADR-012).
 */
@RestController
class SubscriptionController {

    /** Contract Subscription. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record SubscriptionView(boolean active, UUID appUserId, SubscriptionState.Status status, Instant accessUntil) {
    }

    private final Subscriptions subscriptions;
    private final Clock clock;

    SubscriptionController(Subscriptions subscriptions, Clock clock) {
        this.subscriptions = subscriptions;
        this.clock = clock;
    }

    @GetMapping("/v1/subscription")
    SubscriptionView read(AccountId account) {
        // The id RevenueCat must know the purchases by is the account's own (ADR-056 #3). Access is the server's clock
        // against accessUntil, as Entitlements decides it (#5): what the app is told is what the coach's route will do.
        return subscriptions.kept(account)
                .map(state -> new SubscriptionView(state.active(clock.instant()), account.value(), state.status(), state.accessUntil()))
                .orElse(new SubscriptionView(false, account.value(), null, null));
    }
}
