package app.keel.subscription;

import java.time.Instant;
import java.util.List;

/**
 * A RevenueCat webhook event as the server reads it (ADR-056): only what the state needs — no price, country or
 * subscriber attribute is read. Every field but the first three may be absent (null).
 */
record SubscriptionEvent(String id, String type, Instant at, String appUserId, List<String> entitlementIds, String periodType,
        Instant expiresAt, Instant graceUntil, String cancelReason, String expirationReason, String environment,
        List<String> transferredFrom) {
}
