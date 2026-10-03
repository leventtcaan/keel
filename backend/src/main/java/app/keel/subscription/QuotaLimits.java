package app.keel.subscription;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;

/**
 * The daily limits (K-508): data/parameters/quota.yaml — a product limit (tag urun), not an engine rule, read as the
 * question budget is (QuestionBudget). A use without a whole limit of at least one stops the server from starting.
 */
final class QuotaLimits {

    private static final Map<Quota.Use, String> KEYS = Map.of(Quota.Use.COACH_MESSAGE, "coach_messages_per_day",
            Quota.Use.PHOTO_ANALYSIS, "photo_analyses_per_day");

    private final Map<Quota.Use, Integer> limits;

    private QuotaLimits(Map<Quota.Use, Integer> limits) {
        this.limits = Map.copyOf(limits);
    }

    @SuppressWarnings("unchecked")
    static QuotaLimits fromClasspath() {
        try (InputStream in = new ClassPathResource("data/parameters/quota.yaml").getInputStream()) {
            List<Map<String, Object>> parameters = (List<Map<String, Object>>) ((Map<String, Object>) new Yaml().load(in)).get("parameters");
            Map<Quota.Use, Integer> limits = new EnumMap<>(Quota.Use.class);
            KEYS.forEach((use, key) -> limits.put(use, parameters.stream().filter(parameter -> key.equals(parameter.get("key")))
                    .map(parameter -> parameter.get("value")).filter(value -> value instanceof Integer limit && limit >= 1).map(Integer.class::cast)
                    .findFirst().orElseThrow(() -> new IllegalStateException("quota.yaml: " + key + " is missing or not a whole number of at least 1"))));
            return new QuotaLimits(limits);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    int perDay(Quota.Use use) {
        return limits.get(use);
    }
}
