package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.RecordComponent;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/** What the progress endpoints send is the contract's schemas field for field (K-965), and the effort kinds are its enum. */
class ProgressContractTests {

    @Test
    @SuppressWarnings("unchecked")
    void theSummariesAreTheContractsSchemasFieldForField() throws IOException {
        Map<String, Object> schemas = schemas();
        Map<String, Class<?>> sent = Map.of("WorkoutSummary", ProgressController.WorkoutSummary.class, "SetMark", ProgressController.SetMark.class,
                "MuscleSets", ProgressSummary.MuscleSets.class, "TrainingProgress", ProgressController.TrainingProgress.class,
                "LiftProgress", ProgressController.LiftProgress.class, "DatedSet", ProgressController.DatedSet.class,
                "EffortLine", ProgressSummary.EffortLine.class);

        sent.forEach((schema, record) -> assertThat(properties(map(schemas.get(schema))).keySet()).as(schema)
                .containsExactlyInAnyOrderElementsOf(names(record)));
        Map<String, Object> week = map(map(properties(map(schemas.get("LiftProgress"))).get("weeks")).get("items"));
        assertThat(properties(week).keySet()).containsExactlyInAnyOrderElementsOf(names(ProgressSummary.WeekBest.class));
        assertThat((List<Object>) map(properties(map(schemas.get("EffortLine"))).get("kind")).get("enum"))
                .containsExactlyElementsOf(Arrays.stream(ProgressSummary.EffortKind.values()).map(Enum::name).toList());
        assertThat((List<Object>) map(properties(map(schemas.get("SetMark"))).get("kind")).get("enum"))
                .containsExactlyElementsOf(Arrays.stream(PersonalRecords.Kind.values()).map(Enum::name).toList());
    }

    private static List<String> names(Class<?> record) {
        return Arrays.stream(record.getRecordComponents()).map(RecordComponent::getName).toList();
    }

    private static Map<String, Object> schemas() throws IOException {
        try (InputStream in = Files.newInputStream(Path.of("../contracts/openapi.yaml"))) {
            return map(map(new Yaml().<Map<String, Object>>load(in).get("components")).get("schemas"));
        }
    }

    private static Map<String, Object> properties(Map<String, Object> schema) {
        return map(schema.get("properties"));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object node) {
        return (Map<String, Object>) node;
    }
}
