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
    private static final Map<String, Object> MUSCLES = Map.of("muscles", Map.of("quads", "lower", "chest", "upper", "triceps", "upper"),
            "setup_fields", List.of("seat_height", "foot_position"));
    private static final Path APP_ASSETS = Path.of("../apps/mobile/assets");

    @Test
    @SuppressWarnings("unchecked")
    void theRepositorysCatalogLoadsAndEveryMoveHasItsName() throws IOException {
        ExerciseCatalog catalog = ExerciseCatalog.of(repository(), vocabulary());
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
    void theTestsMoveIsValidSoEachRefusalBelowIsForItsOwnReason() {
        assertThat(ExerciseCatalog.of(Map.of("squat.yaml", move("squat", "compound", List.of("quads"), List.of())), MUSCLES).all()).hasSize(1);
    }

    @Test
    @SuppressWarnings("unchecked")
    void theRepositorysCatalogIsTheDefaultProgramsMovesAndTheirSwaps() throws IOException {
        // ADR-017: the default program's moves and their alternatives, ~30-40 (each is filmed twice by hand).
        ExerciseCatalog catalog = ExerciseCatalog.of(repository(), vocabulary());
        Map<String, Object> copy = new Yaml().load(Files.readString(Path.of("../data/copy/en.json")));
        Map<String, Map<String, Object>> texts = (Map<String, Map<String, Object>>) copy.get("exercises");
        Map<String, Map<String, String>> setupLabels = (Map<String, Map<String, String>>) copy.get("exerciseSetup");

        assertThat(catalog.all()).hasSizeBetween(30, 40);
        assertThat(catalog.all()).allSatisfy(move -> {
            assertThat(texts.get(move.id())).as(move.id()).containsKey("name");
            // Search aliases, comma-separated: the app's copy holds strings only (apps/mobile/src/copy).
            assertThat(texts.get(move.id()).get("aliases")).as(move.id() + " aliases, for search").isInstanceOf(String.class);
            move.setup().forEach(field -> assertThat(setupLabels.get(field)).as(field).containsKey("label"));
        });
        // Every muscle can be trained by at least two moves: the program's and a swap (K-211 builds on this).
        for (String muscle : ((Map<String, Object>) muscles().get("muscles")).keySet()) {
            assertThat(catalog.all().stream().filter(move -> move.muscles().contains(muscle)).count()).as(muscle).isGreaterThanOrEqualTo(2);
        }
        assertThat(catalog.find("one_arm_dumbbell_row")).hasValueSatisfying(row -> assertThat(row.unilateral()).isTrue());
        assertThat(catalog.find("push_up")).hasValueSatisfying(push -> assertThat(push.load()).isEqualTo(ExerciseCatalog.Load.BODYWEIGHT));
    }

    @Test
    void aSetupFieldOutsideTheVocabularyIsRefused() {
        // The phone keeps the user's setting per field; "seat" next to "seat_height" would lose it.
        assertThatIllegalArgumentException().isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                with(move("squat", "compound", List.of("quads"), List.of()), "setup", List.of("seat"))), MUSCLES));
    }

    @Test
    void aMoveHasItsOwnTwoClips() {
        Map<String, Object> squat = move("squat", "compound", List.of("quads"), List.of());

        assertThatIllegalArgumentException().as("no clips").isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml", with(squat, "clips", null)), MUSCLES));
        assertThatIllegalArgumentException().as("another move's clip").isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                with(squat, "clips", Map.of("first_rep", "clips/bench_press/first-rep.mp4", "last_rep", "clips/squat/last-rep.mp4"))), MUSCLES));
        assertThatIllegalArgumentException().as("one clip").isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                with(squat, "clips", Map.of("first_rep", "clips/squat/first-rep.mp4"))), MUSCLES));
        assertThatIllegalArgumentException().as("the same clip twice").isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                with(squat, "clips", Map.of("first_rep", "clips/squat/first-rep.mp4", "last_rep", "clips/squat/first-rep.mp4"))), MUSCLES));
    }

    @Test
    void aReviewIsPendingOrAPassedChecklist() {
        // docs/hareket-cekim-kontrol-listesi.md: review: {date, by, checklist: pass, notes}.
        Map<String, Object> squat = move("squat", "compound", List.of("quads"), List.of());
        Map<String, Object> passed = Map.of("date", "2026-10-01", "by", "levent", "checklist", "pass", "notes", "stance on the plate marks");

        assertThat(ExerciseCatalog.of(Map.of("squat.yaml", with(squat, "review", passed)), MUSCLES).find("squat"))
                .hasValueSatisfying(move -> assertThat(move.reviewed()).isTrue());
        assertThat(ExerciseCatalog.of(Map.of("squat.yaml", squat), MUSCLES).find("squat"))
                .hasValueSatisfying(move -> assertThat(move.reviewed()).isFalse());
        assertThatIllegalArgumentException().as("no review").isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml", with(squat, "review", null)), MUSCLES));
        assertThatIllegalArgumentException().as("failed checklist").isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                with(squat, "review", Map.of("date", "2026-10-01", "by", "levent", "checklist", "fail"))), MUSCLES));
        assertThatIllegalArgumentException().as("no date").isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                with(squat, "review", Map.of("by", "levent", "checklist", "pass"))), MUSCLES));
        assertThatIllegalArgumentException().as("not a date").isThrownBy(() -> ExerciseCatalog.of(Map.of("squat.yaml",
                with(squat, "review", Map.of("date", "someday", "by", "levent", "checklist", "pass"))), MUSCLES));
    }

    @Test
    void aReviewedMovesClipsAreInTheApp() throws IOException {
        // A move is served with clips only once reviewed (WorkoutController); then the phone must have the files.
        ExerciseCatalog catalog = ExerciseCatalog.of(repository(), vocabulary());

        assertThat(catalog.all().stream().filter(ExerciseCatalog.Exercise::reviewed)).allSatisfy(move -> {
            assertThat(APP_ASSETS.resolve(move.clips().firstRep())).as(move.id()).exists();
            assertThat(APP_ASSETS.resolve(move.clips().lastRep())).as(move.id()).exists();
        });
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
        ExerciseCatalog catalog = ExerciseCatalog.of(repository(), vocabulary());

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

    /** A move that is valid in every field but the one a test changes (K-219: setup, two clips, review). */
    static Map<String, Object> move(String id, String kind, List<String> muscles, List<String> alternatives) {
        return Map.of("id", id, "kind", kind, "muscles", muscles, "alternatives", alternatives, "load", "external", "unilateral", false,
                "setup", List.of("foot_position"), "clips", clips(id), "review", "pending");
    }

    static Map<String, Object> clips(String id) {
        return Map.of("first_rep", "clips/" + id + "/first-rep.mp4", "last_rep", "clips/" + id + "/last-rep.mp4");
    }

    private static Map<String, Object> with(Map<String, Object> move, String field, Object value) {
        Map<String, Object> changed = new HashMap<>(move);
        if (value == null) {
            changed.remove(field);
        } else {
            changed.put(field, value);
        }
        return changed;
    }

    private static Map<String, Object> vocabulary() throws IOException {
        Map<String, Object> vocabulary = new HashMap<>(muscles());
        try (Reader reader = Files.newBufferedReader(Path.of("../data/exercise-setup.yaml"))) {
            vocabulary.putAll(new Yaml().<Map<String, Object>>load(reader));
        }
        return vocabulary;
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
