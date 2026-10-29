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
        // Absent in some weeks (the words), once the first call is made (its day) and once a call has read the scale (the
        // weigh-in week, ADR-089): the rest always there.
        assertThat((List<String>) schema.get("required")).containsExactlyInAnyOrderElementsOf(
                fields.stream().filter(field -> !List.of("contentKey", "firstCallOn", "weighInWeek").contains(field)).toList());
        assertThat(map(map(schema.get("properties")).get("firstCallOn"))).containsEntry("type", "string").containsEntry("format", "date");
        assertThat(FirstWeeksController.FirstWeeksView.class.getRecordComponents()).filteredOn(c -> c.getName().equals("firstCallOn"))
                .singleElement().satisfies(c -> assertThat(c.getType()).isEqualTo(LocalDate.class));
        Map<String, Object> reason = map(map(map(contract().get("components")).get("schemas")).get("Reason"));
        // The signals' fields, and the facts a call's reason carries (K-1000): the first-weeks signal names a rule, not a call's numbers.
        assertThat(map(reason.get("properties")).keySet()).containsExactlyInAnyOrderElementsOf(
                java.util.stream.Stream.concat(Arrays.stream(FirstWeeksController.SignalView.class.getRecordComponents()).map(RecordComponent::getName),
                        java.util.stream.Stream.of("facts")).toList());
    }

    @Test
    @SuppressWarnings("unchecked")
    void theWeighInWeekIsTheContractsSchemaFieldForFieldWithDatesAsDates() throws Exception {
        // ADR-089 #1: the block, its weighed days and the number it needs; the date the call can read the data only when short.
        Map<String, Object> schemas = map(map(contract().get("components")).get("schemas"));
        Map<String, Object> schema = map(schemas.get("WeighInWeek"));
        Map<String, Object> properties = map(schema.get("properties"));

        assertThat(map(map(schemas.get("FirstWeeks")).get("properties")).get("weighInWeek")).isEqualTo(Map.of("$ref", "#/components/schemas/WeighInWeek"));
        assertThat(properties.keySet()).containsExactlyInAnyOrderElementsOf(
                Arrays.stream(FirstWeeksController.WeighInWeekView.class.getRecordComponents()).map(RecordComponent::getName).toList());
        assertThat((List<String>) schema.get("required")).containsExactlyInAnyOrder("from", "to", "weighedDays", "needed");
        for (String day : List.of("from", "to", "callsFrom")) {
            assertThat(map(properties.get(day))).as(day).containsEntry("type", "string").containsEntry("format", "date");
        }
        assertThat(map(map(properties.get("weighedDays")).get("items"))).containsEntry("type", "string").containsEntry("format", "date");
        assertThat(map(properties.get("needed"))).containsEntry("type", "integer");
        assertThat(Arrays.stream(FirstWeeksController.WeighInWeekView.class.getRecordComponents()).filter(c -> !c.getName().equals("needed")
                && !c.getName().equals("weighedDays")).map(RecordComponent::getType)).containsOnly(LocalDate.class);
    }

    @Test
    void aCallsChangeIsOneOfTheKindsTheServerSaysWithTheFieldsItWrites() throws Exception {
        // K-1000, K-1009: a plan target (calories, steps, phase) or a move's target held; each value in the field of its kind.
        Map<String, Object> schemas = map(map(contract().get("components")).get("schemas"));
        Map<String, Object> change = map(schemas.get("DecisionChange"));
        Map<String, Object> value = map(schemas.get("ChangeValue"));
        Map<String, Object> target = map(schemas.get("MoveTarget"));

        assertThat((List<String>) map(map(change.get("properties")).get("what")).get("enum")).containsExactlyElementsOf(CallChanges.kinds());
        assertThat(map(change.get("properties")).keySet()).containsExactlyInAnyOrder("what", "before", "after", "inForce", "exerciseId", "held");
        assertThat((List<String>) change.get("required")).as("a move's id and held are only on its kind").containsExactlyInAnyOrder("what", "before", "after");
        assertThat(map(value.get("properties")).keySet()).containsExactlyInAnyOrder("targetKcal", "stepsPerDay", "phase", "target");
        assertThat(map(map(value.get("properties")).get("target"))).containsEntry("$ref", "#/components/schemas/MoveTarget");
        List<String> fields = Arrays.stream(app.keel.training.HeldMove.Target.class.getRecordComponents()).map(RecordComponent::getName).toList();
        assertThat(map(target.get("properties")).keySet()).containsExactlyInAnyOrderElementsOf(fields);
        assertThat((List<String>) target.get("required")).containsExactlyInAnyOrderElementsOf(fields);
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
