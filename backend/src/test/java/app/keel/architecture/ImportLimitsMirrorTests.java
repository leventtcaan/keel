package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;
import tools.jackson.databind.json.JsonMapper;

/**
 * How many sessions one import request carries (K-615, ADR-053) is one number in three places: the contract's
 * WorkoutImport maxItems, the server's keel.training.import.max-workouts and the phone's import_workouts_per_request.
 * A phone sending more than the server takes would have every chunk refused; one sending fewer is merely slow — both
 * are caught here. Likewise the sets of a session.
 */
class ImportLimitsMirrorTests {

    @Test
    @SuppressWarnings("unchecked")
    void theContractTheServerAndThePhoneAgree() throws IOException {
        Map<String, Object> schemas = (Map<String, Object>) ((Map<String, Object>) yaml(Path.of("../contracts/openapi.yaml")).get("components"))
                .get("schemas");
        Map<String, Object> workouts = property(schemas, "WorkoutImport", "workouts");
        Map<String, Object> sets = property(schemas, "ImportedWorkout", "sets");
        Map<String, Object> server = (Map<String, Object>) ((Map<String, Object>) ((Map<String, Object>) yaml(
                Path.of("src/main/resources/application.yml")).get("keel")).get("training")).get("import");
        List<Map<String, Object>> phone = (List<Map<String, Object>>) JsonMapper.builder().build()
                .readValue(Files.readString(Path.of("../data/parameters/import.json")), Map.class).get("parameters");
        Object perRequest = phone.stream().filter(p -> "import_workouts_per_request".equals(p.get("key"))).findFirst().orElseThrow().get("value");
        Object perSession = phone.stream().filter(p -> "import_sets_per_session_max".equals(p.get("key"))).findFirst().orElseThrow().get("value");

        assertThat(workouts.get("maxItems")).as("contract").isEqualTo(server.get("max-workouts")).isEqualTo(perRequest);
        assertThat(sets.get("maxItems")).as("contract").isEqualTo(server.get("max-sets")).isEqualTo(perSession);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> property(Map<String, Object> schemas, String schema, String name) {
        return (Map<String, Object>) ((Map<String, Object>) ((Map<String, Object>) schemas.get(schema)).get("properties")).get(name);
    }

    private static Map<String, Object> yaml(Path file) throws IOException {
        try (Reader reader = Files.newBufferedReader(file)) {
            return new Yaml().load(reader);
        }
    }
}
