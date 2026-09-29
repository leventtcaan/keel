package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.yaml.snakeyaml.Yaml;

/**
 * The program templates (K-211): data/programs/<n>-days.yaml for 1 to 6 training days. Each holds Güray's limits, sets
 * counted for a move's first (primary) muscle: at most sets_per_session_per_muscle_max per muscle in a session (G1 K-10),
 * at most weekly_sets_per_muscle in a week (G1 K-11); with four days or more, a muscle worked four sets or more a week is
 * worked on frequency_per_muscle_per_week days (G1 K-22).
 */
class ProgramTemplateTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 4, 5, 6})
    void everyTemplateLoadsWithItsDaysAndKeepsTheSetLimits(int days) throws IOException {
        ExerciseCatalog catalog = ExerciseCatalogTestData.catalog();
        assertThat(ProgramTemplates.of(files(), catalog).forDays(days)).as(days + " days").isPresent();
        List<ProgramTemplates.Day> template = ProgramTemplates.of(files(), catalog).forDays(days).orElseThrow();
        int perSession = P.wholeNumber(ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MAX);
        int weekly = P.wholeNumber(ParameterKey.WEEKLY_SETS_PER_MUSCLE);

        assertThat(template).hasSize(days);
        Map<String, Integer> week = new TreeMap<>();
        Map<String, Integer> daysTrained = new TreeMap<>();
        for (ProgramTemplates.Day day : template) {
            Map<String, Integer> session = new TreeMap<>();
            day.exercises().forEach(slot -> session.merge(primary(catalog, slot.exerciseId()), slot.sets(), Integer::sum));
            assertThat(session).as(day.key()).allSatisfy((muscle, sets) -> assertThat(sets).as(muscle).isLessThanOrEqualTo(perSession));
            session.forEach((muscle, sets) -> {
                week.merge(muscle, sets, Integer::sum);
                daysTrained.merge(muscle, 1, Integer::sum);
            });
        }
        assertThat(week).allSatisfy((muscle, sets) -> assertThat(sets).as(muscle).isLessThanOrEqualTo(weekly));
        if (days >= 2) {
            // G1 K-61: biceps and triceps 6-8 work sets a week, split over two sessions (hammer/reverse curls are forearm, K-67).
            int arms = P.wholeNumber(ParameterKey.ARM_WEEKLY_SETS_MIN);
            assertThat(week.getOrDefault("biceps", 0)).as("biceps").isGreaterThanOrEqualTo(arms);
            assertThat(week.getOrDefault("triceps", 0)).as("triceps").isGreaterThanOrEqualTo(arms);
        }
        if (days >= 4) {
            int frequency = P.wholeNumber(ParameterKey.FREQUENCY_PER_MUSCLE_PER_WEEK);
            int split = P.wholeNumber(ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MIN) * frequency;
            week.forEach((muscle, sets) -> {
                if (sets >= split) {
                    assertThat(daysTrained.get(muscle)).as(muscle + " days").isGreaterThanOrEqualTo(frequency);
                }
            });
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void everyDayHasItsName() throws IOException {
        ProgramTemplates templates = ProgramTemplates.of(files(), ExerciseCatalogTestData.catalog());
        Map<String, Object> copy = new Yaml().load(Files.readString(Path.of("../data/copy/en.json")));
        Map<String, Map<String, String>> names = (Map<String, Map<String, String>>) copy.get("programDays");

        for (int days = 1; days <= 6; days++) {
            assertThat(templates.forDays(days)).as(days + " days").isPresent();
            assertThat(templates.forDays(days).orElseThrow()).allSatisfy(day -> assertThat(names.get(day.key())).as(day.key()).containsKey("name"));
        }
        assertThat(templates.forDays(7)).isEmpty();
    }

    @Test
    void aTemplateThatBreaksItsShapeIsRefused() throws IOException {
        ExerciseCatalog catalog = ExerciseCatalogTestData.catalog();

        assertThatIllegalArgumentException().as("not in the catalog").isThrownBy(() -> ProgramTemplates.of(
                Map.of("1-days.yaml", template(Map.of("exercise", "underwater_basket", "sets", 2))), catalog));
        assertThatIllegalArgumentException().as("no sets").isThrownBy(() -> ProgramTemplates.of(
                Map.of("1-days.yaml", template(Map.of("exercise", "squat", "sets", 0))), catalog));
        assertThatIllegalArgumentException().as("days ≠ file name").isThrownBy(() -> ProgramTemplates.of(
                Map.of("2-days.yaml", template(Map.of("exercise", "squat", "sets", 2))), catalog));
        assertThatIllegalArgumentException().as("unknown field").isThrownBy(() -> ProgramTemplates.of(
                Map.of("1-days.yaml", template(Map.of("exercise", "squat", "sets", 2, "reps", 8))), catalog));
        assertThat(ProgramTemplates.of(Map.of("1-days.yaml", template(Map.of("exercise", "squat", "sets", 2))), catalog).forDays(1))
                .as("the same template, valid").isPresent();
        // A shape the parser does not expect is named as a template problem, not a ClassCastException (K-211 review).
        assertThatIllegalArgumentException().as("days not a list").isThrownBy(() -> ProgramTemplates.of(
                Map.of("1-days.yaml", Map.of("days", "full_body")), catalog));
        assertThatIllegalArgumentException().as("exercise not text").isThrownBy(() -> ProgramTemplates.of(
                Map.of("1-days.yaml", template(Map.of("exercise", 7, "sets", 2))), catalog));
        Map<String, Object> day = Map.of("day", "full_body", "exercises", List.of(Map.of("exercise", "squat", "sets", 2)));
        assertThatIllegalArgumentException().as("a day key twice").isThrownBy(() -> ProgramTemplates.of(
                Map.of("2-days.yaml", Map.of("days", List.of(day, day))), catalog));
    }

    private static Map<String, Object> template(Map<String, Object> slot) {
        return Map.of("days", List.of(Map.of("day", "full_body", "exercises", List.of(slot))));
    }

    private static String primary(ExerciseCatalog catalog, String exercise) {
        return catalog.find(exercise).orElseThrow().muscles().getFirst();
    }

    static Map<String, Object> files() throws IOException {
        Map<String, Object> files = new HashMap<>();
        try (Stream<Path> paths = Files.list(Path.of("../data/programs"))) {
            for (Path file : paths.filter(p -> p.toString().endsWith(".yaml")).toList()) {
                try (Reader reader = Files.newBufferedReader(file)) {
                    files.put(file.getFileName().toString(), new Yaml().load(reader));
                }
            }
        }
        return files;
    }
}
