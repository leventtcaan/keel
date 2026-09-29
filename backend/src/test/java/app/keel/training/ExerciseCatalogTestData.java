package app.keel.training;

import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;
import org.yaml.snakeyaml.Yaml;

/** The repository's exercise catalog, read as the application reads it (for tests without a Spring context). */
final class ExerciseCatalogTestData {

    private ExerciseCatalogTestData() {
    }

    static ExerciseCatalog catalog() throws IOException {
        Map<String, Object> files = new HashMap<>();
        try (Stream<Path> paths = Files.list(Path.of("../data/exercises"))) {
            for (Path file : paths.filter(p -> p.toString().endsWith(".yaml")).toList()) {
                try (Reader reader = Files.newBufferedReader(file)) {
                    files.put(file.getFileName().toString(), new Yaml().load(reader));
                }
            }
        }
        Map<String, Object> vocabulary = new HashMap<>();
        for (String name : new String[] {"../data/muscles.yaml", "../data/exercise-setup.yaml"}) {
            try (Reader reader = Files.newBufferedReader(Path.of(name))) {
                vocabulary.putAll(new Yaml().<Map<String, Object>>load(reader));
            }
        }
        return ExerciseCatalog.of(files, vocabulary);
    }
}
