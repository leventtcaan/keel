package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.Environment;

/**
 * What the server runs with (K-907), read by Spring itself from the application's own files (spring.config.location: the
 * classpath root only, not the tests' config/application.yml). Production is what a server is unless a profile says
 * otherwise: forgetting SPRING_PROFILES_ACTIVE fails closed — the Apple key and a real-or-off coach are then required and
 * the base's fake coach stops the start (ProductionStartTests). The VPS runs `prod`: the coach is off and the AI consent
 * cannot be given (ADR-064 #5; the fake keeps requests in memory — M8 inventory gap 7); TestFlight's SANDBOX purchases still
 * count in the beta (ADR-056 #4: it goes at the store launch, M10 — this test changes with that decision).
 */
class ProductionProfileTests {

    /** The application's files as a server reads them, under these profiles. */
    static ApplicationContextRunner server(String... profiles) {
        return new ApplicationContextRunner().withInitializer(new ConfigDataApplicationContextInitializer())
                .withPropertyValues("spring.config.location=classpath:/", "spring.profiles.active=" + String.join(",", profiles));
    }

    private static void environment(ApplicationContextRunner runner, Consumer<Environment> check) {
        runner.run(context -> check.accept(context.getEnvironment()));
    }

    @Test
    void withoutAProfileItIsProduction() {
        environment(server(), env -> assertThat(env.getProperty("keel.production", Boolean.class)).isTrue());
    }

    @Test
    void localDevelopmentAndTheTestsAreNot() {
        environment(server("local"), env -> assertThat(env.getProperty("keel.production", Boolean.class)).isFalse());
        // The tests' own config/application.yml, read where Spring reads it by default.
        environment(new ApplicationContextRunner().withInitializer(new ConfigDataApplicationContextInitializer()),
                env -> assertThat(env.getProperty("keel.production", Boolean.class)).isFalse());
    }

    @Test
    void theVpsProfileIsProductionWithTheCoachOffAndNoAiConsent() {
        environment(server("prod"), env -> {
            assertThat(env.getProperty("keel.production", Boolean.class)).isTrue();
            assertThat(env.getProperty("keel.coach.provider")).isEqualTo("off");
            assertThat(env.getProperty("keel.coach.provider-name")).isEqualTo("none");
            assertThat(env.getProperty("keel.consent.third-party-ai.provider")).as("no provider to consent to").isNull();
        });
    }

    @Test
    void testFlightPurchasesCountDuringTheBeta() {
        environment(server("prod"), env -> assertThat(Binder.get(env).bind("keel.subscription.revenuecat.environments", Bindable.listOf(String.class)).get())
                .containsExactly("PRODUCTION", "SANDBOX"));
    }
}
