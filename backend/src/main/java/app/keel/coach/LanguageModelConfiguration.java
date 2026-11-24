package app.keel.coach;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The language model keel.coach.provider names (K-503, ADR-042); one the server does not have stops it from starting. In
 * production (keel.production, K-907) the fake does not start either: it keeps the last requests — questions, meal notes,
 * photos — in memory (M8 inventory gap 7); "off" is the coach without a model (ADR-064 #5); "openai" is OpenAI's chat
 * completions (ADR-092), which does not start without its key.
 */
@Configuration
@EnableConfigurationProperties({CoachProperties.class, OpenAiProperties.class})
class LanguageModelConfiguration {

    /** The coach's product limits (data/parameters/coach.yaml): read once, a limit that is not there stops the start. */
    @Bean
    static CoachLimits coachLimits() {
        return CoachLimits.fromClasspath();
    }

    @Bean
    static LanguageModel languageModel(CoachProperties properties, @Value("${keel.production}") boolean production, ObjectProvider<OpenAiProperties> openai) {
        return languageModel(properties, production, openai.getIfAvailable());
    }

    /** Without OpenAI's settings: the providers that need none. */
    static LanguageModel languageModel(CoachProperties properties, boolean production) {
        return languageModel(properties, production, (OpenAiProperties) null);
    }

    static LanguageModel languageModel(CoachProperties properties, boolean production, OpenAiProperties openai) {
        return switch (properties.provider()) {
            case "fake" -> {
                if (production) {
                    throw new IllegalStateException("keel.coach.provider 'fake' does not run in production (keel.production): it keeps requests in memory; use 'off'");
                }
                yield new FakeLanguageModel();
            }
            case "off" -> new OffLanguageModel();
            case "openai" -> new OpenAiLanguageModel(openai != null ? openai : new OpenAiProperties(null, null, null, null, null));
            default -> throw new IllegalStateException("keel.coach.provider '" + properties.provider() + "' is not one the server has (fake, off, openai)");
        };
    }
}
