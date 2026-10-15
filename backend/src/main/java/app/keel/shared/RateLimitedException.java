package app.keel.shared;

/** Too many requests (RATE_LIMITED, 429): the answer carries Retry-After, in whole seconds. No text, like every ApiException. */
public class RateLimitedException extends ApiException {

    private final long retryAfterSeconds;

    public RateLimitedException(long retryAfterSeconds) {
        super(ErrorCode.RATE_LIMITED);
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }

    public long retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
