package app.keel.coach;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * The phrases no text may carry, read from the file the app scans its copy with (data/copy/forbidden-phrases.json): a
 * body-fat number (U4), medical language (U6), a person's name (K-523; a research path aside — the coach never gets one).
 * The rules are case-insensitive; the names spell their case out, as the app reads them.
 */
final class ForbiddenWords {

    private final PatternList rules;
    private final List<String> coachingNonExamples;

    private ForbiddenWords(PatternList rules, List<String> coachingNonExamples) {
        this.rules = rules;
        this.coachingNonExamples = List.copyOf(coachingNonExamples);
    }

    @SuppressWarnings("unchecked")
    static ForbiddenWords fromClasspath() {
        Map<String, Object> file = PatternList.json("data/copy/forbidden-phrases.json");
        List<PatternList.Entry> entries = new ArrayList<>(((List<Map<String, Object>>) file.get("rules")).stream()
                .map(rule -> PatternList.entry(rule, rule.get("rule") + " " + rule.get("id"), Pattern.CASE_INSENSITIVE)).toList());
        Map<String, Object> names = (Map<String, Object>) file.get("personNames");
        entries.add(PatternList.entry(names, "person name", 0, Pattern.compile((String) names.get("researchPath"))));
        return new ForbiddenWords(new PatternList(entries), (List<String>) file.get("coachingNonExamples"));
    }

    List<String> found(String text) {
        return rules.found(text);
    }

    List<String> selfCheck() {
        List<String> problems = new ArrayList<>(rules.selfCheck());
        coachingNonExamples.stream().filter(text -> !rules.found(text).isEmpty()).forEach(text -> problems.add("ordinary copy caught: " + text));
        return problems;
    }

    int size() {
        return rules.size();
    }
}
