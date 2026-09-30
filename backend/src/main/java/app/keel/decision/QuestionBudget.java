package app.keel.decision;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;

/**
 * The week's question budget (K-213, U9): data/parameters/quota.yaml — a product limit, not an engine rule, so it is
 * not in the engine's parameter set (U14). Read once; a missing key stops the application.
 */
@Component
class QuestionBudget {

    private final int normal;
    private final int anomaly;

    QuestionBudget() throws IOException {
        LoaderOptions strict = new LoaderOptions();
        strict.setAllowDuplicateKeys(false);
        try (InputStream in = new ClassPathResource("data/parameters/quota.yaml").getInputStream()) {
            Map<String, Object> document = new Yaml(strict).load(in);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parameters = (List<Map<String, Object>>) document.get("parameters");
            this.normal = whole(parameters, "question_budget_per_week");
            this.anomaly = whole(parameters, "question_budget_per_week_anomaly");
        }
    }

    int forWeek(boolean dataDisagrees) {
        return dataDisagrees ? anomaly : normal;
    }

    private static int whole(List<Map<String, Object>> parameters, String key) {
        return parameters.stream().filter(parameter -> key.equals(parameter.get("key"))).map(parameter -> parameter.get("value"))
                .filter(Integer.class::isInstance).map(Integer.class::cast).findFirst()
                .orElseThrow(() -> new IllegalStateException("quota.yaml: " + key + " is missing or not a whole number"));
    }
}
