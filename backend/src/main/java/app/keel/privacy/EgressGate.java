package app.keel.privacy;

import app.keel.consent.ConsentGate;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * The one door out (K-214, V2): every call that carries a user's data to someone else runs through here, and only
 * this module may make an outbound call (EgressRuleTests). Data for a third-party AI needs the consent that names the
 * provider and the data, checked at the moment of sending; without it the call does not run.
 */
@Service
public class EgressGate {

    public enum Destination {
        /** A language model (M5): only with the THIRD_PARTY_AI consent (Apple 5.1.2(i)). */
        THIRD_PARTY_AI,
        /** Account housekeeping with Apple (revoking Sign in with Apple tokens on deletion): no health data. */
        APPLE_ACCOUNT
    }

    /** What the other side answered: its status and its body, as text. */
    public record Answer(int status, String body) {

        public boolean ok() {
            return status >= 200 && status < 300;
        }
    }

    private final ConsentGate consents;
    private final Duration timeout;
    private final HttpClient http;

    EgressGate(ConsentGate consents, PrivacyProperties properties) {
        this.consents = consents;
        this.timeout = properties.egressTimeout();
        this.http = HttpClient.newBuilder().connectTimeout(timeout).followRedirects(HttpClient.Redirect.NEVER).build();
    }

    /**
     * A form posted to {@code destination} (K-812: Apple's REST API), answered whatever its status; no answer at all is
     * SERVICE_UNAVAILABLE. The form is not logged: it carries credentials.
     */
    public Answer postForm(Destination destination, URI uri, Map<String, String> form) {
        if (destination == Destination.THIRD_PARTY_AI) {
            throw new IllegalArgumentException("a call to an AI names its provider: sendToAi");
        }
        String body = form.entrySet().stream().map(field -> encode(field.getKey()) + "=" + encode(field.getValue()))
                .collect(Collectors.joining("&"));
        HttpRequest request = HttpRequest.newBuilder(uri).timeout(timeout).header("Content-Type", "application/x-www-form-urlencoded")
                .header("Accept", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build();
        try {
            HttpResponse<String> answer = http.send(request, HttpResponse.BodyHandlers.ofString());
            return new Answer(answer.statusCode(), answer.body());
        } catch (IOException unreachable) {
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE, unreachable);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE, interrupted);
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    /** A call that carries no data for an AI. The AI goes through {@link #sendToAi}, which names the provider. */
    public <T> T send(AccountId account, Destination destination, Supplier<T> call) {
        if (destination == Destination.THIRD_PARTY_AI) {
            throw new IllegalArgumentException("a call to an AI names its provider: sendToAi");
        }
        return call.get();
    }

    /**
     * Data for a third-party AI (V2, K-503, K-505): only to {@code provider}, only {@code dataType}, and only with the
     * consent that names both, checked at the moment of sending; without it the call does not run.
     */
    /** Whether {@link #sendToAi} would send this now: asked before anything is counted for the call (K-508). */
    public boolean allowsAi(AccountId account, String provider, String dataType) {
        return consents.grantedAi(account, provider, dataType);
    }

    public <T> T sendToAi(AccountId account, String provider, String dataType, Supplier<T> call) {
        consents.requireAi(account, provider, dataType);
        return call.get();
    }
}
