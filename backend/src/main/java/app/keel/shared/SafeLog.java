package app.keel.shared;

import java.util.EnumMap;
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
 * key-values for structured output and as {@code key=value} text for a plain console.
 */
public final class SafeLog {

    private static final Logger LOG = LoggerFactory.getLogger("keel");
    // A route template: path segments and {variables}, no query. Anything else is replaced, never logged.
    private static final Pattern ROUTE_TEMPLATE = Pattern.compile("/[A-Za-z0-9/{}_*.\\-]*");
    private static final String UNREADABLE_ROUTE = "unreadable-route";

    private SafeLog() {
    }

    /** One line per request, when it has been answered. */
    public static void request(UUID requestId, String method, String routeTemplate, int status, long durationMs) {
        Map<LogField, Object> fields = new EnumMap<>(LogField.class);
        fields.put(LogField.REQUEST_ID, requestId);
        fields.put(LogField.METHOD, method.matches("[A-Z]+") ? method : "OTHER");
        fields.put(LogField.ROUTE, ROUTE_TEMPLATE.matcher(routeTemplate).matches() ? routeTemplate : UNREADABLE_ROUTE);
        fields.put(LogField.STATUS, status);
        fields.put(LogField.DURATION_MS, durationMs);
        write(LOG.atInfo(), "request", fields);
    }

    /** A request that failed: its code and the exception's type, never the exception's message. */
    public static void failure(UUID requestId, ErrorCode code, Class<? extends Throwable> exceptionType) {
        Map<LogField, Object> fields = new EnumMap<>(LogField.class);
        fields.put(LogField.REQUEST_ID, requestId);
        fields.put(LogField.ERROR_CODE, code);
        fields.put(LogField.EXCEPTION, exceptionType.getName());
        write(code == ErrorCode.INTERNAL ? LOG.atError() : LOG.atWarn(), "failure", fields);
    }

    private static void write(LoggingEventBuilder line, String event, Map<LogField, Object> fields) {
        fields.forEach((field, value) -> line.addKeyValue(field.key(), value));
        line.log(event + " " + fields.entrySet().stream()
                .map(entry -> entry.getKey().key() + "=" + entry.getValue())
                .collect(Collectors.joining(" ")));
    }
}
