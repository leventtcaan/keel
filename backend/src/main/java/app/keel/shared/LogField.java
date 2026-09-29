package app.keel.shared;

/**
 * The only fields a log line can carry (K-215, V3). None of them can hold health data: identifiers, the HTTP method,
 * the route template (never the raw path or query), a status, a duration, an error code and an exception type.
 * LogWhitelistTests turns red if a field that could carry health data is added.
 */
public enum LogField {
    REQUEST_ID("request_id"),
    METHOD("method"),
    ROUTE("route"),
    STATUS("status"),
    DURATION_MS("duration_ms"),
    ERROR_CODE("error_code"),
    EXCEPTION("exception");

    private final String key;

    LogField(String key) {
        this.key = key;
    }

    public String key() {
        return key;
    }
}
