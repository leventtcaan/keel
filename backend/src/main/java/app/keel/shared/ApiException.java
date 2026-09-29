package app.keel.shared;

import java.util.Objects;

/**
 * An error a module answers on purpose: only a code, no free text (K-215, V3). The code's fixed message is what the
 * user sees; the log gets the code, the exception type and where it was thrown, never a message.
 */
public class ApiException extends RuntimeException {

    private final ErrorCode code;

    public ApiException(ErrorCode code) {
        this(code, null);
    }

    /** With the failure behind it (e.g. a service we depend on), for the log: SafeLog writes its type and location. */
    public ApiException(ErrorCode code, Throwable cause) {
        super(Objects.requireNonNull(code, "code").name(), cause);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
