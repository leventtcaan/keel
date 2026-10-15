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
 * longest an event can be and no further (413). 200 once the event is weighed, whether it changed anything or not — and, for an
 * event about an account's entitlement, once its REST refresh has been tried (RevenueCatRefresh; its failure changes nothing).
 */
@RestController
class RevenueCatWebhook {

    static final String PATH = "/webhooks/revenuecat";

    private final Subscriptions subscriptions;
    private final RevenueCatProperties properties;
    private final Clock clock;
    private final RevenueCatRefresh refresh;

    RevenueCatWebhook(Subscriptions subscriptions, RevenueCatProperties properties, Clock clock, RevenueCatRefresh refresh) {
        this.subscriptions = subscriptions;
        this.properties = properties;
        this.clock = clock;
        this.refresh = refresh;
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
        // The event is applied and committed first; only then RevenueCat's REST API is asked (K-704), outside any transaction.
        subscriptions.receive(RevenueCatEvents.read(body), RevenueCatEvents.transferredTo(body)).forEach(refresh::refresh);
        return ResponseEntity.ok().build();
    }
}
