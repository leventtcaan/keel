package app.keel.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.time.Clock;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * AppleAccounts as the server starts it from its own files (K-907, ADR-062 #3): keel.production reaches it, so production
 * without the Sign in with Apple key does not start — with the VPS profile, and without any profile. No database: the
 * account store and the token verifier are built but never called.
 */
class AppleAccountsStartTests {

    private static final Clock CLOCK = Clock.systemUTC();
    private static final AppleProperties APP = new AppleProperties("app.keel", "https://appleid.apple.com", URI.create("https://appleid.apple.com/auth/keys"));

    private static ApplicationContextRunner server(String profile) {
        return new ApplicationContextRunner().withInitializer(new ConfigDataApplicationContextInitializer())
                .withPropertyValues("spring.config.location=classpath:/", "spring.profiles.active=" + profile)
                .withBean(Clock.class, () -> CLOCK).withBean(AppleProperties.class, () -> APP).withBean(Accounts.class, () -> new Accounts(null, CLOCK))
                .withBean(AppleIdentityVerifier.class, () -> new AppleIdentityVerifier((selector, context) -> List.of(), APP, CLOCK))
                .withUserConfiguration(AppleAccounts.class);
    }

    @Test
    void theVpsProfileWithoutTheKeyDoesNotStart() {
        server("prod").run(context -> assertThat(context).hasFailed().getFailure().rootCause().hasMessageContaining("KEEL_APPLE_PRIVATE_KEY"));
    }

    @Test
    void noProfileWithoutTheKeyDoesNotStart() {
        server("").run(context -> assertThat(context).hasFailed().getFailure().rootCause().hasMessageContaining("KEEL_APPLE_PRIVATE_KEY"));
    }

    @Test
    void localDevelopmentStartsWithRevocationUnavailable() {
        server("local").run(context -> assertThat(context).hasNotFailed().getBean(AppleAccounts.class)
                .satisfies(accounts -> assertThat(accounts.revocationConfigured()).isFalse()));
    }
}
