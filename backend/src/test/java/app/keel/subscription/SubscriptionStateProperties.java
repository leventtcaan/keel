package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * The state machine over any events (ADR-056 #5, #7): RevenueCat may send an event twice and does not promise an order.
 * The state the server keeps must not depend on either — the same event twice is the event once, and events at
 * different moments, arriving in any order, leave the state of the latest.
 */
class SubscriptionStateProperties {

    private static final String PREMIUM = SubscriptionStateTests.PREMIUM;
    private static final Instant BASE = Instant.parse("2026-01-01T00:00:00Z");
    private static final List<String> TYPES = List.of("INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "SUBSCRIPTION_EXTENDED",
            "REFUND_REVERSED", "TEMPORARY_ENTITLEMENT_GRANT", "NON_RENEWING_PURCHASE", "CANCELLATION", "BILLING_ISSUE",
            "SUBSCRIPTION_PAUSED", "EXPIRATION", "TEST", "PRODUCT_CHANGE", "TRANSFER");

    @Provide
    Arbitrary<SubscriptionEvent> events() {
        Arbitrary<String> type = Arbitraries.of(TYPES);
        Arbitrary<Long> atSeconds = Arbitraries.longs().between(0, 400L * 86_400);
        Arbitrary<Long> lengthSeconds = Arbitraries.longs().between(-86_400, 400L * 86_400).injectNull(0.1);
        Arbitrary<String> period = Arbitraries.of("TRIAL", "INTRO", "NORMAL", "PROMOTIONAL", "PREPAID");
        Arbitrary<String> reason = Arbitraries.of("UNSUBSCRIBE", "BILLING_ERROR", "DEVELOPER_INITIATED", "PRICE_INCREASE",
                "CUSTOMER_SUPPORT", "UNKNOWN", "SUBSCRIPTION_PAUSED").injectNull(0.2);
        Arbitrary<List<String>> entitlements = Arbitraries.of(List.of(PREMIUM), List.of("other"), List.of("other", PREMIUM)).injectNull(0.1);
        Arbitrary<Long> graceSeconds = Arbitraries.longs().between(0, 30L * 86_400).injectNull(0.5);
        return Combinators.combine(type, atSeconds, lengthSeconds, period, reason, entitlements, graceSeconds).as((t, at, length, p, r, e, g) -> {
            Instant when = BASE.plusSeconds(at);
            Instant expires = length == null ? null : when.plusSeconds(length);
            Instant grace = g == null || expires == null ? null : expires.plusSeconds(g);
            return new SubscriptionEvent("e-" + t + "-" + at, t, when, "user", e, p, expires, grace, r, r, "PRODUCTION", null);
        });
    }

    @Provide
    Arbitrary<List<SubscriptionEvent>> histories() {
        return events().list().ofMaxSize(12);
    }

    private static Optional<SubscriptionState> apply(Optional<SubscriptionState> current, SubscriptionEvent event) {
        return SubscriptionState.of(event, PREMIUM).map(implied -> SubscriptionState.next(current, implied)).or(() -> current);
    }

    private static Optional<SubscriptionState> fold(List<SubscriptionEvent> events) {
        Optional<SubscriptionState> state = Optional.empty();
        for (SubscriptionEvent event : events) {
            state = apply(state, event);
        }
        return state;
    }

    @Property
    void theSameEventTwiceIsTheEventOnce(@ForAll("histories") List<SubscriptionEvent> before, @ForAll("events") SubscriptionEvent event) {
        Optional<SubscriptionState> once = apply(fold(before), event);

        assertThat(apply(once, event)).isEqualTo(once);
    }

    @Property
    void eventsAtDifferentMomentsLeaveTheSameStateInAnyOrder(@ForAll("histories") List<SubscriptionEvent> events, @ForAll long seed) {
        List<SubscriptionEvent> distinct = events.stream().filter(e -> events.stream().filter(o -> o.at().equals(e.at())).count() == 1).toList();
        List<SubscriptionEvent> inOrder = new ArrayList<>(distinct);
        inOrder.sort(Comparator.comparing(SubscriptionEvent::at));
        List<SubscriptionEvent> shuffled = new ArrayList<>(distinct);
        Collections.shuffle(shuffled, new Random(seed));

        assertThat(fold(shuffled)).isEqualTo(fold(inOrder));
    }

    @Property
    void theStateIsTheLatestEventThatSaysAnything(@ForAll("histories") List<SubscriptionEvent> events) {
        Optional<SubscriptionState> state = fold(events);
        Optional<Instant> latest = events.stream().filter(e -> SubscriptionState.of(e, PREMIUM).isPresent()).map(SubscriptionEvent::at)
                .max(Comparator.naturalOrder());

        assertThat(state.map(SubscriptionState::lastEventAt)).isEqualTo(latest);
    }

    @Property
    void aRefundOrAnExpirationNeverLeavesAccessPastItsMoment(@ForAll("events") SubscriptionEvent event) {
        boolean ends = "EXPIRATION".equals(event.type()) || "CANCELLATION".equals(event.type()) && "CUSTOMER_SUPPORT".equals(event.cancelReason());

        SubscriptionState.of(event, PREMIUM).filter(state -> ends).ifPresent(state -> assertThat(state.active(event.at())).isFalse());
    }
}
