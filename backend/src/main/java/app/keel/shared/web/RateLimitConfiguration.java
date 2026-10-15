package app.keel.shared.web;

import java.time.Clock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** The request limits (K-817): one limiter for the process and the interceptor that asks it, on every /v1 route. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@EnableConfigurationProperties(RateLimitProperties.class)
class RateLimitConfiguration implements WebMvcConfigurer {

    private final RateLimitInterceptor interceptor;

    RateLimitConfiguration(RateLimitProperties properties, Clock clock) {
        this.interceptor = new RateLimitInterceptor(new RateLimiter(clock, properties.maxKeys(), properties.sweepEvery()), properties);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor).addPathPatterns("/v1/**");
    }
}
