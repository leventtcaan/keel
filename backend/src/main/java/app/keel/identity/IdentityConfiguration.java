package app.keel.identity;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.JWKSourceBuilder;
import com.nimbusds.jose.proc.SecurityContext;
import java.net.MalformedURLException;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Who may call what (K-203, ADR-024): /health and /v1/auth/* are open; every other /v1 route needs our session token
 * (Bearer); anything outside /v1 falls through to 404. No server-side session and no cookies — a token API has no
 * CSRF surface. A missing or bad token answers the contract's Error through the shared handler (UNAUTHENTICATED),
 * logged like any other failure. Controllers in any module receive the {@link AccountId}, nothing else of the token.
 */
@Configuration
@EnableConfigurationProperties({AppleProperties.class, SessionProperties.class})
class IdentityConfiguration {

    @Bean
    @ConditionalOnMissingBean
    Clock clock() {
        return Clock.systemUTC();
    }

    /** Apple's published keys, fetched and cached by Nimbus (appleid.apple.com/auth/keys). */
    @Bean
    JWKSource<SecurityContext> appleKeys(AppleProperties apple) throws MalformedURLException {
        return JWKSourceBuilder.create(apple.jwksUri().toURL()).build();
    }

    @Bean
    AppleIdentityVerifier appleIdentityVerifier(JWKSource<SecurityContext> appleKeys, AppleProperties apple, Clock clock) {
        return new AppleIdentityVerifier(appleKeys, apple, clock);
    }

    @Bean
    SessionTokens sessionTokens(SessionProperties session, Clock clock) {
        return new SessionTokens(session, clock);
    }

    /** The resource server checks every Bearer token with the session key. */
    @Bean
    JwtDecoder sessionTokenDecoder(SessionTokens sessions) {
        return sessions.decoder();
    }

    /** The HTTP side: only in a web application (a context without a server, like a migration test, has no HttpSecurity). */
    @Configuration(proxyBeanMethods = false)
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    static class Web implements WebMvcConfigurer {

        private final Accounts accounts;

        Web(Accounts accounts) {
            this.accounts = accounts;
        }

        /**
         * The open routes get a chain of their own with no token processing at all: the phone's client sends its
         * (possibly expired) access token on every call, and a bearer filter would reject it before the route rules —
         * so an expired session could never be refreshed (K-203 review).
         */
        @Bean
        @Order(1)
        SecurityFilterChain open(HttpSecurity http) throws Exception {
            return http
                    .securityMatcher("/v1/auth/**", "/health", "/error")
                    .csrf(csrf -> csrf.disable())
                    .sessionManagement(sessions -> sessions.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                    .authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
                    .build();
        }

        @Bean
        @Order(2)
        SecurityFilterChain api(HttpSecurity http, @Qualifier("handlerExceptionResolver") HandlerExceptionResolver errors) throws Exception {
            return http
                    .csrf(csrf -> csrf.disable())
                    .sessionManagement(sessions -> sessions.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                    .authorizeHttpRequests(requests -> requests
                            .requestMatchers("/v1/**").authenticated()
                            .anyRequest().permitAll())
                    .oauth2ResourceServer(resource -> resource
                            .jwt(jwt -> { })
                            .authenticationEntryPoint((request, response, failure) ->
                                    errors.resolveException(request, response, null, new ApiException(ErrorCode.UNAUTHENTICATED)))
                            .accessDeniedHandler((request, response, denied) ->
                                    errors.resolveException(request, response, null, new ApiException(ErrorCode.FORBIDDEN))))
                    .exceptionHandling(handling -> handling
                            .authenticationEntryPoint((request, response, failure) ->
                                    errors.resolveException(request, response, null, new ApiException(ErrorCode.UNAUTHENTICATED))))
                    .build();
        }

        @Override
        public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
            resolvers.add(new AccountIdResolver(accounts));
        }
    }

    /**
     * A controller parameter of type AccountId is the signed-in account: the session token's subject, if that account
     * still exists — a deleted account's token is refused for the minutes it would still be valid (K-214 review).
     */
    static final class AccountIdResolver implements HandlerMethodArgumentResolver {

        private final Accounts accounts;

        AccountIdResolver(Accounts accounts) {
            this.accounts = accounts;
        }

        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.getParameterType() == AccountId.class;
        }

        @Override
        public AccountId resolveArgument(MethodParameter parameter, ModelAndViewContainer mav, NativeWebRequest request,
                WebDataBinderFactory binders) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof Jwt token) {
                AccountId account = new AccountId(UUID.fromString(token.getSubject()));
                if (accounts.exists(account)) {
                    return account;
                }
            }
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
    }
}
