package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;

/**
 * Every engine parameter carries its source (U14, K2, ADR-010): a known tag and a source file that exists.
 * Parameters live in data/parameters/*.yaml at the repository root.
 */
class ParameterProvenanceTests {

    private static final Path REPO_ROOT = Path.of("..");
    private static final Path PARAMETERS_DIR = REPO_ROOT.resolve("data/parameters");
    private static final Set<String> TAGS = Set.of("tecrube", "literatur", "urun");
    private static final Set<String> SEXES = Set.of("male", "female");

    @Test
    void everyParameterIsWellFormedAndSourced() throws IOException {
        List<String> problems = new ArrayList<>();
        Set<String> seenKeys = new HashSet<>();

        for (Path file : parameterFiles()) {
            for (Map<String, Object> parameter : readParameters(file)) {
                String where = file.getFileName() + " → " + parameter.getOrDefault("key", "<no key>");

                Object key = parameter.get("key");
                if (!(key instanceof String k) || k.isBlank()) {
                    problems.add(where + ": missing key");
                } else if (!seenKeys.add(k)) {
                    problems.add(where + ": duplicate key");
                }
                if (!(parameter.get("unit") instanceof String)) {
                    problems.add(where + ": missing unit");
                }
                // instanceof first: Set.of(...).contains(null) throws instead of reporting a missing tag.
                if (!(parameter.get("tag") instanceof String tag) || !TAGS.contains(tag)) {
                    problems.add(where + ": tag must be one of " + TAGS);
                }

                boolean hasValue = parameter.containsKey("value");
                boolean hasBySex = parameter.containsKey("by_sex");
                if (hasValue == hasBySex) {
                    problems.add(where + ": exactly one of value or by_sex");
                }
                if (hasBySex && !(parameter.get("by_sex") instanceof Map<?, ?> bySex && bySex.keySet().equals(SEXES))) {
                    problems.add(where + ": by_sex must define exactly " + SEXES);
                }

                if (!(parameter.get("source") instanceof String source) || source.isBlank()) {
                    problems.add(where + ": missing source");
                } else {
                    Path sourceFile = REPO_ROOT.resolve(source.split("#", 2)[0]);
                    if (!Files.isRegularFile(sourceFile)) {
                        problems.add(where + ": source file does not exist: " + sourceFile.normalize());
                    }
                }
            }
        }

        assertThat(problems).as("parameter provenance problems").isEmpty();
        assertThat(seenKeys).as("at least one parameter is defined").isNotEmpty();
    }

    private static List<Path> parameterFiles() throws IOException {
        try (Stream<Path> files = Files.list(PARAMETERS_DIR)) {
            return files.filter(p -> p.toString().endsWith(".yaml")).sorted().toList();
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> readParameters(Path file) throws IOException {
        try (Reader reader = Files.newBufferedReader(file)) {
            // Duplicate keys are an error, not "last one wins" (the engine loader's callers do the same).
            LoaderOptions options = new LoaderOptions();
            options.setAllowDuplicateKeys(false);
            Map<String, Object> document = new Yaml(options).load(reader);
            assertThat(document).as(file + " has a top-level 'parameters' list").containsKey("parameters");
            return (List<Map<String, Object>>) document.get("parameters");
        }
    }
}
