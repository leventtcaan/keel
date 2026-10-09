package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Phase;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/**
 * Each rule's short line (K-1000, ADR-077 #3 "two reasons: the data and the rule", Ek 3): the call screen says a reason in
 * one short line, "decision.ruleShort.&lt;rule&gt;", with the numbers the rule read as {placeholders} ({@link ReasonFacts}).
 * The rules are the ones the app already has a sentence for (decision.rule.&lt;rule&gt;, held to the engine's own
 * rules by RuleSentencesTests); a line may use only the facts its rule carries, and stays within the line's word limit
 * (data/copy/word-budgets.json), a word being what the prototype counted: it has a letter, a number or a {placeholder} is none.
 */
class RuleShortLinesTests {

    private static final Path COPY = Path.of("../data/copy/en.json");
    private static final Path BUDGETS = Path.of("../data/copy/word-budgets.json");
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{(\\w+)}");
    private static final Pattern DASH = Pattern.compile("[\\u2012\\u2013\\u2014\\u2015]");

    @Test
    void everyRuleHasAShortLineAndNoOtherDoes() throws IOException {
        assertThat(lines().keySet()).containsExactlyInAnyOrderElementsOf(sentences().keySet());
        assertThat(sentences()).hasSizeGreaterThan(50);
    }

    @Test
    void aLineUsesOnlyTheFactsItsRuleCarries() throws IOException {
        List<String> stray = new ArrayList<>();
        for (Map.Entry<String, String> line : lines().entrySet()) {
            Set<String> allowed = ReasonFacts.keysOf(line.getKey());
            Matcher found = PLACEHOLDER.matcher(line.getValue());
            while (found.find()) {
                if (!allowed.contains(found.group(1))) {
                    stray.add(line.getKey() + " uses {" + found.group(1) + "}, its facts: " + allowed);
                }
            }
        }
        assertThat(stray).isEmpty();
    }

    @Test
    void aLineIsShortAndShorterThanTheRulesSentence() throws IOException {
        int limit = ((Number) budgets().get("ruleShortMaxWords")).intValue();
        List<String> long_ = new ArrayList<>();
        for (Map.Entry<String, String> line : lines().entrySet()) {
            int words = words(line.getValue());
            if (words < 2 || words > limit || words >= words(sentences().get(line.getKey()))) {
                long_.add(line.getKey() + ": " + words + " words (limit " + limit + ", sentence " + words(sentences().get(line.getKey())) + ")");
            }
        }
        assertThat(long_).isEmpty();
    }

    @Test
    void aLineHasNoLongOrMiddleDash() throws IOException {
        assertThat(lines().entrySet().stream().filter(line -> DASH.matcher(line.getValue()).find()).map(Map.Entry::getKey)).isEmpty();
    }

    @Test
    void theFactNamesAreTheOnesTheServerGivesWhenItKeptAllItRead() throws IOException {
        // A call that kept every number, for each rule: what the server gives is what the rule is said to carry (keysOf).
        List<DecisionBasis.WeekMean> weeks = List.of(new DecisionBasis.WeekMean(LocalDate.of(2026, 12, 20), new BigDecimal("82.4")),
                new DecisionBasis.WeekMean(LocalDate.of(2026, 12, 27), new BigDecimal("82.0")));
        DecisionBasis basis = new DecisionBasis(Phase.CUT, weeks, new BigDecimal("-0.4"), null, new DecisionBasis.AdherenceCount(5, 8), null,
                new StoredSnapshot.Training(3, 2, 0, false, false, 4), null, null);
        StoredSnapshot.FirstWeek firstWeek = new StoredSnapshot.FirstWeek(3, 2, 3, List.of(DayOfWeek.WEDNESDAY), null, List.of());
        Map<String, Object> call = Map.of("action", Map.of("type", "ADJUST_CALORIES", "kcalPerDay", -250));

        List<String> differ = new ArrayList<>();
        for (String rule : sentences().keySet()) {
            Set<String> given = new TreeSet<>(ReasonFacts.of(rule, basis, firstWeek, call).keySet());
            if (!given.equals(new TreeSet<>(ReasonFacts.keysOf(rule)))) {
                differ.add(rule + ": gives " + given + ", carries " + ReasonFacts.keysOf(rule));
            }
        }
        assertThat(differ).isEmpty();
    }

    /** A word, as the prototype counted: it has a letter; numbers and {placeholders} are none. */
    static int words(String text) {
        int count = 0;
        for (String token : PLACEHOLDER.matcher(text).replaceAll(" ").trim().split("\\s+")) {
            if (token.chars().anyMatch(Character::isLetter)) {
                count++;
            }
        }
        return count;
    }

    private static Map<String, String> sentences() throws IOException {
        return strings(decision().get("rule"));
    }

    private static Map<String, String> lines() throws IOException {
        return strings(decision().get("ruleShort"));
    }

    private static Map<?, ?> decision() throws IOException {
        return (Map<?, ?>) copy().get("decision");
    }

    private static Map<?, ?> copy() throws IOException {
        return JsonMapper.builder().build().readValue(Files.readString(COPY), Map.class);
    }

    private static Map<?, ?> budgets() throws IOException {
        return JsonMapper.builder().build().readValue(Files.readString(BUDGETS), Map.class);
    }

    private static Map<String, String> strings(Object node) {
        Map<String, String> found = new java.util.TreeMap<>();
        if (node instanceof Map<?, ?> map) {
            map.forEach((key, value) -> found.put(String.valueOf(key), String.valueOf(value)));
        }
        return found;
    }
}
