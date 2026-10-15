package app.keel.subscription;

import java.time.Instant;

/** A GET /v1/subscribers answer as RevenueCat's docs shape it (customer info model), for tests in this module. */
final class RevenueCatAnswers {

    private RevenueCatAnswers() {
    }

    /** The customer holds the configured entitlement "premium" until {@code expires}, as asked at {@code requestedAt}. */
    static String entitled(Instant requestedAt, Instant expires) {
        return """
                {"request_date": "%s", "request_date_ms": %d,
                 "subscriber": {"entitlements": {"premium": {"expires_date": "%s", "grace_period_expires_date": null,
                   "product_identifier": "keel.month", "purchase_date": "2026-09-15T10:00:00Z"}},
                  "subscriptions": {"keel.month": {"period_type": "normal", "is_sandbox": false, "store": "app_store",
                   "expires_date": "%s", "unsubscribe_detected_at": null, "billing_issues_detected_at": null, "refunded_at": null}},
                  "first_seen": "2026-09-15T10:00:00Z"}}
                """.formatted(requestedAt, requestedAt.toEpochMilli(), expires, expires);
    }
}
