package app.keel.coach;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The language model keel.coach.provider names (K-503, ADR-042); one the server does not have stops it from starting. */
@Configuration
@EnableConfigurationProperties(CoachProperties.class)
class LanguageModelConfiguration {

    @Bean
    static LanguageModel languageModel(CoachProperties properties, @Value("${keel.production}") boolean production) {
        return switch (properties.provider()) {
            case "fake" -> new FakeLanguageModel();
            case "off" -> new OffLanguageModel();
            default -> throw new IllegalStateException("keel.coach.provider '" + properties.provider() + "' is not one the server has (fake)");
        };
    }
}
