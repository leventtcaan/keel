package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.FileReader;
import java.io.Reader;
import java.lang.reflect.RecordComponent;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.yaml.snakeyaml.Yaml;

/**
 * The contract's Application is the call's own states, no more, no fewer, and "Keep last week's plan" is an operation the
 * server answers (K-963, ADR-077 #3).
 */
class DecisionContractTests {

    @Test
    void theContractsApplicationStatesAreTheCallsStates() throws Exception {
        Map<String, Object> application = map(map(map(contract().get("components")).get("schemas")).get("Application"));
        Map<String, Object> state = map(map(application.get("properties")).get("state"));

        assertThat((List<String>) state.get("enum")).containsExactlyElementsOf(Arrays.stream(CallStore.Application.values()).map(Enum::name).toList());
        assertThat(map(application.get("properties"))).containsKey("declinedAt");
    }

    @Test
    void declineIsAPostThatAnswersTheTargetsAndTheServerHasIt() throws Exception {
        Map<String, Object> decline = map(map(map(contract().get("paths")).get("/v1/decisions/{id}/decline")).get("post"));

        assertThat(decline).containsEntry("operationId", "declineDecision");
        Map<String, Object> ok = map(map(decline.get("responses")).get("200"));
        assertThat(map(map(map(ok.get("content")).get("application/json")).get("schema"))).containsEntry("$ref", "#/components/schemas/Targets");
        assertThat(Arrays.stream(DecisionController.class.getDeclaredMethods())
                .map(method -> method.getAnnotation(PostMapping.class)).filter(mapping -> mapping != null)
                .flatMap(mapping -> Arrays.stream(mapping.value())))
                .contains("/v1/decisions/{id}/decline");
    }

    @Test
    void theStartingTargetIsAGetTheServerAnswersFieldForField() throws Exception {
        // K-989: the plan-ready screen's food row, read before the first call.
        Map<String, Object> starting = map(map(map(contract().get("paths")).get("/v1/targets/starting")).get("get"));

        assertThat(starting).containsEntry("operationId", "getStartingTarget");
        Map<String, Object> ok = map(map(starting.get("responses")).get("200"));
        assertThat(map(map(map(ok.get("content")).get("application/json")).get("schema")))
                .containsEntry("$ref", "#/components/schemas/StartingTarget");
        assertThat(Arrays.stream(DecisionController.class.getDeclaredMethods())
                .map(method -> method.getAnnotation(GetMapping.class)).filter(mapping -> mapping != null)
                .flatMap(mapping -> Arrays.stream(mapping.value())))
                .contains("/v1/targets/starting");
        Map<String, Object> schema = map(map(map(contract().get("components")).get("schemas")).get("StartingTarget"));
        List<String> fields = Arrays.stream(StartingTarget.class.getRecordComponents()).map(RecordComponent::getName).toList();
        assertThat(map(schema.get("properties")).keySet()).containsExactlyInAnyOrderElementsOf(fields);
        assertThat((List<String>) schema.get("required")).containsExactlyInAnyOrderElementsOf(fields);
        assertThat(Arrays.stream(StartingTarget.Range.class.getRecordComponents()).map(RecordComponent::getName))
                .as("the maintenance estimate is the contract's KcalRange (U5)").containsExactly("low", "high");
    }

    @Test
    void theFirstWeeksAreAGetTheServerAnswersFieldForFieldWithTheFirstCallsDayAsADate() throws Exception {
        // K-990 (ADR-077 Ek 2): the first call's day the plan, the paywall and #ob-preparing name comes from here.
        Map<String, Object> firstWeeks = map(map(map(contract().get("paths")).get("/v1/first-weeks")).get("get"));

        assertThat(firstWeeks).containsEntry("operationId", "getFirstWeeks");
        Map<String, Object> ok = map(map(firstWeeks.get("responses")).get("200"));
        assertThat(map(map(map(ok.get("content")).get("application/json")).get("schema"))).containsEntry("$ref", "#/components/schemas/FirstWeeks");
        assertThat(Arrays.stream(FirstWeeksController.class.getDeclaredMethods())
                .map(method -> method.getAnnotation(GetMapping.class)).filter(mapping -> mapping != null)
                .flatMap(mapping -> Arrays.stream(mapping.value())))
                .contains("/v1/first-weeks");
        Map<String, Object> schema = map(map(map(contract().get("components")).get("schemas")).get("FirstWeeks"));
        List<String> fields = Arrays.stream(FirstWeeksController.FirstWeeksView.class.getRecordComponents()).map(RecordComponent::getName).toList();
        assertThat(map(schema.get("properties")).keySet()).containsExactlyInAnyOrderElementsOf(fields);
        // Absent in some weeks (the words) and once the first call is made (its day): the rest always there.
        assertThat((List<String>) schema.get("required")).containsExactlyInAnyOrderElementsOf(
                fields.stream().filter(field -> !List.of("contentKey", "firstCallOn").contains(field)).toList());
        assertThat(map(map(schema.get("properties")).get("firstCallOn"))).containsEntry("type", "string").containsEntry("format", "date");
        assertThat(FirstWeeksController.FirstWeeksView.class.getRecordComponents()).filteredOn(c -> c.getName().equals("firstCallOn"))
                .singleElement().satisfies(c -> assertThat(c.getType()).isEqualTo(LocalDate.class));
        Map<String, Object> reason = map(map(map(contract().get("components")).get("schemas")).get("Reason"));
        // The signals' fields, and the facts a call's reason carries (K-1000): the first-weeks signal names a rule, not a call's numbers.
        assertThat(map(reason.get("properties")).keySet()).containsExactlyInAnyOrderElementsOf(
                java.util.stream.Stream.concat(Arrays.stream(FirstWeeksController.SignalView.class.getRecordComponents()).map(RecordComponent::getName),
                        java.util.stream.Stream.of("facts")).toList());
    }

    private static Map<String, Object> contract() throws Exception {
        try (Reader in = new FileReader("../contracts/openapi.yaml")) {
            return new Yaml().load(in);
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object node) {
        return (Map<String, Object>) node;
    }
}
