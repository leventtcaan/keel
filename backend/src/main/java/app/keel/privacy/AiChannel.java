package app.keel.privacy;

import java.net.URI;
import java.time.Duration;
import java.util.Map;

/**
 * One way out to a third-party AI, bound to an account, a provider and a kind of data by {@link EgressGate#aiChannel}: the
 * only way a language model's adapter reaches the network (V2, EgressRuleTests). Every post asks the AI consent again.
 */
@FunctionalInterface
public interface AiChannel {

    /**
     * A JSON body posted, answered whatever its status; no answer in time is SERVICE_UNAVAILABLE, no consent CONSENT_REQUIRED.
     * The headers are credentials: not logged, and a redirect is never followed.
     */
    AiResponse post(URI uri, Map<String, String> headers, String json, Duration timeout);
}
