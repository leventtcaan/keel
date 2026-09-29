package app.keel.shared.web;

import app.keel.shared.SafeLog;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Logs each request once, when it has been answered (K-215): its id, method, route template — "/v1/weigh-ins/{id}",
 * never the path or query the user sent — status and duration, through SafeLog (V3).
 */
@Component
class RequestLogFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID = RequestLogFilter.class.getName() + ".requestId";
    private static final String UNMATCHED = "unmatched";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long start = System.nanoTime();
        request.setAttribute(REQUEST_ID, UUID.randomUUID());
        try {
            chain.doFilter(request, response);
        } finally {
            Object route = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
            SafeLog.request(requestId(request), request.getMethod(), route instanceof String template ? template : UNMATCHED,
                    response.getStatus(), (System.nanoTime() - start) / 1_000_000);
        }
    }

    /** The id of the request being answered; a fresh one if the filter did not run (a test calling a handler directly). */
    static UUID requestId(HttpServletRequest request) {
        return request.getAttribute(REQUEST_ID) instanceof UUID id ? id : UUID.randomUUID();
    }
}
