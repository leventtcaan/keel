package app.keel.decision;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;

/**
 * The lengths a declared state is offered for, in days counted with today (ADR-077 #6, K-1021):
 * data/parameters/state.json › state_until_choices_days, the phone's own file, so the chips and the server's rule are one
 * list — a product parameter (tag urun), read as the quota is (QuotaLimits). Without a list of whole, distinct days of at
 * least one the server does not start.
 */
record StateLengths(List<Integer> days) {

    private static final String KEY = "state_until_choices_days";

    StateLengths {
        days = List.copyOf(days);
    }

    static StateLengths fromClasspath() {
        try (InputStream in = new ClassPathResource("data/parameters/state.json").getInputStream()) {
            return fromJson(in);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** JSON is YAML: read with the same strict reader as the other parameter files (no key twice). */
    @SuppressWarnings("unchecked")
    static StateLengths fromJson(InputStream in) {
        LoaderOptions strict = new LoaderOptions();
        strict.setAllowDuplicateKeys(false);
        List<Map<String, Object>> parameters = (List<Map<String, Object>>) ((Map<String, Object>) new Yaml(strict).load(in)).get("parameters");
        Object value = parameters.stream().filter(parameter -> KEY.equals(parameter.get("key"))).findFirst()
                .orElseThrow(StateLengths::invalid).get("value");
        if (!(value instanceof List<?> list) || list.isEmpty() || !list.stream().allMatch(day -> day instanceof Integer whole && whole >= 1)
                || new HashSet<>(list).size() != list.size()) {
            throw invalid();
        }
        return new StateLengths((List<Integer>) list);
    }

    /** Whether a count of days is one of the offered lengths. */
    boolean offers(int count) {
        return days.contains(count);
    }

    private static IllegalStateException invalid() {
        return new IllegalStateException("state.json: " + KEY + " is missing or not a list of whole days, each at least 1");
    }
}
