package app.keel.measurement;

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

/** What GET /v1/weigh-ins/summary sends is the contract's WeighInSummary field for field (K-1018). */
class WeightSummaryContractTests {

    @Test
    @SuppressWarnings("unchecked")
    void theSummaryIsTheContractsSchemaFieldForField() throws IOException {
        Map<String, Object> contract = contract();
        Map<String, Object> schema = map(map(map(contract.get("components")).get("schemas")).get("WeighInSummary"));

        assertThat(map(schema.get("properties")).keySet()).containsExactlyInAnyOrderElementsOf(
                Arrays.stream(WeightSummary.class.getRecordComponents()).map(RecordComponent::getName).toList());
        // `last` is the only field that can be absent (U3: nothing is made up before the first weigh-in).
        assertThat((List<String>) schema.get("required")).containsExactlyInAnyOrder("weighInCount", "trendMinWeighIns", "trendReady");
        assertThat(map(map(schema.get("properties")).get("last")).get("$ref")).isEqualTo("#/components/schemas/WeighIn");
    }

    @Test
    void theRouteIsAGetWithTheSchemaAsItsAnswer() throws IOException {
        Map<String, Object> get = map(map(map(contract().get("paths")).get("/v1/weigh-ins/summary")).get("get"));

        assertThat(get.get("operationId")).isEqualTo("getWeighInSummary");
        Map<String, Object> ok = map(map(map(map(get.get("responses")).get("200")).get("content")).get("application/json"));
        assertThat(map(ok.get("schema")).get("$ref")).isEqualTo("#/components/schemas/WeighInSummary");
    }

    private static Map<String, Object> contract() throws IOException {
        try (InputStream in = Files.newInputStream(Path.of("../contracts/openapi.yaml"))) {
            return new Yaml().load(in);
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object node) {
        return (Map<String, Object>) node;
    }
}
