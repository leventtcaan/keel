package app.keel.coach;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * What a coach's reply may never do (data/coach/guards.json; K-505, U1, U2): give in to an objection (concessions), say
 * the call as other than it is (contradictions, by the call's kind), or write a number in words.
 */
final class ReplyGuards {

    private final PatternList concessions;
    private final Map<String, PatternList> contradictions;
    private final PatternList numberWords;

    private ReplyGuards(PatternList concessions, Map<String, PatternList> contradictions, PatternList numberWords) {
        this.concessions = concessions;
        this.contradictions = contradictions;
        this.numberWords = numberWords;
    }

    @SuppressWarnings("unchecked")
    static ReplyGuards fromClasspath() {
        Map<String, Object> file = PatternList.json("data/coach/guards.json");
        List<Map<String, Object>> concessions = (List<Map<String, Object>>) file.get("concessions");
        List<Map<String, Object>> contradictions = (List<Map<String, Object>>) file.get("contradictions");
        Map<String, PatternList> byKind = new java.util.HashMap<>();
        for (Map<String, Object> contradiction : contradictions) {
            PatternList.Entry entry = PatternList.entry(contradiction, (String) contradiction.get("id"), Pattern.CASE_INSENSITIVE);
            for (String kind : (List<String>) contradiction.get("actions")) {
                byKind.merge(kind, new PatternList(List.of(entry)), (one, other) -> one.with(other));
            }
        }
        return new ReplyGuards(new PatternList(concessions.stream()
                .map(entry -> PatternList.entry(entry, (String) entry.get("id"), Pattern.CASE_INSENSITIVE)).toList()), Map.copyOf(byKind),
                new PatternList(List.of(PatternList.entry((Map<String, Object>) file.get("numberWords"), "number words", Pattern.CASE_INSENSITIVE))));
    }

    /** A call's kind as the contradictions name it: its type, and for a change of phase, where to (CHANGE_PHASE:CUT). */
    static String kind(Map<String, Object> action) {
        Object to = action.get("to");
        return to == null ? String.valueOf(action.get("type")) : action.get("type") + ":" + to;
    }

    /** The guards the text breaks for a call of this kind. */
    List<String> found(String text, Map<String, Object> action) {
        List<String> found = new java.util.ArrayList<>(concessions.found(text));
        found.addAll(contradictions.getOrDefault(kind(action), new PatternList(List.of())).found(text));
        found.addAll(numberWords.found(text));
        return found;
    }

    List<String> selfCheck() {
        List<String> problems = new java.util.ArrayList<>(concessions.selfCheck());
        contradictions.values().stream().distinct().forEach(list -> problems.addAll(list.selfCheck()));
        problems.addAll(numberWords.selfCheck());
        return problems.stream().distinct().toList();
    }

    int size() {
        return concessions.size();
    }

    /** Every kind of call a contradiction names. */
    java.util.Set<String> kinds() {
        return contradictions.keySet();
    }
}
