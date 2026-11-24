package app.keel.coach;

import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * How the coach talks to OpenAI (ADR-092 #4, keel.coach.openai; K2). The key comes from the environment
 * (KEEL_OPENAI_API_KEY, V5) and is in no log line, no exception message and no toString. {@code temperature} and
 * {@code reasoningEffort} are sent only when set: a reasoning model refuses a temperature, an older model has no effort.
 */
@ConfigurationProperties("keel.coach.openai")
record OpenAiProperties(String apiKey, URI baseUri, Duration timeout, Double temperature, String reasoningEffort) {

    OpenAiProperties {
        baseUri = baseUri == null ? URI.create("https://api.openai.com/v1/") : baseUri;
        timeout = timeout == null ? Duration.ofSeconds(20) : timeout;
        if (timeout.isNegative() || timeout.isZero()) {
            throw new IllegalStateException("keel.coach.openai.timeout is more than zero");
        }
        if (temperature != null && (temperature < 0 || temperature > 2)) {
            throw new IllegalStateException("keel.coach.openai.temperature is between 0 and 2");
        }
    }

    boolean hasKey() {
        // An unresolved ${KEEL_OPENAI_API_KEY} (the variable is not in the environment) is not a key.
        return apiKey != null && !apiKey.isBlank() && !apiKey.startsWith("${");
    }

    @Override
    public String toString() {
        return "OpenAiProperties[" + baseUri + ", key " + (hasKey() ? "set" : "not set") + "]";
    }
}
