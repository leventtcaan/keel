package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.SystemEnvironmentPropertySource;

/**
 * The coach's model as the server starts it from its own files (K-907): keel.production reaches the bean, so a lost or
 * renamed key cannot quietly let the fake run in production. No database, no web server.
 */
class ProductionStartTests {

    private static ApplicationContextRunner server(String profile) {
        return new ApplicationContextRunner().withInitializer(new ConfigDataApplicationContextInitializer())
                .withPropertyValues("spring.config.location=classpath:/", "spring.profiles.active=" + profile)
                .withUserConfiguration(LanguageModelConfiguration.class);
    }

    @Test
    void theVpsProfileStartsWithTheCoachOff() {
        server("prod").run(context -> assertThat(context).hasNotFailed().getBean(LanguageModel.class).isInstanceOf(OffLanguageModel.class));
    }

    @Test
    void theFakeSetFromTheEnvironmentDoesNotStartInProduction() {
        server("prod").withInitializer(context -> context.getEnvironment().getPropertySources()
                        .addFirst(new SystemEnvironmentPropertySource("environment", Map.of("KEEL_COACH_PROVIDER", "fake"))))
                .run(context -> assertThat(context).hasFailed().getFailure().rootCause().hasMessageContaining("does not run in production"));
    }

    @Test
    void aServerStartedWithoutAProfileDoesNotStart() {
        // Production by default, with the base file's fake: forgetting SPRING_PROFILES_ACTIVE stops the start.
        server("").run(context -> assertThat(context).hasFailed().getFailure().rootCause().hasMessageContaining("does not run in production"));
    }

    @Test
    void localDevelopmentHasTheFake() {
        server("local").run(context -> assertThat(context).hasNotFailed().getBean(LanguageModel.class).isInstanceOf(FakeLanguageModel.class));
    }
}
