package app.keel.coach;

import app.keel.decision.CallFacts;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Whether the conversational coach's reply may be shown (ADR-092 #2, U1 U2 U4 U6 U7 U10): what keeps the model from deciding
 * anything. The reply is JSON of exactly {@code {"reply", "topic", "numbersUsed"}} and is used only when
 *
 * <ol>
 *   <li>the topic is one of the closed list ({@link Topic});</li>
 *   <li>the reply is some text, within the length the coach allows, with no control characters;</li>
 *   <li>every number it says — digits or words — is one of the facts' (unit and rounding aside), and the model listed it in
 *       {@code numbersUsed}, each of which is itself a fact: a number of the person's own is not the engine's;</li>
 *   <li>no forbidden phrase (the app's list: body fat, medical words, names, quota currency) and none of the reply rules (a
 *       change of the call or a concession, blame, make-up, the coach naming itself, links) is in it.</li>
 * </ol>
 *
 * Anything else — more fields, a different type, a reply that fails one — is not shown: the engine's own sentence is. A topic that
 * is not about the call (HEALTH, OFF_TOPIC) is read but its words are not shown: the app says its own sentence (U6: a doctor
 * comes first). The rule that answers is the call's leading one; the model does not choose it.
 */
final class ReplyValidator {

    /** What may be shown: the model's words (none when the topic is not about the call), the topic and the call's leading rule. */
    record Valid(String reply, Topic topic, String rule) {
    }

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Set<String> FIELDS = Set.of("reply", "topic", "numbersUsed");
    private static final int RAW_FACTOR = 4;

    private final int maxChars;
    private final ForbiddenWords forbidden;
    private final ReplyRules rules;

    ReplyValidator(int maxChars, ForbiddenWords forbidden, ReplyRules rules) {
        this.maxChars = maxChars;
        this.forbidden = forbidden;
        this.rules = rules;
    }

    Optional<Valid> read(String raw, CallFacts call, CoachFacts facts) {
        return problems(raw, call, facts).isEmpty() ? parse(raw, call) : Optional.empty();
    }

    /** What is wrong with the reply, by name (none: it may be shown). For the tests and the evaluation set. */
    List<String> problems(String raw, CallFacts call, CoachFacts facts) {
        List<String> problems = new ArrayList<>();
        if (raw.length() > maxChars * RAW_FACTOR) {
            return List.of("too-long");
        }
        Object parsed;
        try {
            parsed = JSON.readValue(raw, Object.class);
        } catch (JacksonException notJson) {
            return List.of("not-json");
        }
        if (!(parsed instanceof Map<?, ?> reply) || !reply.keySet().equals(FIELDS) || !(reply.get("reply") instanceof String text)
                || !(reply.get("topic") instanceof String name) || !(reply.get("numbersUsed") instanceof List<?> listed)) {
            return List.of("off-schema");
        }
        if (topic(name).isEmpty()) {
            problems.add("unknown-topic");
        }
        if (text.isBlank() || text.length() > maxChars || text.chars().anyMatch(ch -> Character.isISOControl(ch) && ch != '\n')) {
            problems.add("length-or-characters");
        }
        List<BigDecimal> used = new ArrayList<>();
        for (Object number : listed) {
            if (!(number instanceof Number value) || value instanceof Double d && (d.isNaN() || d.isInfinite())) {
                return List.of("off-schema");
            }
            used.add(new BigDecimal(value.toString()));
        }
        problems.addAll(numberProblems(text, used, facts));
        forbidden.found(text).forEach(id -> problems.add("forbidden:" + id));
        rules.found(text).forEach(id -> problems.add("rule:" + id));
        return problems;
    }

    private static List<String> numberProblems(String text, List<BigDecimal> used, CoachFacts facts) {
        List<String> problems = new ArrayList<>();
        for (ReplyNumbers.Said said : ReplyNumbers.in(text)) {
            if (facts.numbers().stream().noneMatch(fact -> ReplyNumbers.matches(said, fact))) {
                problems.add("number-not-a-fact:" + said.value().toPlainString());
            } else if (used.stream().noneMatch(listed -> ReplyNumbers.listed(said, listed))) {
                problems.add("number-not-listed:" + said.value().toPlainString());
            }
        }
        // A number the model lists is a fact too, whether the reply says it or not.
        for (BigDecimal listed : used) {
            // As a percent too: 50 listed for the fraction 0.5, which the reply writes "50%".
            if (facts.numbers().stream().noneMatch(fact -> ReplyNumbers.matches(new ReplyNumbers.Said(listed, false), fact)
                    || ReplyNumbers.matches(new ReplyNumbers.Said(listed, true), fact))) {
                problems.add("listed-not-a-fact:" + listed.toPlainString());
            }
        }
        return problems;
    }

    private static Optional<Valid> parse(String raw, CallFacts call) {
        Map<?, ?> reply = JSON.readValue(raw, Map.class);
        Topic topic = topic((String) reply.get("topic")).orElseThrow();
        if (!topic.aboutTheCall()) {
            return Optional.of(new Valid(null, topic, null));
        }
        String rule = call.reasons().isEmpty() ? null : call.reasons().getFirst().rule();
        return Optional.of(new Valid(((String) reply.get("reply")).strip(), topic, rule));
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
