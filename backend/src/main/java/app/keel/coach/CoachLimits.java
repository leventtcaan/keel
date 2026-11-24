package app.keel.coach;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;

/**
 * The coach's product limits (ADR-092, K2): data/parameters/coach.yaml — a product decision (tag urun), not an engine rule,
 * read as the daily limits are (QuotaLimits). A limit that is missing or not above zero stops the server from starting.
 */
final class CoachLimits {

    private final BigDecimal monthlyBudgetUsd;
    private final BigDecimal unpricedCallCostUsd;

    CoachLimits(BigDecimal monthlyBudgetUsd, BigDecimal unpricedCallCostUsd) {
        if (monthlyBudgetUsd.signum() <= 0 || unpricedCallCostUsd.signum() <= 0) {
            throw new IllegalStateException("coach.yaml: the budget and the unpriced call's cost are more than zero");
        }
        this.monthlyBudgetUsd = monthlyBudgetUsd;
        this.unpricedCallCostUsd = unpricedCallCostUsd;
    }

    static CoachLimits fromClasspath() {
        try (InputStream in = new ClassPathResource("data/parameters/coach.yaml").getInputStream()) {
            return fromYaml(in);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @SuppressWarnings("unchecked")
    static CoachLimits fromYaml(InputStream in) {
        LoaderOptions strict = new LoaderOptions();
        strict.setAllowDuplicateKeys(false);
        List<Map<String, Object>> parameters = (List<Map<String, Object>>) ((Map<String, Object>) new Yaml(strict).load(in)).get("parameters");
        return new CoachLimits(number(parameters, "coach_monthly_budget_usd"), number(parameters, "coach_unpriced_call_cost_usd"));
    }

    private static BigDecimal number(List<Map<String, Object>> parameters, String key) {
        return parameters.stream().filter(parameter -> key.equals(parameter.get("key"))).map(parameter -> parameter.get("value"))
                .filter(value -> value instanceof Number).map(value -> new BigDecimal(value.toString())).findFirst()
                .orElseThrow(() -> new IllegalStateException("coach.yaml: " + key + " is missing or not a number"));
    }

    /** The most the model may cost in a month, for everyone. */
    BigDecimal monthlyBudgetUsd() {
        return monthlyBudgetUsd;
    }

    /** What a call counts as while the provider's prices are not known. */
    BigDecimal unpricedCallCostUsd() {
        return unpricedCallCostUsd;
    }
}
