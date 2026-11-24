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
    private final int historyDays;
    private final int historyTurnsInPrompt;
    private final int historyPage;
    private final int memoryMaxItems;
    private final int memoryMaxChars;
    private final int freeTrialQuestions;
    private final BigDecimal monthlyCapPerAccountUsd;

    CoachLimits(BigDecimal monthlyBudgetUsd, BigDecimal unpricedCallCostUsd) {
        this(monthlyBudgetUsd, unpricedCallCostUsd, 30, 6, 50, 10, 200, 3, new BigDecimal("2"));
    }

    CoachLimits(BigDecimal monthlyBudgetUsd, BigDecimal unpricedCallCostUsd, int historyDays, int historyTurnsInPrompt, int historyPage, int memoryMaxItems,
            int memoryMaxChars) {
        this(monthlyBudgetUsd, unpricedCallCostUsd, historyDays, historyTurnsInPrompt, historyPage, memoryMaxItems, memoryMaxChars, 3, new BigDecimal("2"));
    }

    CoachLimits(BigDecimal monthlyBudgetUsd, BigDecimal unpricedCallCostUsd, int historyDays, int historyTurnsInPrompt, int historyPage, int memoryMaxItems,
            int memoryMaxChars, int freeTrialQuestions, BigDecimal monthlyCapPerAccountUsd) {
        if (monthlyCapPerAccountUsd.signum() <= 0) {
            throw new IllegalStateException("coach.yaml: the cap per account is more than zero");
        }
        this.monthlyCapPerAccountUsd = monthlyCapPerAccountUsd;
        if (monthlyBudgetUsd.signum() <= 0 || unpricedCallCostUsd.signum() <= 0) {
            throw new IllegalStateException("coach.yaml: the budget and the unpriced call's cost are more than zero");
        }
        if (historyDays < 1 || historyTurnsInPrompt < 1 || historyPage < 1 || memoryMaxItems < 1 || memoryMaxChars < 1 || freeTrialQuestions < 0) {
            throw new IllegalStateException("coach.yaml: the history and memory limits are whole numbers of at least 1");
        }
        this.monthlyBudgetUsd = monthlyBudgetUsd;
        this.unpricedCallCostUsd = unpricedCallCostUsd;
        this.historyDays = historyDays;
        this.historyTurnsInPrompt = historyTurnsInPrompt;
        this.historyPage = historyPage;
        this.memoryMaxItems = memoryMaxItems;
        this.memoryMaxChars = memoryMaxChars;
        this.freeTrialQuestions = freeTrialQuestions;
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
        return new CoachLimits(number(parameters, "coach_monthly_budget_usd"), number(parameters, "coach_unpriced_call_cost_usd"),
                whole(parameters, "coach_history_days"), whole(parameters, "coach_history_turns_in_prompt"), whole(parameters, "coach_history_page"),
                whole(parameters, "coach_memory_max_items"), whole(parameters, "coach_memory_max_chars"), whole(parameters, "coach_free_trial_questions"), number(parameters, "coach_monthly_cap_per_account_usd"));
    }

    private static int whole(List<Map<String, Object>> parameters, String key) {
        return parameters.stream().filter(parameter -> key.equals(parameter.get("key"))).map(parameter -> parameter.get("value"))
                .filter(value -> value instanceof Integer).map(Integer.class::cast).findFirst()
                .orElseThrow(() -> new IllegalStateException("coach.yaml: " + key + " is missing or not a whole number"));
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

    /** How many days a conversation is kept (ADR-092 #3). */
    int historyDays() {
        return historyDays;
    }

    /** How many of the last messages go to the model with a question. */
    int historyTurnsInPrompt() {
        return historyTurnsInPrompt;
    }

    /** The most messages one read of the history returns. */
    int historyPage() {
        return historyPage;
    }

    /** The most things the coach is asked to remember about a person. */
    int memoryMaxItems() {
        return memoryMaxItems;
    }

    /** The longest one of them. */
    int memoryMaxChars() {
        return memoryMaxChars;
    }

    /** The most one account's questions may cost in a month, beside the budget for everyone. */
    BigDecimal monthlyCapPerAccountUsd() {
        return monthlyCapPerAccountUsd;
    }

    /** The questions an account may ask the coach without a subscription, once in its life (0: none). */
    int freeTrialQuestions() {
        return freeTrialQuestions;
    }

    /** What a call counts as while the provider's prices are not known. */
    BigDecimal unpricedCallCostUsd() {
        return unpricedCallCostUsd;
    }
}
