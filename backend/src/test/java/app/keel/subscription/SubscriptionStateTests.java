package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.subscription.SubscriptionState.Status;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * What a RevenueCat event says the subscription is (ADR-056 #5-7). Access is read from accessUntil alone; the status
 * only says what kind of state it is. A refund ends access at once; a cancellation keeps the paid period; an older
 * event never takes the state back.
 */
class SubscriptionStateTests {

    static final String PREMIUM = "premium";
    static final Instant AT = Instant.parse("2026-10-04T12:00:00Z");
    static final Instant PERIOD_END = AT.plus(Duration.ofDays(7));

    static SubscriptionEvent event(String type, Instant at) {
        return new SubscriptionEvent("e-" + type + "-" + at.toEpochMilli(), type, at, "user", List.of(PREMIUM), "NORMAL", PERIOD_END,
                null, null, null, "PRODUCTION", null);
    }

    static SubscriptionEvent with(SubscriptionEvent e, String periodType, String cancelReason, String expirationReason, Instant graceUntil) {
        return new SubscriptionEvent(e.id(), e.type(), e.at(), e.appUserId(), e.entitlementIds(), periodType, e.expiresAt(), graceUntil,
                cancelReason, expirationReason, e.environment(), e.transferredFrom());
    }

    private static SubscriptionState of(SubscriptionEvent e) {
        return SubscriptionState.of(e, PREMIUM).orElseThrow();
    }

    @Test
    void aPurchaseInItsTrialIsATrialUntilItsEnd() {
        SubscriptionState trial = of(with(event("INITIAL_PURCHASE", AT), "TRIAL", null, null, null));

        assertThat(trial).isEqualTo(new SubscriptionState(Status.TRIAL, PERIOD_END, AT));
        assertThat(trial.active(AT)).isTrue();
        assertThat(trial.active(PERIOD_END.minusMillis(1))).isTrue();
        assertThat(trial.active(PERIOD_END)).as("access ends at the period's end").isFalse();
    }

    @Test
    void everyGrantingEventIsActiveUntilItsExpiration() {
        for (String type : List.of("INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "SUBSCRIPTION_EXTENDED", "REFUND_REVERSED",
                "TEMPORARY_ENTITLEMENT_GRANT", "NON_RENEWING_PURCHASE")) {
            assertThat(of(event(type, AT))).as(type).isEqualTo(new SubscriptionState(Status.ACTIVE, PERIOD_END, AT));
        }
    }

    @Test
    void aGrantWithoutAnEndGrantsNothing() {
        // No lifetime product is sold (ADR-012): an event without expiration_at_ms says nothing the server can keep.
        SubscriptionEvent forever = new SubscriptionEvent("e", "NON_RENEWING_PURCHASE", AT, "user", List.of(PREMIUM), "NORMAL", null,
                null, null, null, "PRODUCTION", null);

        assertThat(SubscriptionState.of(forever, PREMIUM)).isEmpty();
    }

    @Test
    void aCancellationKeepsThePaidPeriodButARefundEndsItAtOnce() {
        SubscriptionState cancelled = of(with(event("CANCELLATION", AT), "NORMAL", "UNSUBSCRIBE", null, null));
        SubscriptionState refunded = of(with(event("CANCELLATION", AT), "NORMAL", "CUSTOMER_SUPPORT", null, null));

        assertThat(cancelled).isEqualTo(new SubscriptionState(Status.CANCELLED, PERIOD_END, AT));
        assertThat(cancelled.active(AT.plusSeconds(1))).isTrue();
        assertThat(refunded).isEqualTo(new SubscriptionState(Status.REFUNDED, AT, AT));
        assertThat(refunded.active(AT)).isFalse();
    }

    @Test
    void aBillingIssueKeepsAccessThroughTheGracePeriod() {
        Instant grace = AT.plus(Duration.ofDays(16));

        assertThat(of(with(event("BILLING_ISSUE", AT), "NORMAL", null, null, grace))).isEqualTo(new SubscriptionState(Status.BILLING_ISSUE, grace, AT));
        assertThat(of(event("BILLING_ISSUE", AT))).as("no grace period").isEqualTo(new SubscriptionState(Status.BILLING_ISSUE, PERIOD_END, AT));
    }

    @Test
    void aPauseKeepsAccessUntilThePeriodEndsAndThePausedExpirationEndsIt() {
        assertThat(of(event("SUBSCRIPTION_PAUSED", AT))).isEqualTo(new SubscriptionState(Status.PAUSED, PERIOD_END, AT));
        assertThat(of(with(event("EXPIRATION", AT), "NORMAL", null, "SUBSCRIPTION_PAUSED", null))).isEqualTo(new SubscriptionState(Status.PAUSED, AT, AT));
    }

    @Test
    void anExpirationEndsAccessAtItsMoment() {
        assertThat(of(with(event("EXPIRATION", AT), "NORMAL", null, "UNSUBSCRIBE", null))).isEqualTo(new SubscriptionState(Status.EXPIRED, AT, AT));
    }

    @Test
    void anEventForAnotherEntitlementOrOfNoInterestSaysNothing() {
        SubscriptionEvent other = new SubscriptionEvent("e", "RENEWAL", AT, "user", List.of("something_else"), "NORMAL", PERIOD_END,
                null, null, null, "PRODUCTION", null);
        SubscriptionEvent unmapped = new SubscriptionEvent("e", "RENEWAL", AT, "user", null, "NORMAL", PERIOD_END, null, null, null,
                "PRODUCTION", null);

        assertThat(SubscriptionState.of(other, PREMIUM)).isEmpty();
        assertThat(SubscriptionState.of(unmapped, PREMIUM)).isEmpty();
        for (String type : List.of("TEST", "PRODUCT_CHANGE", "INVOICE_ISSUANCE", "TRANSFER", "EXPERIMENT_ENROLLMENT", "SOMETHING_NEW")) {
            assertThat(SubscriptionState.of(event(type, AT), PREMIUM)).as(type).isEmpty();
        }
    }

    @Test
    void aCancellationOrABillingIssueWithoutAnEndSaysNothing() {
        SubscriptionEvent cancelled = new SubscriptionEvent("e", "CANCELLATION", AT, "user", List.of(PREMIUM), "NORMAL", null, null,
                "UNSUBSCRIBE", null, "PRODUCTION", null);
        SubscriptionEvent billing = new SubscriptionEvent("e", "BILLING_ISSUE", AT, "user", List.of(PREMIUM), "NORMAL", null, null, null,
                null, "PRODUCTION", null);
        SubscriptionEvent paused = new SubscriptionEvent("e", "SUBSCRIPTION_PAUSED", AT, "user", List.of(PREMIUM), "NORMAL", null, null,
                null, null, "PRODUCTION", null);

        assertThat(SubscriptionState.of(cancelled, PREMIUM)).isEmpty();
        assertThat(SubscriptionState.of(billing, PREMIUM)).isEmpty();
        assertThat(SubscriptionState.of(paused, PREMIUM)).isEmpty();
    }

    @Test
    void theAccountATransferTookFromHasNoAccessFromThatMoment() {
        assertThat(SubscriptionState.transferredAway(AT)).isEqualTo(new SubscriptionState(Status.EXPIRED, AT, AT));
    }

    @Test
    void anOlderEventNeverTakesTheStateBackButAnEqualOrNewerOneDoes() {
        SubscriptionState renewed = of(event("RENEWAL", AT));
        SubscriptionState earlierCancel = of(with(event("CANCELLATION", AT.minusSeconds(60)), "NORMAL", "UNSUBSCRIBE", null, null));
        SubscriptionState laterExpiry = of(with(event("EXPIRATION", AT.plusSeconds(60)), "NORMAL", null, "UNSUBSCRIBE", null));
        SubscriptionState sameMoment = of(with(event("CANCELLATION", AT), "NORMAL", "UNSUBSCRIBE", null, null));

        assertThat(SubscriptionState.next(Optional.of(renewed), earlierCancel)).isEqualTo(renewed);
        assertThat(SubscriptionState.next(Optional.of(renewed), laterExpiry)).isEqualTo(laterExpiry);
        assertThat(SubscriptionState.next(Optional.of(renewed), sameMoment)).isEqualTo(sameMoment);
        assertThat(SubscriptionState.next(Optional.empty(), earlierCancel)).as("the first state").isEqualTo(earlierCancel);
    }
}
