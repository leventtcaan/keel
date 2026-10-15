package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.subscription.SubscriptionState.Status;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * RevenueCat's GET /v1/subscribers answer as the state it says (K-704, ADR-056 Ek 3). Shapes follow the docs' customer info model
 * (https://www.revenuecat.com/docs/api-v1/customer-info-model): {@code request_date_ms}, {@code subscriber.entitlements.<id>}
 * ({@code expires_date}, {@code grace_period_expires_date}, {@code product_identifier}) and {@code subscriber.subscriptions.<product>}
 * ({@code period_type}, {@code unsubscribe_detected_at}, {@code billing_issues_detected_at}, {@code refunded_at}, {@code is_sandbox}).
 * The answer's moment is {@code request_date_ms}: on RevenueCat's clock, as the webhook's {@code event_timestamp_ms} is.
 */
class RevenueCatSubscriberTests {

    private static final Instant NOW = Instant.parse("2026-10-15T10:00:00Z");
    private static final Instant MONTH = NOW.plus(Duration.ofDays(30));
    private static final Set<String> BOTH = Set.of("PRODUCTION", "SANDBOX");

    /** An answer with one entitlement "premium" backed by product "keel.month"; {@code subscription} is that product's entry. */
    private static String answer(String entitlementFields, String subscriptionFields) {
        return """
                {"request_date": "2026-10-15T10:00:00Z", "request_date_ms": %d,
                 "subscriber": {"entitlements": {"premium": {%s, "product_identifier": "keel.month", "purchase_date": "2026-09-15T10:00:00Z"}},
                  "subscriptions": {"keel.month": {%s, "store": "app_store", "ownership_type": "PURCHASED"}},
                  "first_seen": "2026-09-15T10:00:00Z", "original_app_user_id": "x"}}
                """.formatted(NOW.toEpochMilli(), entitlementFields, subscriptionFields);
    }

    private static String entitlement(Instant expires) {
        return "\"expires_date\": \"" + expires + "\", \"grace_period_expires_date\": null";
    }

    private static String plain(String period, boolean sandbox) {
        return "\"period_type\": \"" + period + "\", \"is_sandbox\": " + sandbox + ", \"unsubscribe_detected_at\": null, "
                + "\"billing_issues_detected_at\": null, \"refunded_at\": null, \"expires_date\": \"" + MONTH + "\"";
    }

    private static Optional<SubscriptionState> read(String json) {
        return RevenueCatSubscriber.read(json, "premium", BOTH);
    }

    @Test
    void anEntitlementThatEndsInTheFutureIsAccessUntilItsEndAtTheMomentOfTheAnswer() {
        assertThat(read(answer(entitlement(MONTH), plain("normal", false)))).contains(new SubscriptionState(Status.ACTIVE, MONTH, NOW));
    }

    @Test
    void aTrialIsATrial() {
        assertThat(read(answer(entitlement(MONTH), plain("trial", false)))).hasValueSatisfying(state -> assertThat(state.status()).isEqualTo(Status.TRIAL));
    }

    @Test
    void aCancellationRevenueCatHasSeenKeepsAccessToTheEndAsCancelled() {
        String cancelled = plain("normal", false).replace("\"unsubscribe_detected_at\": null", "\"unsubscribe_detected_at\": \"2026-10-01T10:00:00Z\"");

        assertThat(read(answer(entitlement(MONTH), cancelled))).contains(new SubscriptionState(Status.CANCELLED, MONTH, NOW));
    }

    @Test
    void aBillingIssueWithAGraceKeepsAccessToTheGraceEnd() {
        Instant grace = MONTH.plus(Duration.ofDays(6));
        String entitlement = "\"expires_date\": \"" + MONTH + "\", \"grace_period_expires_date\": \"" + grace + "\"";
        String issue = plain("normal", false).replace("\"billing_issues_detected_at\": null", "\"billing_issues_detected_at\": \"2026-10-14T10:00:00Z\"");

        assertThat(read(answer(entitlement, issue))).contains(new SubscriptionState(Status.BILLING_ISSUE, grace, NOW));
    }

    @Test
    void aRefundEndsAccessAtTheRefund() {
        Instant refunded = NOW.minus(Duration.ofHours(1));
        String refund = plain("normal", false).replace("\"refunded_at\": null", "\"refunded_at\": \"" + refunded + "\"");

        assertThat(read(answer(entitlement(MONTH), refund))).contains(new SubscriptionState(Status.REFUNDED, refunded, NOW));
    }

    @Test
    void anEntitlementThatHasEndedIsExpiredAndAccessEndedWithIt() {
        Instant ended = NOW.minus(Duration.ofDays(2));

        Optional<SubscriptionState> state = read(answer(entitlement(ended), plain("normal", false)));

        assertThat(state).contains(new SubscriptionState(Status.EXPIRED, ended, NOW));
        assertThat(state.orElseThrow().active(NOW)).isFalse();
    }

    @Test
    void whatTheAnswerDoesNotSayChangesNothing() {
        String noPremium = answer(entitlement(MONTH), plain("normal", false)).replace("\"premium\"", "\"other\"");
        String noEnd = answer("\"expires_date\": null, \"grace_period_expires_date\": null", plain("normal", false));
        String noEntitlements = "{\"request_date_ms\": " + NOW.toEpochMilli() + ", \"subscriber\": {\"entitlements\": {}, \"subscriptions\": {}}}";

        assertThat(read(noPremium)).as("another entitlement").isEmpty();
        assertThat(read(noEnd)).as("no end: no lifetime product is sold (ADR-012), nothing to keep").isEmpty();
        assertThat(read(noEntitlements)).as("a customer RevenueCat just made for the ask").isEmpty();
    }

    @Test
    void aStoreEnvironmentThatDoesNotCountIsKeptOutAsItIsForWebhooks() {
        String sandbox = answer(entitlement(MONTH), plain("normal", true));

        assertThat(RevenueCatSubscriber.read(sandbox, "premium", Set.of("PRODUCTION"))).isEmpty();
        assertThat(RevenueCatSubscriber.read(sandbox, "premium", BOTH)).isPresent();
        assertThat(RevenueCatSubscriber.read(answer(entitlement(MONTH), plain("normal", false)), "premium", Set.of("PRODUCTION"))).isPresent();
    }

    @Test
    void aProductTheAnswerDoesNotListHasNoKnownEnvironmentAndCountsForNothing() {
        String unlisted = answer(entitlement(MONTH), plain("normal", false)).replace("\"keel.month\": {", "\"keel.other\": {");

        assertThat(read(unlisted)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "not json", "[]", "{}", "{\"request_date_ms\": 1}", "{\"subscriber\": {}}", "{\"request_date_ms\": \"soon\", \"subscriber\": {}}"})
    void anAnswerThatIsNotRevenueCatsOrHasNoMomentIsAnErrorNotAGuess(String json) {
        assertThatThrownBy(() -> read(json)).isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo(ErrorCode.SERVICE_UNAVAILABLE));
    }

    @Test
    void aDateThatIsNotADateIsAnErrorToo() {
        assertThatThrownBy(() -> read(answer("\"expires_date\": \"someday\", \"grace_period_expires_date\": null", plain("normal", false))))
                .isInstanceOf(ApiException.class);
    }

    // ---- The order: the answer's moment against the state's (SubscriptionState.next), whatever came first. ----

    private static final SubscriptionState REST = new SubscriptionState(Status.ACTIVE, MONTH, NOW);

    @Test
    void anAnswerOlderThanTheStateNeverTakesItBack() {
        SubscriptionState later = new SubscriptionState(Status.REFUNDED, NOW.plusSeconds(5), NOW.plusSeconds(5)); // a refund event after the ask

        assertThat(SubscriptionState.next(Optional.of(later), REST)).isEqualTo(later);
    }

    @Test
    void anAnswerNewerThanTheStateReplacesIt() {
        SubscriptionState earlier = new SubscriptionState(Status.ACTIVE, NOW.plusSeconds(60), NOW.minusSeconds(5));

        assertThat(SubscriptionState.next(Optional.of(earlier), REST)).isEqualTo(REST);
    }

    @Test
    void twoAnswersInEitherOrderLeaveTheNewerOne() {
        SubscriptionState first = new SubscriptionState(Status.ACTIVE, MONTH, NOW.minusSeconds(30));

        assertThat(SubscriptionState.next(Optional.of(first), REST)).isEqualTo(REST);
        assertThat(SubscriptionState.next(Optional.of(REST), first)).isEqualTo(REST);
    }

    @Test
    void anAnswerWithNoStateBeforeItIsTheFirstState() {
        assertThat(SubscriptionState.next(Optional.empty(), REST)).isEqualTo(REST);
    }
}
