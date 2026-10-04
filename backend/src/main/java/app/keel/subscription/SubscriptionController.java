package app.keel.subscription;

import app.keel.shared.AccountId;
import com.fasterxml.jackson.annotation.JsonInclude;
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

    @GetMapping("/v1/subscription")
    SubscriptionView read(AccountId account) {
        return new SubscriptionView(false, null, null, null);
    }
}
