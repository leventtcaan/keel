package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * The exercise catalog is data (K-210, K2): data/exercises/<id>.yaml, one move per file. It is checked when it loads
 * — a broken catalog stops the application — and every name has its English text in data/copy/en.json.
 */
class ExerciseCatalogTests {

    private static final Path EXERCISES = Path.of("../data/exercises");

    @Test
    void theRepositorysCatalogLoadsAndEveryMoveHasItsName() throws IOException {
        ExerciseCatalog catalog = ExerciseCatalog.of(repository());
        String copy = Files.readString(Path.of("../data/copy/en.json"));

        assertThat(catalog.all()).isNotEmpty();
        assertThat(catalog.find("bench_press")).hasValueSatisfying(bench -> {
            assertThat(bench.kind()).isEqualTo(ExerciseCatalog.Kind.COMPOUND);
            assertThat(bench.alternatives()).contains("dumbbell_bench_press");
        });
        assertThat(catalog.find("lat_pulldown")).hasValueSatisfying(pulldown -> assertThat(pulldown.alternatives()).contains("pull_up"));
        assertThat(catalog.all()).allSatisfy(move -> assertThat(copy).contains("\"" + move.id() + "\""));
    }

    @Test
    void aFileNamedForAnotherMoveIsRefused() {
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                move("bench_press", "compound", List.of("chest"), List.of()))));
    }

    @Test
    void anAlternativeThatIsNotInTheCatalogIsRefused() {
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                move("squat", "compound", List.of("quads"), List.of("hack_squat")))));
    }

    @Test
    void aMoveIsNotItsOwnAlternative() {
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                move("squat", "compound", List.of("quads"), List.of("squat")))));
    }

    @Test
    void anUnknownKindOrLoadOrNoMusclesIsRefused() {
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                move("squat", "cardio", List.of("quads"), List.of()))));
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                move("squat", "compound", List.of(), List.of()))));
        Map<String, Object> badLoad = new HashMap<>(move("squat", "compound", List.of("quads"), List.of()));
        badLoad.put("load", "magic");
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml", badLoad)));
    }

    static Map<String, Object> move(String id, String kind, List<String> muscles, List<String> alternatives) {
        return Map.of("id", id, "kind", kind, "muscles", muscles, "alternatives", alternatives, "load", "external", "unilateral", false);
    }

    private static Map<String, Object> repository() throws IOException {
        Map<String, Object> files = new HashMap<>();
        try (Stream<Path> paths = Files.list(EXERCISES)) {
            for (Path file : paths.filter(p -> p.toString().endsWith(".yaml")).toList()) {
                try (Reader reader = Files.newBufferedReader(file)) {
                    files.put(file.getFileName().toString(), new Yaml().load(reader));
                }
            }
        }
        return files;
    }
}
