package app.keel.shared;

import java.util.Objects;

/**
 * An error a module answers on purpose: only a code, no free text (K-215, V3). The code's fixed message is what the
 * user sees; the log gets the code and the exception type, never a message.
 */
public class ApiException extends RuntimeException {

    private final ErrorCode code;

    public ApiException(ErrorCode code) {
        super(Objects.requireNonNull(code, "code").name(), null, false, false);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
