package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Action;
import app.keel.engine.Confidence;
import app.keel.engine.CopyKey;
import app.keel.engine.Decision;
import app.keel.engine.Phase;
import app.keel.engine.Reason;
import app.keel.engine.RuleId;
import app.keel.engine.SafetyNet;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import app.keel.engine.WeightSeries;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Contract Decision.declinable (K-963, ADR-077 #3): "Keep last week's plan" is offered on the latest call, PENDING or
 * APPLIED, and never on one resting on the safety net (U13). The server decides; the phone only reads it (K2).
 */
class DeclinableTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 5);

    @Test
    void theLatestCallPendingOrAppliedIsDeclinable() {
        assertThat(DecisionService.declinable(call(new Action.AdjustCalories(-150), "r", CallStore.Application.PENDING), true)).isTrue();
        assertThat(DecisionService.declinable(call(new Action.AdjustCalories(-150), "r", CallStore.Application.APPLIED), true)).isTrue();
        assertThat(DecisionService.declinable(call(new Action.ChangeMovement(), "r", CallStore.Application.APPLIED), true)).isTrue();
    }

    @Test
    void noOtherStateIs() {
        for (CallStore.Application state : List.of(CallStore.Application.NOT_NEEDED, CallStore.Application.UNDONE,
                CallStore.Application.DECLINED)) {
            assertThat(DecisionService.declinable(call(new Action.AdjustCalories(-150), "r", state), true)).as(state.name()).isFalse();
        }
    }

    @Test
    void anOlderCallIsNot() {
        assertThat(DecisionService.declinable(call(new Action.AdjustCalories(-150), "r", CallStore.Application.PENDING), false)).isFalse();
    }

    @Test
    void aCallRestingOnTheSafetyNetNeverIs() {
        assertThat(DecisionService.declinable(call(new Action.HardStop(), "r", CallStore.Application.PENDING), true)).isFalse();
        for (RuleId rule : SafetyNet.RULES) {
            for (CallStore.Application state : List.of(CallStore.Application.PENDING, CallStore.Application.APPLIED)) {
                assertThat(DecisionService.declinable(call(new Action.IncreaseCalories(150), rule.value(), state), true))
                        .as(rule.value() + " " + state).isFalse();
            }
        }
    }

    private static CallStore.Call call(Action action, String rule, CallStore.Application state) {
        Decision decision = new Decision(action, List.of(new Reason(new RuleId(rule), new Source("arastirma/x.md#1", SourceTag.LITERATURE))),
                Confidence.MEDIUM, TODAY.plusDays(7), new CopyKey("decision.continue"));
        return new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), TODAY, TODAY, Instant.parse("2026-10-05T08:00:00Z"), "hash",
                StoredSnapshot.of(new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(42), new WeightSeries(List.of()))),
                DecisionJson.of(decision), state);
    }
}
