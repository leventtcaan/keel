package app.keel.shared.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.availability.ApplicationAvailabilityAutoConfiguration;
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.AvailabilityChangeEvent;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * /health is readiness (K-908): 503 until Spring Boot says ReadinessState.ACCEPTING_TRAFFIC, which it does only after
 * every ApplicationRunner (the FoodData Central import) has returned. Run through a real SpringApplication, so the
 * order is Spring Boot's own, with a runner standing in for the import: it asks /health while it works. No database.
 */
class HealthReadinessTests {

    /** What /health answered, as (status code, body status), each time something asked. */
    private static final class Asked {

        final List<String> answers = new ArrayList<>();
        ApplicationAvailability availability;
    }

    @Configuration
    @Import({ApplicationAvailabilityAutoConfiguration.class, HealthController.class})
    static class Application {

        @Bean
        Asked asked() {
            return new Asked();
        }
    }

    @Configuration
    static class WorkingRunner {

        @Bean
        ApplicationRunner startUpWork(HealthController health, Asked asked, ApplicationAvailability availability) {
            return args -> {
                asked.availability = availability;
                asked.answers.add(answer(health));
            };
        }
    }

    @Configuration
    static class FailingRunner {

        @Bean
        ApplicationRunner startUpWork(HealthController health, Asked asked, ApplicationAvailability availability) {
            return args -> {
                asked.availability = availability;
                asked.answers.add(answer(health));
                throw new IllegalStateException("the import failed");
            };
        }
    }

    private static String answer(HealthController health) {
        var result = MockMvcTester.of(health).get().uri("/health").exchange();
        return result.getResponse().getStatus() + " " + new String(result.getResponse().getContentAsByteArray());
    }

    private static SpringApplicationBuilder application(Class<?> runner) {
        return new SpringApplicationBuilder(Application.class, runner).web(WebApplicationType.NONE).logStartupInfo(false);
    }

    @Test
    void refusesWhileAStartUpRunnerIsStillWorkingAndAnswersUpOnceItIsDone() {
        try (ConfigurableApplicationContext context = application(WorkingRunner.class).run()) {
            Asked asked = context.getBean(Asked.class);
            HealthController health = context.getBean(HealthController.class);

            assertThat(asked.answers).as("asked from inside the runner").singleElement().satisfies(answer -> {
                assertThat(answer).startsWith("503 ");
                assertThat(answer).contains("\"status\":\"STARTING\"");
            });
            assertThat(asked.availability.getReadinessState()).isEqualTo(ReadinessState.ACCEPTING_TRAFFIC);
            assertThat(answer(health)).startsWith("200 ").contains("\"status\":\"UP\"");
        }
    }

    @Test
    void refusesAgainWhenTheApplicationStopsTakingTraffic() {
        try (ConfigurableApplicationContext context = application(WorkingRunner.class).run()) {
            HealthController health = context.getBean(HealthController.class);
            AvailabilityChangeEvent.publish(context, ReadinessState.REFUSING_TRAFFIC);

            assertThat(answer(health)).startsWith("503 ");
        }
    }

    @Test
    void aFailedStartUpRunnerFailsTheStartAndReadinessNeverBecomesAccepting() {
        Asked[] asked = new Asked[1];
        SpringApplicationBuilder builder = application(FailingRunner.class);
        builder.listeners(event -> {
            if (event instanceof org.springframework.boot.context.event.ApplicationStartedEvent started) {
                asked[0] = started.getApplicationContext().getBean(Asked.class);
            }
        });

        assertThatThrownBy(builder::run).isInstanceOf(IllegalStateException.class).hasMessage("the import failed");

        assertThat(asked[0].answers).singleElement().asString().startsWith("503 ");
        assertThat(asked[0].availability.getReadinessState()).isNotEqualTo(ReadinessState.ACCEPTING_TRAFFIC);
    }
}
