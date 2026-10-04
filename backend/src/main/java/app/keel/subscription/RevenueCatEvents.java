package app.keel.subscription;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * A webhook body as the server reads it (ADR-056; docs: {@code {"api_version": "1.0", "event": {...}}}): only the fields the
 * state needs. Without an event id, type and moment it is no event (VALIDATION_FAILED, and RevenueCat sends it again); any
 * other field may be missing — the event then says less.
 */
final class RevenueCatEvents {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private RevenueCatEvents() {
    }

    static SubscriptionEvent read(byte[] body) {
        Map<?, ?> event;
        try {
            if (!(JSON.readValue(body, Object.class) instanceof Map<?, ?> sent) || !(sent.get("event") instanceof Map<?, ?> inside)) {
                throw new ApiException(ErrorCode.VALIDATION_FAILED);
            }
            event = inside;
        } catch (JacksonException notJson) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        String id = text(event, "id");
        String type = text(event, "type");
        Instant at = moment(event, "event_timestamp_ms");
        if (id == null || id.isBlank() || type == null || at == null) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        return new SubscriptionEvent(id, type, at, text(event, "app_user_id"), texts(event, "entitlement_ids"), text(event, "period_type"),
                moment(event, "expiration_at_ms"), moment(event, "grace_period_expiration_at_ms"), text(event, "cancel_reason"),
                text(event, "expiration_reason"), text(event, "environment"), texts(event, "transferred_from"));
    }

    private static String text(Map<?, ?> event, String key) {
        return event.get(key) instanceof String value ? value : null;
    }

    private static Instant moment(Map<?, ?> event, String key) {
        return event.get(key) instanceof Number millis && (millis instanceof Long || millis instanceof Integer) ? Instant.ofEpochMilli(millis.longValue()) : null;
    }

    private static List<String> texts(Map<?, ?> event, String key) {
        if (!(event.get(key) instanceof List<?> values)) {
            return null;
        }
        return values.stream().filter(String.class::isInstance).map(String.class::cast).toList();
    }
}
