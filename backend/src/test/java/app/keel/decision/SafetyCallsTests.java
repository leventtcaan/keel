package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.RuleId;
import app.keel.engine.SafetyHold;
import app.keel.engine.SafetyNet;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Which kept calls rest on the safety net (U13, ADR-077 #3): the hard stop, kept with its {@code safety} mark, and any call
 * with a reason among the safety net's rules. "Keep last week's plan" is never offered on one, and the coach never tells
 * one in its own words (K-505).
 */
class SafetyCallsTests {

    @Test
    void theHardStopRestsOnTheSafetyNet() {
        assertThat(SafetyCalls.restsOnTheSafetyNet(Map.of("action", Map.of("type", "CHANGE_PHASE", "to", "BULK"), "safety", true,
                "reasons", List.of()))).isTrue();
    }

    @Test
    void aCallWithAReasonAmongTheSafetyNetsRulesRestsOnIt() {
        for (RuleId rule : SafetyNet.RULES) {
            assertThat(SafetyCalls.restsOnTheSafetyNet(call("INCREASE_CALORIES", "calorie_ladder_step", rule.value())))
                    .as(rule.value()).isTrue();
        }
    }

    @Test
    void anOrdinaryCallDoesNot() {
        assertThat(SafetyCalls.restsOnTheSafetyNet(call("ADJUST_CALORIES", "calorie_ladder_step"))).isFalse();
        assertThat(SafetyCalls.restsOnTheSafetyNet(call("CHANGE_MOVEMENT", "steps_before_calories"))).isFalse();
        assertThat(SafetyCalls.restsOnTheSafetyNet(Map.of("action", Map.of("type", "CONTINUE"), "safety", false,
                "reasons", List.of(reason("on_track"))))).isFalse();
    }

    @Test
    void waitingForTheCycleQuestionIsNotTheSafetyNetsRule() {
        // A safety question, but no decision: the call is "not yet", so nothing to apply or decline (NOT_NEEDED).
        assertThat(SafetyCalls.restsOnTheSafetyNet(call("NO_DECISION_YET", SafetyHold.CYCLE_CHECK_NEEDED.value()))).isFalse();
    }

    private static Map<String, Object> call(String type, String... rules) {
        return Map.of("action", Map.of("type", type), "reasons", java.util.Arrays.stream(rules).map(SafetyCallsTests::reason).toList());
    }

    private static Map<String, Object> reason(String rule) {
        return Map.of("rule", rule, "source", Map.of("reference", "arastirma/x.md#1", "tag", "LITERATURE"));
    }
}
