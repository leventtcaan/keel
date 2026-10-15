package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.training.ReturnAnswers;
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

/** What /v1/return sends and takes is the contract's ReturnSummary, ReturnAnswer and their enums, value for value (K-1020). */
class ReturnContractTests {

    @Test
    @SuppressWarnings("unchecked")
    void theSummaryIsTheContractsSchemaFieldForField() throws IOException {
        Map<String, Object> schema = schema("ReturnSummary");

        assertThat(map(schema.get("properties")).keySet()).containsExactlyInAnyOrderElementsOf(
                Arrays.stream(ReturnService.View.class.getRecordComponents()).map(RecordComponent::getName).toList());
        // Nothing here is absent: no log is zero days and not asked, and a day for the next call is always named.
        assertThat((List<String>) schema.get("required")).containsExactlyInAnyOrder("awayDays", "shouldPrompt", "suggested", "nextCallOn");
    }

    @Test
    void theAnswerIsTheContractsSchemaFieldForField() throws IOException {
        assertThat(map(schema("ReturnAnswer").get("properties")).keySet()).containsExactlyInAnyOrderElementsOf(
                Arrays.stream(ReturnController.Answer.class.getRecordComponents()).map(RecordComponent::getName).toList());
    }

    @Test
    @SuppressWarnings("unchecked")
    void theChoicesAndTheSuggestionAreTheContractsValues() throws IOException {
        assertThat((List<String>) schema("ReturnChoice").get("enum")).containsExactlyInAnyOrderElementsOf(
                Arrays.stream(ReturnAnswers.Choice.values()).map(Enum::name).toList());
        assertThat((List<String>) schema("ReturnSuggestion").get("enum")).containsExactlyInAnyOrderElementsOf(
                Arrays.stream(ReturnGap.Suggestion.values()).map(Enum::name).toList());
        // The first two are the ones offered first; the third is always there (ADR-077 #5).
        assertThat((List<String>) schema("ReturnSuggestion").get("enum")).isSubsetOf((List<String>) schema("ReturnChoice").get("enum"));
    }

    @Test
    void theRoutesAreAGetAndAPostWithTheSummaryAsTheirAnswer() throws IOException {
        Map<String, Object> path = map(map(contract().get("paths")).get("/v1/return"));

        assertThat(map(path.get("get")).get("operationId")).isEqualTo("getReturn");
        assertThat(map(path.get("post")).get("operationId")).isEqualTo("answerReturn");
        for (String method : List.of("get", "post")) {
            Map<String, Object> ok = map(map(map(map(map(path.get(method)).get("responses")).get("200")).get("content")).get("application/json"));
            assertThat(map(ok.get("schema")).get("$ref")).as(method).isEqualTo("#/components/schemas/ReturnSummary");
        }
        Map<String, Object> body = map(map(map(map(path.get("post")).get("requestBody")).get("content")).get("application/json"));
        assertThat(map(body.get("schema")).get("$ref")).isEqualTo("#/components/schemas/ReturnAnswer");
    }

    private static Map<String, Object> schema(String name) throws IOException {
        return map(map(map(contract().get("components")).get("schemas")).get(name));
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
