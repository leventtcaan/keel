package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Action;
import app.keel.engine.Confidence;
import app.keel.engine.CopyKey;
import app.keel.engine.Decision;
import app.keel.engine.Phase;
import app.keel.engine.Reason;
import app.keel.engine.RuleId;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/**
 * A call as it is kept and shown (K-228, ADR-028 #24): the hard stop comes only from a "yes" to the cycle question, so
 * its own kind would give that answer away (GDPR Art. 9). It is kept as what it does to the plan — a change of phase to
 * building — with a safety mark, under the change-of-phase words; read back, it is the hard stop again, so applying and
 * the refused undo are unchanged. The engine's ActionType does not change: the mapping is only at the storage edge.
 */
class StoredDecisionTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Source REDS = new Source("arastirma/ham/J1-cinsiyet.md#C6", SourceTag.LITERATURE);

    private static Decision hardStop() {
        return new Decision(new Action.HardStop(), List.of(new Reason(new RuleId("low_energy_safety"), REDS)), Confidence.HIGH,
                LocalDate.of(2026, 10, 5), new CopyKey("decision.hard_stop.low_energy_safety"));
    }

    private static Decision phaseChange() {
        return new Decision(new Action.ChangePhase(Phase.BULK), List.of(new Reason(new RuleId("surplus_zone"), REDS)), Confidence.MEDIUM,
                LocalDate.of(2026, 10, 5), new CopyKey("decision.change_phase.surplus_zone"));
    }

    @Test
    void theHardStopIsKeptAsWhatItDoesToThePlanWithASafetyMark() {
        Map<String, Object> kept = DecisionJson.of(hardStop());

        assertThat(kept.get("action")).isEqualTo(Map.of("type", "CHANGE_PHASE", "to", "BULK"));
        assertThat(kept).containsEntry("safety", true).containsEntry("copyKey", "decision.change_phase.low_energy_safety");
    }

    @Test
    void nothingKeptNamesTheHardStop() throws Exception {
        String kept = JSON.writeValueAsString(DecisionJson.of(hardStop()));

        assertThat(kept).doesNotContainIgnoringCase("hard_stop").doesNotContainIgnoringCase("hardstop");
    }

    @Test
    void readBackItIsTheHardStopAgain() {
        assertThat(DecisionJson.action(DecisionJson.of(hardStop()))).isEqualTo(new Action.HardStop());
    }

    @Test
    void theFirstWeeksCallsAreKeptWithTheirDataAndReadBackAsMade() {
        // K-962: the missed weekdays by name, as the contract's Weekday; the added day's new count.
        Action moved = new Action.MoveMissedSessions(List.of(java.time.DayOfWeek.WEDNESDAY, java.time.DayOfWeek.FRIDAY));
        Map<String, Object> kept = DecisionJson.of(new Decision(moved, List.of(new Reason(new RuleId("first_week_move_missed"), REDS)),
                Confidence.MEDIUM, LocalDate.of(2026, 10, 5), new CopyKey("decision.move_missed_sessions.first_week_move_missed")));

        assertThat(kept.get("action")).isEqualTo(Map.of("type", "MOVE_MISSED_SESSIONS", "missed", List.of("WEDNESDAY", "FRIDAY")));
        assertThat(DecisionJson.action(kept)).isEqualTo(moved);
        Action added = new Action.AddTrainingDay(3, 4);
        assertThat(DecisionJson.action(DecisionJson.of(new Decision(added, List.of(new Reason(new RuleId("first_week_add_day"), REDS)),
                Confidence.MEDIUM, LocalDate.of(2026, 10, 5), new CopyKey("decision.add_training_day.first_week_add_day"))))).isEqualTo(added);
    }

    @Test
    void anOrdinaryChangeOfPhaseHasNoSafetyMarkAndStaysAChangeOfPhase() {
        Map<String, Object> kept = DecisionJson.of(phaseChange());

        assertThat(kept).doesNotContainKey("safety");
        assertThat(DecisionJson.action(kept)).isEqualTo(new Action.ChangePhase(Phase.BULK));
    }

    @Test
    void theKeptWordsExistAndAreTheHardStopsOwn() throws Exception {
        // The phone shows the kept copy key; it must say what the engine's own key says.
        Map<String, Object> copy = JSON.readValue(Files.readString(Path.of("../data/copy/en.json")), Map.class);
        Map<?, ?> decision = (Map<?, ?>) copy.get("decision");
        Object kept = ((Map<?, ?>) decision.get("change_phase")).get("low_energy_safety");
        Object own = ((Map<?, ?>) decision.get("hard_stop")).get("low_energy_safety");

        assertThat(kept).isNotNull().isEqualTo(own);
    }
}
