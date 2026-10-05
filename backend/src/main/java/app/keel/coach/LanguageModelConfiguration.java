package app.keel.coach;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The language model keel.coach.provider names (K-503, ADR-042); one the server does not have stops it from starting. In
 * production (keel.production, K-907) the fake does not start either: it keeps the last requests — questions, meal notes,
 * photos — in memory (M8 inventory gap 7); "off" is the coach without a model (ADR-064 #5).
 */
@Configuration
@EnableConfigurationProperties(CoachProperties.class)
class LanguageModelConfiguration {

    @Bean
    static LanguageModel languageModel(CoachProperties properties, @Value("${keel.production}") boolean production) {
        return switch (properties.provider()) {
            case "fake" -> {
                if (production) {
                    throw new IllegalStateException("keel.coach.provider 'fake' does not run in production (keel.production): it keeps requests in memory; use 'off'");
                }
                yield new FakeLanguageModel();
            }
            case "off" -> new OffLanguageModel();
            default -> throw new IllegalStateException("keel.coach.provider '" + properties.provider() + "' is not one the server has (fake, off)");
        };
    }
}
