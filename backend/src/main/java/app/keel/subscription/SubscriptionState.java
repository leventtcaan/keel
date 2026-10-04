package app.keel.subscription;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

/**
 * An account's subscription, as RevenueCat's events say it is (ADR-056 #5-7). Access is read from {@code accessUntil} alone;
 * the status only says what kind of state it is (a trial, cancelled but paid until its end, paused…), for the app to tell.
 * {@code lastEventAt} is the moment of the event the state comes from.
 *
 * <p>Each state is worked out from one event alone, never from the state before it: the same event twice is the event
 * once. And an event older than the state's is kept out, so events at different moments leave the state of the latest,
 * in whatever order they come.
 */
record SubscriptionState(Status status, Instant accessUntil, Instant lastEventAt) {

    enum Status { TRIAL, ACTIVE, CANCELLED, BILLING_ISSUE, PAUSED, EXPIRED, REFUNDED }

    /** The events that give access until their expiration (a lapsed user who buys again comes as a RENEWAL). */
    private static final Set<String> GRANTS = Set.of("INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "SUBSCRIPTION_EXTENDED",
            "REFUND_REVERSED", "TEMPORARY_ENTITLEMENT_GRANT", "NON_RENEWING_PURCHASE");
    /** A refund is a cancellation for this reason (docs: event types and fields). */
    private static final String REFUND = "CUSTOMER_SUPPORT";
    private static final String PAUSE = "SUBSCRIPTION_PAUSED";

    boolean active(Instant now) {
        return now.isBefore(accessUntil);
    }

    /**
     * What this event says the subscription to {@code entitlement} is; none for an event about another entitlement, or of
     * a kind that says nothing about access (a test, a product change that takes effect later, an invoice…).
     */
    static Optional<SubscriptionState> of(SubscriptionEvent event, String entitlement) {
        if (event.entitlementIds() == null || !event.entitlementIds().contains(entitlement)) {
            return Optional.empty();
        }
        Instant at = event.at();
        Instant end = event.expiresAt();
        if (GRANTS.contains(event.type())) {
            // No lifetime product is sold (ADR-012): a grant without an end says nothing the server can keep.
            return Optional.ofNullable(end).map(until -> new SubscriptionState("TRIAL".equals(event.periodType()) ? Status.TRIAL : Status.ACTIVE, until, at));
        }
        return switch (event.type()) {
            case "CANCELLATION" -> REFUND.equals(event.cancelReason())
                    ? Optional.of(new SubscriptionState(Status.REFUNDED, at, at))
                    // Cancelling keeps what was paid for: access to the period's end (no punishment for leaving, ADR-012).
                    : Optional.ofNullable(end).map(until -> new SubscriptionState(Status.CANCELLED, until, at));
            case "BILLING_ISSUE" -> Optional.ofNullable(event.graceUntil() != null ? event.graceUntil() : end)
                    .map(until -> new SubscriptionState(Status.BILLING_ISSUE, until, at));
            // Google Play only: the pause starts at the period's end, and access with it (docs).
            case "SUBSCRIPTION_PAUSED" -> Optional.ofNullable(end).map(until -> new SubscriptionState(Status.PAUSED, until, at));
            case "EXPIRATION" -> Optional.of(new SubscriptionState(PAUSE.equals(event.expirationReason()) ? Status.PAUSED : Status.EXPIRED, at, at));
            default -> Optional.empty();
        };
    }

    /** The account a TRANSFER took the purchases from: no access from that moment (ADR-056 #6). */
    static SubscriptionState transferredAway(Instant at) {
        return new SubscriptionState(Status.EXPIRED, at, at);
    }

    /** The state after an event's: the event's, unless it is older than the current state's (it never takes it back). */
    static SubscriptionState next(Optional<SubscriptionState> current, SubscriptionState implied) {
        return current.filter(state -> implied.lastEventAt().isBefore(state.lastEventAt())).orElse(implied);
    }
}
