package app.keel.training;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;

/**
 * The reps the onboarding asks a starting weight for (ADR-072 #5, "about 8 times"): data/parameters/onboarding.json ›
 * starting_weight_reps, the phone's own file, so the question and the rule are one number — a product parameter (tag
 * urun), read as the quota is (QuotaLimits). Without a whole number of at least one the server does not start.
 */
record StartingWeightReps(int reps) {

    private static final String KEY = "starting_weight_reps";

    static StartingWeightReps fromClasspath() {
        try (InputStream in = new ClassPathResource("data/parameters/onboarding.json").getInputStream()) {
            return fromJson(in);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** JSON is YAML: read with the same strict reader as the other parameter files (no key twice). */
    @SuppressWarnings("unchecked")
    static StartingWeightReps fromJson(InputStream in) {
        LoaderOptions strict = new LoaderOptions();
        strict.setAllowDuplicateKeys(false);
        List<Map<String, Object>> parameters = (List<Map<String, Object>>) ((Map<String, Object>) new Yaml(strict).load(in)).get("parameters");
        return parameters.stream().filter(parameter -> KEY.equals(parameter.get("key"))).map(parameter -> parameter.get("value"))
                .filter(value -> value instanceof Integer reps && reps >= 1).map(value -> new StartingWeightReps((Integer) value)).findFirst()
                .orElseThrow(() -> new IllegalStateException("onboarding.json: " + KEY + " is missing or not a whole number of at least 1"));
    }
}
