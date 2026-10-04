package app.keel.subscription;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * The webhook's own chain (ADR-056 #2), before every other: no session token is read — RevenueCat has none, and a
 * bearer filter would turn it away — and no CSRF (not a browser form). Who sent it is the signature's to say
 * (RevenueCatWebhook), so the chain lets the request through to it and to nothing else.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
class SubscriptionSecurity {

    @Bean
    @Order(0)
    SecurityFilterChain revenueCatWebhookChain(HttpSecurity http) throws Exception {
        return http
                .securityMatcher(RevenueCatWebhook.PATH)
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sessions -> sessions.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
                .build();
    }
}
