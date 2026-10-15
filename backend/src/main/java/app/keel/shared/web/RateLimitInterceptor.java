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

    private final RateLimiter accounts;
    private final RateLimiter addresses;
    private final RateLimitProperties properties;

    /** Two tables, each with its own bound: what is counted by account never shares room with what is counted by address. */
    RateLimitInterceptor(RateLimiter accounts, RateLimiter addresses, RateLimitProperties properties) {
        this.accounts = accounts;
        this.addresses = addresses;
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
        String account = account(group);
        RateLimiter.Decision decision = account != null
                ? accounts.tryAcquire(group.name() + "|account:" + account, properties.rule(group))
                : addresses.tryAcquire(group.name() + "|address:" + ClientAddress.key(request), properties.rule(group));
        if (!decision.allowed()) {
            throw new RateLimitedException(decision.retryAfterSeconds());
        }
        return true;
    }

    /** The signed-in account for a group counted by account; null when the group is counted by address or there is no session. */
    private static String account(RateLimitGroup group) {
        if (group.scope() == RateLimitGroup.Scope.ACCOUNT) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof Jwt token && token.getSubject() != null) {
                return token.getSubject();
            }
        }
        return null;
    }
}
