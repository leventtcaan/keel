package app.keel.coach;

/**
 * The provider did not answer in a way the coach can use (down, over its rate limit, a key it refuses): no reply, and the coach
 * says what the engine wrote (ADR-092 #4). The message names no body of the provider's: it may hold what was sent (V3).
 */
final class ModelUnavailable extends RuntimeException {

    ModelUnavailable(String reason) {
        super(reason);
    }

    ModelUnavailable(String reason, Throwable cause) {
        super(reason, cause);
    }
}
