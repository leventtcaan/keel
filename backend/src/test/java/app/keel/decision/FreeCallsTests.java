package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.SafetyHold;
import app.keel.engine.SafetyNet;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;

/**
 * Which calls the free account may keep and which the subscription holds back (ADR-091 Ek 1, K-1201): a full call is one
 * made on a decision window that was read; the safety net and the cycle question are never held, nor do they spend the
 * free allowance (U6).
 */
class FreeCallsTests {

    private static final Map<String, Object> ORDINARY = call("ADJUST_CALORIES", "calorie_ladder_step");

    @Test
    void theAllowanceIsAParameterFromTheQuotaFile() throws IOException {
        try (InputStream in = new ClassPathResource("data/parameters/quota.yaml").getInputStream()) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parameters = (List<Map<String, Object>>) new Yaml().<Map<String, Object>>load(in).get("parameters");
            Map<String, Object> free = parameters.stream().filter(parameter -> "free_full_calls".equals(parameter.get("key"))).findFirst().orElseThrow();

            assertThat(FreeCalls.fromClasspath().allowance()).isEqualTo(free.get("value")).isEqualTo(1);
            assertThat(free).containsKeys("unit", "tag", "source", "note").containsEntry("tag", "urun");
        }
    }

    @Test
    void aCallIsFullWhenTheDecisionWindowWasRead() {
        assertThat(FreeCalls.full(true, ORDINARY)).isTrue();
        // The first week's training call, "observing", "window not full", "data insufficient": the spine never ran.
        assertThat(FreeCalls.full(false, ORDINARY)).isFalse();
    }

    @Test
    void theSafetyNetAndTheCycleQuestionAreNeverFull() {
        for (var rule : SafetyNet.RULES) {
            assertThat(FreeCalls.full(true, call("INCREASE_CALORIES", rule.value()))).as(rule.value()).isFalse();
        }
        assertThat(FreeCalls.full(true, Map.of("action", Map.of("type", "CHANGE_PHASE", "to", "BULK"), "safety", true, "reasons", List.of()))).isFalse();
        assertThat(FreeCalls.full(true, call("NO_DECISION_YET", SafetyHold.CYCLE_CHECK_NEEDED.value()))).isFalse();
    }

    @Test
    void theCallsThatTakeLoadOffAreNeverFullSoNeverHeldNorSpendTheFreeCall() {
        // ADR-091 Ek 1 (needs Levent's nod): a fatigued user is not denied a deload or a week off.
        for (String type : List.of("DELOAD", "FULL_REST_WEEK", "STOP_LOAD_INCREASE", "FIX_RECOVERY")) {
            assertThat(FreeCalls.full(true, call(type, "deload_ladder"))).as(type).isFalse();
        }
        assertThat(FreeCalls.full(true, call("INCREASE_CALORIES", "calorie_ladder_step"))).isTrue();
    }

    @Test
    void aSafetyCallPastTheAllowanceOfAnAccountWithoutTheSubscriptionIsNotHeldBack() {
        // The path checkIn takes: full(...) feeds heldBack(...). U6: the safety net is always applied, whatever the account has used.
        FreeCalls free = new FreeCalls(1);
        for (var rule : SafetyNet.RULES) {
            boolean full = FreeCalls.full(true, call("INCREASE_CALORIES", rule.value()));
            assertThat(free.heldBack(true, full, 7, false)).as(rule.value()).isFalse();
        }
        boolean cycle = FreeCalls.full(true, call("NO_DECISION_YET", SafetyHold.CYCLE_CHECK_NEEDED.value()));
        assertThat(free.heldBack(true, cycle, 7, false)).isFalse();
    }

    @Test
    void theFirstFullCallIsFreeTheNextOnesWaitForTheSubscription() {
        FreeCalls free = new FreeCalls(1);

        assertThat(free.heldBack(true, true, 0, false)).as("the first full call").isFalse();
        assertThat(free.heldBack(true, true, 1, false)).as("the second").isTrue();
        assertThat(free.heldBack(true, true, 5, false)).as("the sixth").isTrue();
    }

    @Test
    void anAccountWithTheSubscriptionIsNeverHeldBack() {
        assertThat(new FreeCalls(1).heldBack(true, true, 3, true)).isFalse();
    }

    @Test
    void aCallThatIsNotFullIsNeverHeldBack() {
        assertThat(new FreeCalls(1).heldBack(true, false, 9, false)).isFalse();
    }

    @Test
    void aPhoneThatCannotShowALockedCallIsNeverHeldBackButItsFullCallsCount() {
        FreeCalls free = new FreeCalls(1);

        assertThat(free.heldBack(false, true, 9, false)).isFalse();
        assertThat(free.heldBack(true, true, 1, false)).as("the same account on a newer phone").isTrue();
    }

    @Test
    void theAllowanceIsWhateverTheParameterSays() {
        assertThat(new FreeCalls(0).heldBack(true, true, 0, false)).isTrue();
        assertThat(new FreeCalls(3).heldBack(true, true, 2, false)).isFalse();
        assertThat(new FreeCalls(3).heldBack(true, true, 3, false)).isTrue();
    }

    private static Map<String, Object> call(String type, String... rules) {
        return Map.of("action", Map.of("type", type), "reasons", java.util.Arrays.stream(rules)
                .map(rule -> Map.of("rule", rule, "source", Map.of("reference", "arastirma/x.md#1", "tag", "LITERATURE"))).toList());
    }
}
