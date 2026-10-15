package app.keel.shared;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * On a controller method: its requests are limited (K-817). Past the group's burst the answer is 429 RATE_LIMITED with a
 * Retry-After, before the method (and its body) is touched. The numbers are keel.rate-limit.groups.*; the route lists the
 * 429 in the contract (checked by RateLimitConfigTests).
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RateLimited {

    RateLimitGroup value();
}
