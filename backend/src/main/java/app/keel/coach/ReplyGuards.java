package app.keel.coach;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/** What a coach's reply may never do — claim to change, soften or skip the call (data/coach/guards.json; K-505, U2). */
final class ReplyGuards {

    private final PatternList concessions;

    private ReplyGuards(PatternList concessions) {
        this.concessions = concessions;
    }

    @SuppressWarnings("unchecked")
    static ReplyGuards fromClasspath() {
        List<Map<String, Object>> raw = (List<Map<String, Object>>) PatternList.json("data/coach/guards.json").get("concessions");
        return new ReplyGuards(new PatternList(raw.stream()
                .map(entry -> PatternList.entry(entry, (String) entry.get("id"), Pattern.CASE_INSENSITIVE)).toList()));
    }

    List<String> found(String text) {
        return concessions.found(text);
    }

    List<String> selfCheck() {
        return concessions.selfCheck();
    }

    int size() {
        return concessions.size();
    }
}
