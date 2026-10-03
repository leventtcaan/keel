package app.keel.coach;

import app.keel.decision.CallFacts;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Whether the model's classification may be used (K-529, ADR-043 #76; ADR-004: a reply off its schema is dropped): JSON
 * of exactly {@code {"topic"}} or {@code {"topic", "rule"}}, within {@code maxChars}; the topic a {@link Topic} by its
 * exact name; the rule one of the call's own reasons (a rule of the model's making — "null" in quotes too — drops the reply),
 * or none — then the leading one. A topic not about the call names no rule, even when the model named one of the call's.
 * The model writes no words the user sees, so it has nothing to concede with (U2) and no
 * number to make up (U1): what it could add beyond the two fields drops the whole reply.
 */
final class TopicReply {

    /** What the message is about, and which of the call's rules answers it (none when the topic is not about the call). */
    record Classified(Topic topic, String rule) {
    }

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Set<String> FIELDS = Set.of("topic", "rule");

    private final int maxChars;

    TopicReply(int maxChars) {
        this.maxChars = maxChars;
    }

    Optional<Classified> read(String raw, CallFacts call) {
        if (raw.length() > maxChars) {
            return Optional.empty();
        }
        Object parsed;
        try {
            parsed = JSON.readValue(raw, Object.class);
        } catch (JacksonException notJson) {
            return Optional.empty();
        }
        if (!(parsed instanceof Map<?, ?> reply) || !FIELDS.containsAll(reply.keySet()) || !(reply.get("topic") instanceof String name)) {
            return Optional.empty();
        }
        Optional<Topic> topic = topic(name);
        Object rule = reply.get("rule");
        // A rule that is not one of the call's own (a number, a rule of the model's making) drops the reply.
        if (topic.isEmpty() || (rule != null && call.reasons().stream().noneMatch(reason -> reason.rule().equals(rule)))) {
            return Optional.empty();
        }
        if (!topic.get().aboutTheCall()) {
            return Optional.of(new Classified(topic.get(), null));
        }
        String answering = rule != null ? (String) rule : call.reasons().isEmpty() ? null : call.reasons().getFirst().rule();
        return Optional.of(new Classified(topic.get(), answering));
    }

    private static Optional<Topic> topic(String name) {
        for (Topic topic : Topic.values()) {
            if (topic.name().equals(name)) {
                return Optional.of(topic);
            }
        }
        return Optional.empty();
    }
}
