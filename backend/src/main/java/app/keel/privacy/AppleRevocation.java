package app.keel.privacy;

import app.keel.identity.AppleAccounts;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.util.Map;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Ending Sign in with Apple for a person whose account is being deleted (K-812, ADR-062; Apple: "Apps that support Sign
 * in with Apple should use the Sign in with Apple REST API to revoke user tokens"). The phone has just asked Apple for a
 * fresh authorization code; it is traded at /auth/token for tokens, the identity token must be Apple's and this
 * account's, and the refresh token is revoked at /auth/revoke. Nothing of Apple's is kept, nothing of it logged.
 */
@Service
class AppleRevocation {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final AppleAccounts apple;
    private final EgressGate egress;

    AppleRevocation(AppleAccounts apple, EgressGate egress) {
        this.apple = apple;
        this.egress = egress;
    }

    void revoke(AccountId account, String authorizationCode) {
        if (!apple.revocationConfigured()) {
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE);
        }
        EgressGate.Answer tokens = egress.postForm(EgressGate.Destination.APPLE_ACCOUNT, apple.endpoint("/auth/token"), Map.of(
                "client_id", apple.clientId(), "client_secret", apple.clientSecret(), "code", authorizationCode, "grant_type", "authorization_code"));
        // Apple answers 400 to a code that is not good (used, old, someone else's app): the request's fault, not Apple's.
        answered(tokens);
        JsonNode body = json(tokens.body());
        String refreshToken = text(body, "refresh_token");
        String subject = apple.subjectOf(text(body, "id_token"));
        if (!apple.subjectOf(account).map(subject::equals).orElse(false)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED); // a code for someone else: their sign-in is not ours to end
        }
        answered(egress.postForm(EgressGate.Destination.APPLE_ACCOUNT, apple.endpoint("/auth/revoke"), Map.of(
                "client_id", apple.clientId(), "client_secret", apple.clientSecret(), "token", refreshToken, "token_type_hint", "refresh_token")));
    }

    private static void answered(EgressGate.Answer answer) {
        if (answer.status() == 400) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        if (!answer.ok()) {
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE);
        }
    }

    private static JsonNode json(String body) {
        try {
            return JSON.readTree(body);
        } catch (JacksonException unreadable) {
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE); // not the answer Apple documents; its content not kept
        }
    }

    private static String text(JsonNode body, String field) {
        JsonNode value = body.get(field);
        if (value == null || !value.isString() || value.asString().isBlank()) {
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE);
        }
        return value.asString();
    }
}
