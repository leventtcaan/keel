package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.FileReader;
import java.io.Reader;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * The contract's DayBudget is what the server answers, field for field (K-1017): the day's protein target sits beside the
 * calorie target, so the phone shows "Protein / 114 g" without computing it (U1).
 */
class DayBudgetContractTests {

    @Test
    void theBudgetCarriesTheProteinTargetNextToTheCalorieTargetAndTheContractNamesBoth() throws Exception {
        Map<String, Object> schema = map(map(map(contract().get("components")).get("schemas")).get("DayBudget"));
        List<String> fields = Arrays.stream(MealController.Budget.class.getRecordComponents()).map(RecordComponent::getName).toList();

        assertThat(fields).contains("targetKcal", "targetProteinG");
        assertThat(map(schema.get("properties")).keySet()).containsExactlyInAnyOrderElementsOf(fields);
        assertThat((List<String>) schema.get("required")).containsExactlyInAnyOrderElementsOf(fields);
        assertThat(map(map(schema.get("properties")).get("targetProteinG"))).containsEntry("type", "integer");
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
