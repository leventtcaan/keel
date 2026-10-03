package app.keel.decision;

import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Contract Source: what kind of source a rule rests on, and nothing of where it is written down (K-523, ADR-041 #72).
 * The research path is internal — kept with the call on the server for audit, never sent: it is no business of the app
 * and may hold a person's name.
 */
record SourceView(SourceTag tag) {

    static SourceView of(Source source) {
        return new SourceView(source.tag());
    }

    /** A kept call ({@link DecisionJson#of}) as sent: each reason's source its kind only. */
    @SuppressWarnings("unchecked")
    static Map<String, Object> sent(Map<String, Object> kept) {
        Map<String, Object> call = new LinkedHashMap<>(kept);
        List<Map<String, Object>> reasons = (List<Map<String, Object>>) kept.get("reasons");
        if (reasons != null) {
            call.put("reasons", reasons.stream().map(reason -> {
                Map<String, Object> sentReason = new LinkedHashMap<>(reason);
                sentReason.put("source", Map.of("tag", ((Map<String, Object>) reason.get("source")).get("tag")));
                return sentReason;
            }).toList());
        }
        return call;
    }
}
