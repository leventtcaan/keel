package app.keel.subscription;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.time.Clock;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * POST /webhooks/revenuecat (K-701, ADR-056 #1-2): RevenueCat's word that a subscription changed. Not the app's API (no
 * session, not in the contract): the signature over the raw body is the only proof of who sent it, so nothing is read before
 * it is checked — an unsigned, changed or late request is 401 and changes nothing (RevenueCat sends it again). Read up to the
 * longest an event can be and no further (413). 200 once the event is weighed, whether it changed anything or not.
 */
@RestController
class RevenueCatWebhook {

    static final String PATH = "/webhooks/revenuecat";

    private final Subscriptions subscriptions;
    private final RevenueCatProperties properties;
    private final Clock clock;

    RevenueCatWebhook(Subscriptions subscriptions, RevenueCatProperties properties, Clock clock) {
        this.subscriptions = subscriptions;
        this.properties = properties;
        this.clock = clock;
    }

    @PostMapping(PATH)
    ResponseEntity<Void> receive(HttpServletRequest request) throws IOException {
        int limit = properties.maxBodyBytes();
        if (request.getContentLengthLong() > limit) {
            throw new ApiException(ErrorCode.PAYLOAD_TOO_LARGE);
        }
        byte[] body = request.getInputStream().readNBytes(limit + 1);
        if (body.length > limit) {
            throw new ApiException(ErrorCode.PAYLOAD_TOO_LARGE);
        }
        if (!WebhookSignature.verify(request.getHeader(WebhookSignature.HEADER), body, properties.secret(), clock.instant(),
                properties.signatureTolerance())) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        subscriptions.receive(RevenueCatEvents.read(body));
        return ResponseEntity.ok().build();
    }
}
