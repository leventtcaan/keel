package app.keel.coach;

import app.keel.decision.CallFacts;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import tools.jackson.databind.json.JsonMapper;

/**
 * What the conversational coach is told (ADR-092 #1) and, with it, the only numbers its reply may carry (#2): the call —
 * its action, the rules it rests on with the numbers each read, how sure it is — and its surroundings (CallFacts.context: this
 * week's counts, the record, the profile's summary). No dates, no raw log, no photo, no name: counts, the call, and a few
 * words about the person. Built only from what the engine kept; nothing here is computed by the model.
 */
final class CoachFacts {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    // A day or a moment as text ("2026-10-05"): the coach says no date, so it is told none.
    private static final Pattern DATED = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");

    private final String json;
    private final List<ReplyNumbers.Fact> facts;

    private CoachFacts(String json, List<ReplyNumbers.Fact> facts) {
        this.json = json;
        this.facts = List.copyOf(facts);
    }

    static CoachFacts of(CallFacts call) {
        return of(call, List.of());
    }

    /**
     * With what the user asked the coach to remember about them (ADR-092 #3), in their own words: facts about the person, not
     * numbers — the reply check lets the coach say none of theirs.
     */
    static CoachFacts of(CallFacts call, List<String> memory) {
        Map<String, Object> callPart = new LinkedHashMap<>();
        callPart.put("action", clean(call.action()));
        callPart.put("reasons", call.reasons().stream().map(rule -> {
            Map<String, Object> reason = new LinkedHashMap<>();
            reason.put("rule", rule.rule());
            reason.put("source", rule.sourceTag());
            if (!rule.facts().isEmpty()) {
                reason.put("facts", clean(rule.facts()));
            }
            return reason;
        }).toList());
        callPart.put("confidence", call.confidence());
        Map<String, Object> facts = new LinkedHashMap<>();
        facts.put("call", callPart);
        facts.putAll(clean(call.context()));
        List<ReplyNumbers.Fact> numbers = new ArrayList<>();
        collect("", "", facts, numbers);
        if (!memory.isEmpty()) {
            facts.put("memory", List.copyOf(memory));
        }
        return new CoachFacts("FACTS: " + JSON.writeValueAsString(facts), numbers);
    }

    /** The text the model is given after its instructions. */
    String json() {
        return json;
    }

    /** Every number in the facts, as written (signs kept; the check reads them by size), with what it counts. */
    List<ReplyNumbers.Fact> facts() {
        return facts;
    }

    /** The values alone. */
    List<BigDecimal> numbers() {
        return facts.stream().map(ReplyNumbers.Fact::value).toList();
    }

    private static Map<String, Object> clean(Map<String, Object> source) {
        Map<String, Object> cleaned = new LinkedHashMap<>();
        source.forEach((key, value) -> {
            Object kept = clean(value);
            if (kept != null) {
                cleaned.put(key, kept);
            }
        });
        return cleaned;
    }

    @SuppressWarnings("unchecked")
    private static Object clean(Object value) {
        if (value instanceof String text) {
            return DATED.matcher(text).find() ? null : text;
        }
        if (value instanceof Map<?, ?> map) {
            return clean((Map<String, Object>) map);
        }
        if (value instanceof List<?> list) {
            return list.stream().map(CoachFacts::clean).filter(item -> item != null).toList();
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value;
        }
        return null;
    }

    private static void collect(String parent, String key, Object value, List<ReplyNumbers.Fact> numbers) {
        if (value instanceof Number number) {
            numbers.add(new ReplyNumbers.Fact(new BigDecimal(number.toString()), unitOf(parent, key)));
        } else if (value instanceof Map<?, ?> map) {
            map.forEach((name, item) -> collect(key, String.valueOf(name), item, numbers));
        } else if (value instanceof List<?> list) {
            list.forEach(item -> collect(parent, key, item, numbers));
        }
    }

    /** What a fact counts, from its own name: kcalPerDay is kcal, kgPerWeek kg, stepsPerDay steps, weeks (and the weeks on track) weeks; a count of sessions is none. */
    private static ReplyNumbers.Unit unitOf(String parent, String key) {
        String name = key.toLowerCase(java.util.Locale.ROOT);
        if (name.contains("kcal")) {
            return ReplyNumbers.Unit.KCAL;
        }
        if (name.startsWith("kg")) {
            return ReplyNumbers.Unit.KG;
        }
        if (name.startsWith("steps") && name.contains("perday")) {
            return ReplyNumbers.Unit.STEPS;
        }
        if (name.equals("weeks") || name.endsWith("weeks")) {
            return ReplyNumbers.Unit.WEEKS;
        }
        return ReplyNumbers.Unit.NONE;
    }
}
