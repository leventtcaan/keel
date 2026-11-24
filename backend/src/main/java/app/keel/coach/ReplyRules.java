package app.keel.coach;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * What a reply of the conversational coach may never say, beyond the app's forbidden phrases (ADR-092 #2): data/coach/reply-rules.json
 * — a change of the call or a concession (U1, U2), medical words in Turkish (U6), blame and make-up (U7), the coach naming itself
 * or its provider (U10), links and markup. Words as data (K2), each rule with its examples and near-misses.
 */
final class ReplyRules {

    private final PatternList rules;

    private ReplyRules(PatternList rules) {
        this.rules = rules;
    }

    @SuppressWarnings("unchecked")
    static ReplyRules fromClasspath() {
        Map<String, Object> file = PatternList.json("data/coach/reply-rules.json");
        List<PatternList.Entry> entries = new ArrayList<>(((List<Map<String, Object>>) file.get("rules")).stream()
                .map(rule -> PatternList.entry(rule, (String) rule.get("id"), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE)).toList());
        return new ReplyRules(new PatternList(entries));
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
