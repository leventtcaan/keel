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
    private static final Map<String, Object> MUSCLES = Map.of("muscles", Map.of("quads", "lower", "chest", "upper", "triceps", "upper"));

    @Test
    @SuppressWarnings("unchecked")
    void theRepositorysCatalogLoadsAndEveryMoveHasItsName() throws IOException {
        ExerciseCatalog catalog = ExerciseCatalog.of(repository(), muscles());
        Map<String, Object> copy = new Yaml().load(Files.readString(Path.of("../data/copy/en.json")));
        Map<String, Map<String, String>> names = (Map<String, Map<String, String>>) copy.get("exercises");

        assertThat(catalog.all()).isNotEmpty();
        assertThat(catalog.all()).allSatisfy(move -> assertThat(names.get(move.id())).as(move.id()).containsKey("name"));
        assertThat(catalog.find("bench_press")).hasValueSatisfying(bench -> {
            assertThat(bench.kind()).isEqualTo(ExerciseCatalog.Kind.COMPOUND);
            assertThat(bench.alternatives()).contains("dumbbell_bench_press");
        });
        assertThat(catalog.find("lat_pulldown")).hasValueSatisfying(pulldown -> assertThat(pulldown.alternatives()).contains("pull_up"));
    }

    @Test
    void anUnknownFieldIsRefusedSoATypoCannotDropData() {
        // "alternates" for "alternatives" would otherwise load as no alternatives at all.
        Map<String, Object> typo = new HashMap<>(move("squat", "compound", List.of("quads"), List.of()));
        typo.put("alternates", List.of("leg_press"));

        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml", typo), MUSCLES));
    }

    @Test
    void aMuscleOutsideTheVocabularyIsRefused() {
        // K-211 counts weekly sets per muscle: "tricep" next to "triceps" would be a second, silent bucket.
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                move("squat", "compound", List.of("tricep"), List.of())), MUSCLES));
    }

    @Test
    void everyMuscleHasARegion() throws IOException {
        // Load steps differ by region (load_increment_upper_kg / _lower_kg, K-217).
        ExerciseCatalog catalog = ExerciseCatalog.of(repository(), muscles());

        assertThat(catalog.region("quads")).isEqualTo(ExerciseCatalog.Region.LOWER);
        assertThat(catalog.region("lats")).isEqualTo(ExerciseCatalog.Region.UPPER);
    }

    @Test
    void aFileNamedForAnotherMoveIsRefused() {
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                move("bench_press", "compound", List.of("chest"), List.of())), MUSCLES));
    }

    @Test
    void anAlternativeThatIsNotInTheCatalogIsRefused() {
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                move("squat", "compound", List.of("quads"), List.of("hack_squat"))), MUSCLES));
    }

    @Test
    void aMoveIsNotItsOwnAlternative() {
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                move("squat", "compound", List.of("quads"), List.of("squat"))), MUSCLES));
    }

    @Test
    void anUnknownKindOrLoadOrNoMusclesIsRefused() {
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                move("squat", "cardio", List.of("quads"), List.of())), MUSCLES));
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                move("squat", "compound", List.of(), List.of())), MUSCLES));
        Map<String, Object> badLoad = new HashMap<>(move("squat", "compound", List.of("quads"), List.of()));
        badLoad.put("load", "magic");
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml", badLoad), MUSCLES));
    }

    static Map<String, Object> move(String id, String kind, List<String> muscles, List<String> alternatives) {
        return Map.of("id", id, "kind", kind, "muscles", muscles, "alternatives", alternatives, "load", "external", "unilateral", false);
    }

    private static Map<String, Object> muscles() throws IOException {
        try (Reader reader = Files.newBufferedReader(Path.of("../data/muscles.yaml"))) {
            return new Yaml().load(reader);
        }
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
