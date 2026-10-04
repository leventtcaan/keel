package app.keel.shared;

/**
 * Every error the API answers (contract `Error.code`, ADR-024), with its HTTP status and one fixed English message
 * (K-215). The message is the code's, never an exception's: nothing a request carried — a weight, a meal — can end
 * up in an error body (V3).
 */
public enum ErrorCode {
    VALIDATION_FAILED(400, "Something in the request isn't valid."),
    UNAUTHENTICATED(401, "Please sign in again."),
    CONSENT_REQUIRED(403, "This needs your consent first."),
    ENTITLEMENT_REQUIRED(403, "This is part of the subscription."),
    FORBIDDEN(403, "That isn't available to this account."),
    NOT_FOUND(404, "We couldn't find that."),
    METHOD_NOT_ALLOWED(405, "That action isn't supported here."),
    NOT_ACCEPTABLE(406, "That format isn't available."),
    CONFLICT(409, "That conflicts with what's already stored."),
    PAYLOAD_TOO_LARGE(413, "That's more than we can take in one request."),
    UNSUPPORTED_MEDIA_TYPE(415, "That format isn't supported."),
    RATE_LIMITED(429, "Too many requests. Try again in a moment."),
    INTERNAL(500, "Something went wrong on our side."),
    SERVICE_UNAVAILABLE(503, "We're briefly unavailable. Try again in a moment.");

    private final int status;
    private final String message;

    ErrorCode(int status, String message) {
        this.status = status;
        this.message = message;
    }

    public int status() {
        return status;
    }

    public String message() {
        return message;
    }

    /** The code for an HTTP status Spring or the servlet container answered with; unknown 4xx are validation, 5xx ours. */
    public static ErrorCode forStatus(int status) {
        for (ErrorCode code : values()) {
            if (code.status == status && code != CONSENT_REQUIRED) {
                return code;
            }
        }
        return status >= 400 && status < 500 ? VALIDATION_FAILED : INTERNAL;
    }
}
