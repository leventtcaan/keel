package app.keel.shared.web;

import app.keel.shared.SafeLog;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Logs each request once, when it has been answered (K-215): its id, method, route template — "/v1/weigh-ins/{id}",
 * never the path or query the user sent — status and duration, through SafeLog (V3). First in the chain, so it wraps
 * every other filter (security included). No endpoint is asynchronous yet; when one is, the async dispatch needs
 * logging too (shouldNotFilterAsyncDispatch), or its real status is never written.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class RequestLogFilter extends OncePerRequestFilter {

    static final String REQUEST_ID_HEADER = "X-Request-Id";

    private static final String REQUEST_ID = RequestLogFilter.class.getName() + ".requestId";
    private static final String UNMATCHED = "unmatched";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long start = System.nanoTime();
        UUID id = UUID.randomUUID();
        request.setAttribute(REQUEST_ID, id);
        // The id goes back to the client, so a report can be matched to its log lines.
        response.setHeader(REQUEST_ID_HEADER, id.toString());
        boolean failed = true;
        try {
            chain.doFilter(request, response);
            failed = false;
        } finally {
            Object route = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
            // An exception escaping the chain has no status yet; the container will answer 500 (via /error).
            SafeLog.request(id, request.getMethod(), route instanceof String template ? template : UNMATCHED,
                    failed ? 500 : response.getStatus(), (System.nanoTime() - start) / 1_000_000);
        }
    }

    /** The id of the request being answered; a fresh one if the filter did not run (a test calling a handler directly). */
    static UUID requestId(HttpServletRequest request) {
        return request.getAttribute(REQUEST_ID) instanceof UUID id ? id : UUID.randomUUID();
    }
}
