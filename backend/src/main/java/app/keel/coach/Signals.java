package app.keel.coach;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * A list of patterns read from a data file (K2) with the examples each must catch and the near-misses it must let through:
 * data/coach/health-signals.json (health, injury, medication and eating-disorder words in a question or in what the coach was asked to
 * remember: the engine's own safe sentence, nothing sent, U6) and data/coach/injection-signals.json (words that try to give the coach
 * orders). Checked in the server before anything goes to the provider (ADR-092 #2); English and Turkish.
 */
final class Signals {

    private final PatternList rules;

    private Signals(PatternList rules) {
        this.rules = rules;
    }

    @SuppressWarnings("unchecked")
    static Signals fromClasspath(String resource) {
        Map<String, Object> file = PatternList.json(resource);
        List<PatternList.Entry> entries = new ArrayList<>(((List<Map<String, Object>>) file.get("rules")).stream()
                .map(rule -> PatternList.entry(rule, (String) rule.get("id"), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.UNICODE_CHARACTER_CLASS)).toList());
        return new Signals(new PatternList(entries));
    }

    static Signals health() {
        return fromClasspath("data/coach/health-signals.json");
    }

    static Signals injection() {
        return fromClasspath("data/coach/injection-signals.json");
    }

    /** The ids of the rules the text breaks. */
    List<String> found(String text) {
        return rules.found(text);
    }

    List<String> selfCheck() {
        return rules.selfCheck();
    }

    int size() {
        return rules.size();
    }
}
