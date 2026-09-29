package app.keel.shared;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.spi.LoggingEventBuilder;

/**
 * The one door to the log (K-215, V3). Its methods take typed values only — an id, a method, a route template, a
 * status, a duration, an error code, an exception's type — so a weight, a meal, a message or an exception's text
 * cannot be passed in. LogWhitelistTests fails any other class that logs. Each line carries its fields twice: as
 * key-values for structured output and as {@code key=value} text for a plain console. LogWhitelistTests pins the
 * fields and the parameter types of every public method.
 */
public final class SafeLog {

    private static final Logger LOG = LoggerFactory.getLogger("keel");
    // A route template: literal segments that start with a letter ("v1", "weigh-ins"), {variables} and /**. A value
    // (82.4, 2026-09-30, a UUID) starts with a digit or holds a dot, so a raw path is refused; so is any query.
    private static final Pattern ROUTE_TEMPLATE = Pattern.compile("(/([A-Za-z][A-Za-z0-9_-]*|\\{[A-Za-z][A-Za-z0-9_]*}|\\*\\*))*/?");
    // Enough of the root cause's stack to find the failing line; frames are code locations, never data.
    private static final int FRAMES = 5;
    private static final String UNREADABLE_ROUTE = "unreadable-route";
    /** What the request log writes when no route matched (a 404, or a request a filter answered). */
    public static final String UNMATCHED = "unmatched";

    private SafeLog() {
    }

    /** One line per request, when it has been answered. */
    public static void request(UUID requestId, String method, String routeTemplate, int status, long durationMs) {
        Map<LogField, Object> fields = new EnumMap<>(LogField.class);
        fields.put(LogField.REQUEST_ID, requestId);
        fields.put(LogField.METHOD, method.matches("[A-Z]+") ? method : "OTHER");
        fields.put(LogField.ROUTE, UNMATCHED.equals(routeTemplate) || ROUTE_TEMPLATE.matcher(routeTemplate).matches()
                ? routeTemplate : UNREADABLE_ROUTE);
        fields.put(LogField.STATUS, status);
        fields.put(LogField.DURATION_MS, durationMs);
        write(LOG.atInfo(), "request", fields);
    }

    /**
     * A request that failed: its code, the exception's type and its causes' types, and where the root cause was thrown
     * (class#method:line) — never a message, which may hold what the request carried (V3). Our bugs (INTERNAL) are
     * errors; the rest are warnings.
     */
    public static void failure(UUID requestId, ErrorCode code, Throwable failure) {
        Map<LogField, Object> fields = new EnumMap<>(LogField.class);
        fields.put(LogField.REQUEST_ID, requestId);
        fields.put(LogField.ERROR_CODE, code);
        List<String> chain = new ArrayList<>();
        Throwable root = failure;
        for (Throwable cause = failure; cause != null && chain.size() < FRAMES; cause = cause.getCause()) {
            chain.add(cause.getClass().getName());
            root = cause;
        }
        fields.put(LogField.EXCEPTION, String.join("<-", chain));
        fields.put(LogField.AT, Arrays.stream(root.getStackTrace()).limit(FRAMES)
                .map(frame -> frame.getClassName() + "#" + frame.getMethodName() + ":" + frame.getLineNumber())
                .collect(Collectors.joining(",")));
        write(code == ErrorCode.INTERNAL ? LOG.atError() : LOG.atWarn(), "failure", fields);
    }

    private static void write(LoggingEventBuilder line, String event, Map<LogField, Object> fields) {
        fields.forEach((field, value) -> line.addKeyValue(field.key(), value));
        line.log(event + " " + fields.entrySet().stream()
                .map(entry -> entry.getKey().key() + "=" + entry.getValue())
                .collect(Collectors.joining(" ")));
    }
}
