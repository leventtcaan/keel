package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * A webhook body read (ADR-056; docs: event types and fields, sample events): each field the state needs from its own key —
 * a key misread would, say, end access at the period's end instead of the grace period's — and nothing else.
 */
class RevenueCatEventsTests {

    private static SubscriptionEvent read(String json) {
        return RevenueCatEvents.read(json.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void everyFieldComesFromItsOwnKey() {
        SubscriptionEvent event = read("""
                {"api_version": "1.0", "event": {
                  "id": "evt-1", "type": "BILLING_ISSUE", "event_timestamp_ms": 1759579200000,
                  "app_user_id": "0f8fad5b-d9cb-469f-a165-70867728950e", "original_app_user_id": "$RCAnonymousID:x",
                  "aliases": ["$RCAnonymousID:x"], "entitlement_ids": ["premium", "other"], "entitlement_id": "deprecated",
                  "period_type": "TRIAL", "purchased_at_ms": 1759000000000, "expiration_at_ms": 1759600000000,
                  "grace_period_expiration_at_ms": 1760900000000, "cancel_reason": "BILLING_ERROR", "expiration_reason": "SUBSCRIPTION_PAUSED",
                  "environment": "SANDBOX", "store": "APP_STORE", "transferred_from": ["a", 7, null, "b"], "transferred_to": ["c"],
                  "price": 12.99, "country_code": "TR", "subscriber_attributes": {"$email": {"value": "someone@example.com"}}
                }}""");

        assertThat(event).isEqualTo(new SubscriptionEvent("evt-1", "BILLING_ISSUE", Instant.ofEpochMilli(1759579200000L),
                "0f8fad5b-d9cb-469f-a165-70867728950e", List.of("premium", "other"), "TRIAL", Instant.ofEpochMilli(1759600000000L),
                Instant.ofEpochMilli(1760900000000L), "BILLING_ERROR", "SUBSCRIPTION_PAUSED", "SANDBOX", List.of("a", "b")));
    }

    @Test
    void aFieldThatIsMissingOrNotItsKindIsNone() {
        SubscriptionEvent event = read("""
                {"event": {"id": "evt-2", "type": "TRANSFER", "event_timestamp_ms": 1759579200000,
                  "app_user_id": 42, "entitlement_ids": null, "expiration_at_ms": "later", "grace_period_expiration_at_ms": 1.5}}""");

        assertThat(event).isEqualTo(new SubscriptionEvent("evt-2", "TRANSFER", Instant.ofEpochMilli(1759579200000L), null, null, null,
                null, null, null, null, null, null));
    }

    @Test
    void withoutAnIdATypeAndAWholeMomentItIsNoEvent() {
        for (String body : new String[] {
                "{\"event\":{\"id\":\" \",\"type\":\"RENEWAL\",\"event_timestamp_ms\":1}}",
                "{\"event\":{\"id\":\"e\",\"type\":\"RENEWAL\",\"event_timestamp_ms\":1.5}}",
                "{\"event\":{\"id\":7,\"type\":\"RENEWAL\",\"event_timestamp_ms\":1}}",
                "{\"event\":[]}", "{\"event\":null}", "null", "\"text\"", "{"}) {
            assertThatThrownBy(() -> read(body)).as(body).isInstanceOfSatisfying(ApiException.class,
                    refused -> assertThat(refused.code()).isEqualTo(ErrorCode.VALIDATION_FAILED));
        }
    }
}
