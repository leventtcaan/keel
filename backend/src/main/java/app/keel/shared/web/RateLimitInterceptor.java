package app.keel.shared.web;

import app.keel.shared.RateLimitGroup;
import app.keel.shared.RateLimited;
import app.keel.shared.RateLimitedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Counts the requests of a {@link RateLimited} route and refuses the ones past the burst (K-817): 429 RATE_LIMITED through
 * the shared error handler, which adds Retry-After. It runs after security (so an account is the session token's subject,
 * no database lookup) and before the method, so a refused request's body is never read. A route without a session
 * (sign-in) is counted by the connection's address; an account route that somehow has no session is too, rather than free.
 * The count key is not logged and not sent anywhere; what a refusal logs is SafeLog's code and type.
 */
final class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimiter limiter;
    private final RateLimitProperties properties;

    RateLimitInterceptor(RateLimiter limiter, RateLimitProperties properties) {
        this.limiter = limiter;
        this.properties = properties;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method)) {
            return true;
        }
        RateLimited limited = method.getMethodAnnotation(RateLimited.class);
        if (limited == null) {
            return true;
        }
        RateLimitGroup group = limited.value();
        RateLimiter.Decision decision = limiter.tryAcquire(group.name() + "|" + owner(group, request), properties.rule(group));
        if (!decision.allowed()) {
            throw new RateLimitedException(decision.retryAfterSeconds());
        }
        return true;
    }

    private static String owner(RateLimitGroup group, HttpServletRequest request) {
        if (group.scope() == RateLimitGroup.Scope.ACCOUNT) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof Jwt token && token.getSubject() != null) {
                return "account:" + token.getSubject();
            }
        }
        return "address:" + ClientAddress.key(request);
    }
}
