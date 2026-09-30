package app.keel.engine;

import static app.keel.engine.EngineFixtures.copyGroup;
import static app.keel.engine.EngineFixtures.daily;
import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * After the hard stop (ADR-020 L-1) the plan builds at maintenance at least. Before a call opens a deficit again — a cut,
 * a step down, a mini cut — the cycle question is asked again (ADR-028 #23, K-229): "resolved" lets the call through;
 * no answer waits (the engine says "not yet", and the check-in asks); "still stopped" is the hard stop again (SafetyNet).
 */
class SafetyHoldTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 5);
    private static final Source REDS = new Source("arastirma/ham/J1-cinsiyet.md#C6", SourceTag.LITERATURE);

    private static Decision call(Action action) {
        return new Decision(action, List.of(new Reason(new RuleId("bulk_ceiling"), REDS)), Confidence.MEDIUM, TODAY.plusDays(7),
                new CopyKey("decision.change_phase.bulk_ceiling"));
    }

    private static Snapshot held(boolean resolved) {
        return new Snapshot(TODAY, Sex.FEMALE, Phase.BULK, TODAY.minusDays(40), series(List.of())).withSafetyHold(true).withCycleResolved(resolved);
    }

    @Test
    void heldAndNotResolvedACutWaitsForTheCycleQuestion() {
        Decision waiting = SafetyHold.check(call(new Action.ChangePhase(Phase.CUT)), held(false));

        assertThat(waiting.action()).isEqualTo(new Action.NoDecisionYet());
        assertThat(waiting.reasons().getFirst().rule()).isEqualTo(SafetyHold.CYCLE_CHECK_NEEDED);
        assertThat(waiting.confidence()).isEqualTo(Confidence.LOW);
        assertThat(waiting.nextReview()).isAfter(TODAY);
        assertThat(copyGroup(waiting.copyKey())).containsKeys("title", "body");
    }

    @Test
    void everyWayBackIntoADeficitWaitsAndNothingElseDoes() {
        assertThat(SafetyHold.opensDeficit(new Action.ChangePhase(Phase.CUT))).isTrue();
        assertThat(SafetyHold.opensDeficit(new Action.AdjustCalories(-150))).isTrue();
        assertThat(SafetyHold.opensDeficit(new Action.MiniCut(2, 4))).isTrue();

        assertThat(SafetyHold.opensDeficit(new Action.ChangePhase(Phase.BULK))).isFalse();
        assertThat(SafetyHold.opensDeficit(new Action.AdjustCalories(150))).isFalse();
        assertThat(SafetyHold.opensDeficit(new Action.IncreaseCalories(100))).isFalse();
        assertThat(SafetyHold.opensDeficit(new Action.Continue())).isFalse();
        assertThat(SafetyHold.opensDeficit(new Action.Deload(new BigDecimal("0.50")))).isFalse();
    }

    @Test
    void resolvedTheCallGoesThrough() {
        Decision cut = call(new Action.ChangePhase(Phase.CUT));

        assertThat(SafetyHold.check(cut, held(true))).isEqualTo(cut);
    }

    @Test
    void withoutAHoldNothingChanges() {
        Decision cut = call(new Action.ChangePhase(Phase.CUT));
        Snapshot free = new Snapshot(TODAY, Sex.FEMALE, Phase.BULK, TODAY.minusDays(40), series(List.of()));

        assertThat(SafetyHold.check(cut, free)).isEqualTo(cut);
    }

    @Test
    void heldACallThatOpensNoDeficitGoesThrough() {
        Decision more = call(new Action.AdjustCalories(150));

        assertThat(SafetyHold.check(more, held(false))).isEqualTo(more);
    }

    @Test
    void thePipelineHoldsTheCutThePhaseGateWouldMake() {
        // A woman whose estimate is over the bulk ceiling (30%): the gate turns her to a cut — unless the hold waits.
        Snapshot overTheCeiling = new Snapshot(TODAY, Sex.FEMALE, Phase.BULK, TODAY.minusDays(40),
                series(daily(TODAY.minusDays(35), TODAY, "70.0")), Optional.of(new BigDecimal("40")));

        assertThat(DecisionPipeline.decide(overTheCeiling, parameters(Sex.FEMALE)).action()).isEqualTo(new Action.ChangePhase(Phase.CUT));
        assertThat(DecisionPipeline.decide(overTheCeiling.withSafetyHold(true), parameters(Sex.FEMALE)).action())
                .isEqualTo(new Action.NoDecisionYet());
        assertThat(DecisionPipeline.decide(overTheCeiling.withSafetyHold(true).withCycleResolved(true), parameters(Sex.FEMALE)).action())
                .isEqualTo(new Action.ChangePhase(Phase.CUT));
    }

    @Test
    void stillStoppedIsTheHardStopAgain() {
        Snapshot stillStopped = held(false).withMenstrualLossReported(true);

        assertThat(DecisionPipeline.decide(stillStopped, parameters(Sex.FEMALE)).action()).isEqualTo(new Action.HardStop());
    }

    @Test
    void theAnswerNeverShowsInPrint() {
        assertThat(held(true).toString()).doesNotContain("cycleResolved=true").contains("<hidden>");
    }
}
