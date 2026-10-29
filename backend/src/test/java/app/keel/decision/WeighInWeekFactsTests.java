package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Action;
import app.keel.engine.Confidence;
import app.keel.engine.CopyKey;
import app.keel.engine.Decision;
import app.keel.engine.Phase;
import app.keel.engine.Reason;
import app.keel.engine.RuleId;
import app.keel.engine.Sex;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * When the weigh-in week is shown (ADR-089 #1): until a call has read the scale. A "no decision yet" has not; nor has the call
 * that closes the first week, which reads the sessions (K-962, ADR-077 #4, U8); a real call has, a hard stop included.
 */
class WeighInWeekFactsTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 2);

    @Test
    void aNoDecisionYetHasNotReadTheScale() {
        assertThat(WeighInWeekFacts.readTheScale(call(new Action.NoDecisionYet(), false))).isFalse();
    }

    @Test
    void aWeightCallHasReadIt() {
        assertThat(WeighInWeekFacts.readTheScale(call(new Action.Continue(), false))).isTrue();
        assertThat(WeighInWeekFacts.readTheScale(call(new Action.AdjustCalories(2300), false))).isTrue();
    }

    @Test
    void theCallThatClosesTheFirstWeekReadsSessionsNotTheScale() {
        assertThat(WeighInWeekFacts.readTheScale(call(new Action.Continue(), true))).isFalse();
        assertThat(WeighInWeekFacts.readTheScale(call(new Action.AddTrainingDay(4, 4, List.of()), true))).isFalse();
    }

    @Test
    void aHardStopHasReadItEvenOnTheFirstWeeksDay() {
        assertThat(WeighInWeekFacts.readTheScale(call(new Action.HardStop(), true))).isTrue();
    }

    @Test
    void aCallKeptWithoutItsSnapshotIsJudgedByItsActionAlone() {
        assertThat(WeighInWeekFacts.readTheScale(call(new Action.Continue(), null))).isTrue();
        assertThat(WeighInWeekFacts.readTheScale(call(new Action.NoDecisionYet(), null))).isFalse();
    }

    private static CallStore.Call call(Action action, boolean closesFirstWeek) {
        StoredSnapshot.FirstWeek week = closesFirstWeek ? new StoredSnapshot.FirstWeek(3, 3, 3, List.of(), null, List.of()) : null;
        return call(action, new StoredSnapshot(TODAY, Sex.MALE, Phase.CUT, TODAY, List.of(), null, null, null, null, false, TODAY, null, null, false,
                null, null, null, week));
    }

    private static CallStore.Call call(Action action, StoredSnapshot snapshot) {
        Decision decision = new Decision(action, List.of(new Reason(new RuleId("r"), new Source("arastirma/x.md#1", SourceTag.LITERATURE))),
                Confidence.MEDIUM, TODAY.plusDays(7), new CopyKey("decision.continue"));
        return new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), TODAY, TODAY, Instant.parse("2026-11-02T08:00:00Z"), "hash", snapshot,
                DecisionJson.of(decision), CallStore.Application.NOT_NEEDED, null, null, null, null, null);
    }
}
