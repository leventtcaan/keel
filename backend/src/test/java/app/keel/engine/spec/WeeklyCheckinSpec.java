package app.keel.engine.spec;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import org.yaml.snakeyaml.Yaml;

/** Loads the weekly check-in specification table from src/test/resources/spec/weekly-checkin.yaml. */
final class WeeklyCheckinSpec {

    static final String RESOURCE = "/spec/weekly-checkin.yaml";

    private WeeklyCheckinSpec() {
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> load() throws IOException {
        try (InputStream in = WeeklyCheckinSpec.class.getResourceAsStream(RESOURCE)) {
            if (in == null) {
                throw new IllegalStateException("Specification not found on the test classpath: " + RESOURCE);
            }
            return new Yaml().load(in);
        }
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> rows() throws IOException {
        return (List<Map<String, Object>>) load().get("rows");
    }

    @SuppressWarnings("unchecked")
    static List<String> actions() throws IOException {
        return (List<String>) load().get("actions");
    }
}
