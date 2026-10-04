package app.keel.subscription;

import app.keel.shared.AccountId;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * For web tests in any module: a RevenueCat webhook event, signed with the test signing secret as RevenueCat signs
 * (RevenueCatSignatureTests.sign), sent to the server — as if RevenueCat had sent it.
 */
public final class TestWebhooks {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private TestWebhooks() {
    }

    /** An event's fields as RevenueCat names them: a purchase of the configured entitlement in PRODUCTION, at {@code at}. */
    public static Map<String, Object> event(String id, String type, AccountId account, Instant at, Instant expires) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("id", id);
        event.put("type", type);
        event.put("event_timestamp_ms", at.toEpochMilli());
        event.put("app_user_id", account.value().toString());
        event.put("entitlement_ids", List.of("premium"));
        event.put("period_type", "NORMAL");
        event.put("purchased_at_ms", at.toEpochMilli());
        event.put("expiration_at_ms", expires == null ? null : expires.toEpochMilli());
        event.put("environment", "PRODUCTION");
        event.put("store", "APP_STORE");
        // What the server must not keep: a price, a country, an attribute holding personal data (ADR-012 addendum 1).
        event.put("price", 12.99);
        event.put("country_code", "TR");
        event.put("subscriber_attributes", Map.of("$email", Map.of("value", "someone@example.com")));
        return event;
    }

    /** The account subscribed, as RevenueCat would tell it: a purchase from now for 30 days (K-703's tests of what it pays for). */
    public static void subscribe(MockMvcTester mvc, ApplicationContext context, AccountId account) {
        Instant now = context.getBean(Clock.class).instant();
        MvcTestResult sent = send(mvc, context, event("evt-" + java.util.UUID.randomUUID(), "INITIAL_PURCHASE", account, now,
                now.plus(java.time.Duration.ofDays(30))));
        if (sent.getResponse().getStatus() != 200) {
            throw new IllegalStateException("subscribing failed: " + sent.getResponse().getStatus());
        }
    }

    public static MvcTestResult send(MockMvcTester mvc, ApplicationContext context, Map<String, Object> event) {
        return sendRaw(mvc, context, body(event));
    }

    /** The body as RevenueCat sends it (docs: api_version and the event). */
    static byte[] body(Map<String, Object> event) {
        return JSON.writeValueAsBytes(Map.of("api_version", "1.0", "event", event));
    }

    static MvcTestResult sendRaw(MockMvcTester mvc, ApplicationContext context, byte[] body) {
        // The server's own clock: the one it checks the signature's moment against.
        long t = context.getBean(Clock.class).instant().getEpochSecond();
        String signature = RevenueCatSignatureTests.sign(context.getBean(RevenueCatProperties.class).secret(), t, body);
        return mvc.post().uri(RevenueCatWebhook.PATH).header(WebhookSignature.HEADER, "t=" + t + ",v1=" + signature)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
    }

    static byte[] utf8(String text) {
        return text.getBytes(StandardCharsets.UTF_8);
    }
}
