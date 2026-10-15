package app.keel.subscription;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.subscription.SubscriptionState.Status;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Optional;
import java.util.Set;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.MissingNode;

/**
 * RevenueCat's GET /v1/subscribers/{app_user_id} answer as the state it says (K-704, ADR-056 Ek 3; docs: customer info model,
 * https://www.revenuecat.com/docs/api-v1/customer-info-model). Only what the state needs is read: the answer's own moment
 * ({@code request_date_ms}, RevenueCat's clock, as a webhook's {@code event_timestamp_ms} is), the configured entitlement's end
 * ({@code expires_date}, {@code grace_period_expires_date}) and, from the subscription behind it, what kind of state it is.
 * No price, country or attribute is read.
 *
 * <p>The answer says something only when the entitlement is there with an end and its store environment counts (as a webhook's
 * does, ADR-056 #4); otherwise none, and the state is left as it is — an entitlement that is missing never takes access away
 * (a wrong entitlement name would otherwise end everyone's). An answer that is not RevenueCat's, or has no moment, is an error:
 * its place in the order is unknown, and it is not guessed.
 */
final class RevenueCatSubscriber {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private RevenueCatSubscriber() {
    }

    static Optional<SubscriptionState> read(String json, String entitlement, Set<String> environments) {
        JsonNode answer = tree(json);
        JsonNode moment = answer.path("request_date_ms");
        JsonNode subscriber = answer.path("subscriber");
        if (!answer.isObject() || !subscriber.isObject() || !moment.isIntegralNumber()) {
            throw notRevenueCats(null);
        }
        Instant at = Instant.ofEpochMilli(moment.asLong());
        JsonNode granted = subscriber.path("entitlements").path(entitlement);
        Instant expires = granted.isObject() ? date(granted, "expires_date") : null;
        if (expires == null) {
            return Optional.empty();
        }
        Instant grace = date(granted, "grace_period_expires_date");
        JsonNode product = granted.path("product_identifier");
        JsonNode subscription = product.isString() ? subscriber.path("subscriptions").path(product.asString()) : subscriber.path("none");
        // The environment is the subscription's (is_sandbox); without it the entitlement is as a webhook without one: not counted.
        if (!subscription.isObject() || !subscription.path("is_sandbox").isBoolean()
                || !environments.contains(subscription.path("is_sandbox").asBoolean() ? "SANDBOX" : "PRODUCTION")) {
            return Optional.empty();
        }
        Instant until = grace != null && grace.isAfter(expires) ? grace : expires;
        Instant refunded = date(subscription, "refunded_at");
        if (refunded != null) {
            return Optional.of(new SubscriptionState(Status.REFUNDED, refunded, at));
        }
        return Optional.of(new SubscriptionState(status(subscription, until, at), until, at));
    }

    private static Status status(JsonNode subscription, Instant until, Instant at) {
        if (!until.isAfter(at)) {
            return Status.EXPIRED;
        }
        if (date(subscription, "billing_issues_detected_at") != null) {
            return Status.BILLING_ISSUE;
        }
        if (date(subscription, "unsubscribe_detected_at") != null) {
            return Status.CANCELLED;
        }
        return "trial".equalsIgnoreCase(subscription.path("period_type").asString("")) ? Status.TRIAL : Status.ACTIVE;
    }

    private static JsonNode tree(String json) {
        try {
            JsonNode answer = JSON.readTree(json);
            return answer == null ? MissingNode.getInstance() : answer;
        } catch (JacksonException unreadable) {
            throw notRevenueCats(unreadable);
        }
    }

    /** An ISO 8601 date (docs: "2019-07-26T17:40:10Z"); none when null or absent; an error when it is anything else. */
    private static Instant date(JsonNode in, String field) {
        JsonNode value = in.path(field);
        if (value.isNull() || value.isMissingNode()) {
            return null;
        }
        try {
            if (value.isString()) {
                return Instant.parse(value.asString());
            }
        } catch (DateTimeParseException notADate) {
            throw notRevenueCats(notADate);
        }
        throw notRevenueCats(null);
    }

    private static ApiException notRevenueCats(Throwable cause) {
        return new ApiException(ErrorCode.SERVICE_UNAVAILABLE, cause); // not the answer the docs describe; its content is not logged
    }
}
