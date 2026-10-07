package app.keel.decision;

import app.keel.engine.RuleId;
import app.keel.engine.SafetyNet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Whether a kept call ({@link DecisionJson#of}) rests on the safety net (U13): the hard stop, kept with its {@code safety}
 * mark (K-228), or any call with a reason among {@link SafetyNet#RULES}. Such a call is never declined (K-963, ADR-077 #3)
 * and never told in a language model's words (K-505).
 */
final class SafetyCalls {

    private static final Set<String> RULES = SafetyNet.RULES.stream().map(RuleId::value).collect(Collectors.toUnmodifiableSet());

    private SafetyCalls() {
    }

    @SuppressWarnings("unchecked")
    static boolean restsOnTheSafetyNet(Map<String, Object> kept) {
        List<Map<String, Object>> reasons = (List<Map<String, Object>>) kept.getOrDefault("reasons", List.of());
        return DecisionJson.safety(kept) || reasons.stream().anyMatch(reason -> RULES.contains((String) reason.get("rule")));
    }
}
