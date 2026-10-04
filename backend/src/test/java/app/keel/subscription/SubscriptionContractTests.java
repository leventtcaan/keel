package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.FileReader;
import java.io.Reader;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/** The states the contract lets the app expect are the server's, no more, no fewer (K-705, ADR-056 addendum 1). */
class SubscriptionContractTests {

    @Test
    @SuppressWarnings("unchecked")
    void theContractsStatusesAreTheStatesStatuses() throws Exception {
        Map<String, Object> contract;
        try (Reader in = new FileReader("../contracts/openapi.yaml")) {
            contract = new Yaml().load(in);
        }
        Map<String, Object> subscription = (Map<String, Object>) ((Map<String, Object>) ((Map<String, Object>) contract.get("components"))
                .get("schemas")).get("Subscription");
        Map<String, Object> status = (Map<String, Object>) ((Map<String, Object>) subscription.get("properties")).get("status");
        assertThat((List<String>) status.get("enum"))
                .containsExactlyElementsOf(Arrays.stream(SubscriptionState.Status.values()).map(Enum::name).toList());
    }
}
