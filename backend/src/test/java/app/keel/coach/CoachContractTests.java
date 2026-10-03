package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.FileReader;
import java.io.Reader;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/** The topics the contract lets the app expect are the model's closed list, no more, no fewer (K-529). */
class CoachContractTests {

    @Test
    @SuppressWarnings("unchecked")
    void theContractsTopicsAreTheCoachsTopics() throws Exception {
        Map<String, Object> contract;
        try (Reader in = new FileReader("../contracts/openapi.yaml")) {
            contract = new Yaml().load(in);
        }
        Map<String, Object> answer = (Map<String, Object>) ((Map<String, Object>) ((Map<String, Object>) contract.get("components")).get("schemas"))
                .get("CoachAnswer");
        Map<String, Object> topic = (Map<String, Object>) ((Map<String, Object>) answer.get("properties")).get("topic");
        assertThat((List<String>) topic.get("enum")).containsExactlyElementsOf(Arrays.stream(Topic.values()).map(Enum::name).toList());
    }
}
