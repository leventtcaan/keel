package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.keel.engine.Action;
import app.keel.engine.CheckIn;
import app.keel.engine.Confidence;
import app.keel.engine.CopyKey;
import app.keel.engine.Decision;
import app.keel.engine.Phase;
import app.keel.engine.Reason;
import app.keel.engine.RuleId;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * The pieces of the weekly check-in that need no database (K-212): which week it is on the user's calendar, what a call
 * looks like on the wire (the engine's Decision, field for field — ContractTests), and how answers become the engine's
 * CheckIn.
 */
class CheckInPartsTests {

    @Test
    void theWeekIsTheLatestCheckInDayUpToToday() {
        // Check-in on Mondays: Wednesday 1 Oct → Monday 29 Sep; on the Monday itself, that Monday.
        assertThat(CheckInWeek.weekOf(LocalDate.of(2026, 10, 1), DayOfWeek.MONDAY)).isEqualTo(LocalDate.of(2026, 9, 28));
        assertThat(CheckInWeek.weekOf(LocalDate.of(2026, 9, 28), DayOfWeek.MONDAY)).isEqualTo(LocalDate.of(2026, 9, 28));
        assertThat(CheckInWeek.weekOf(LocalDate.of(2026, 9, 27), DayOfWeek.MONDAY)).isEqualTo(LocalDate.of(2026, 9, 21));
    }

    @Test
    void aCallOnTheWireIsTheEnginesDecisionWithItsKindNamed() {
        Decision decision = new Decision(new Action.AdjustCalories(-500),
                List.of(new Reason(new RuleId("cut_stalled"), new Source("arastirma/ham/guray/G2-kilo-verme.md#K-14", SourceTag.EXPERIENCE))),
                Confidence.MEDIUM, LocalDate.of(2026, 10, 12), new CopyKey("decision.adjust_calories.cut"));

        assertThat(DecisionJson.of(decision)).isEqualTo(Map.of(
                "action", Map.of("type", "ADJUST_CALORIES", "kcalPerDay", -500),
                "reasons", List.of(Map.of("rule", "cut_stalled",
                        "source", Map.of("reference", "arastirma/ham/guray/G2-kilo-verme.md#K-14", "tag", "EXPERIENCE"))),
                "confidence", "MEDIUM", "nextReview", "2026-10-12", "copyKey", "decision.adjust_calories.cut"));
    }

    @Test
    void anActionsDataIsWrittenPlainly() {
        assertThat(DecisionJson.of(decision(new Action.Deload(new BigDecimal("0.50")))).get("action"))
                .isEqualTo(Map.of("type", "DELOAD", "setsFactor", new BigDecimal("0.5")));
        assertThat(DecisionJson.of(decision(new Action.ChangePhase(Phase.BULK))).get("action")).isEqualTo(Map.of("type", "CHANGE_PHASE", "to", "BULK"));
        assertThat(DecisionJson.of(decision(new Action.NoDecisionYet())).get("action")).isEqualTo(Map.of("type", "NO_DECISION_YET"));
    }

    @Test
    void answersBecomeTheEnginesCheckIn() {
        Answers.Read read = Answers.read(List.of(
                new Answers.Answer(Answers.Kind.LOOK, null, "BETTER", null),
                new Answers.Answer(Answers.Kind.TRAINING, null, "STABLE", null),
                new Answers.Answer(Answers.Kind.RECOVERY, null, "POOR", null),
                new Answers.Answer(Answers.Kind.APPETITE, null, "GONE", null),
                new Answers.Answer(Answers.Kind.CYCLE_STOPPED, null, "YES", null)));

        assertThat(read.checkIn()).isEqualTo(new CheckIn(CheckIn.Look.BETTER, CheckIn.Training.STABLE, CheckIn.Recovery.POOR,
                CheckIn.Waist.UNKNOWN, java.util.Optional.empty(), CheckIn.Appetite.GONE));
        assertThat(read.menstrualLossReported()).isTrue();
        assertThat(Answers.read(List.of()).checkIn()).as("nothing answered: all unknown, the engine asks").isEqualTo(CheckIn.NONE);
    }

    @Test
    void anAnswerOutsideItsChoicesOrTwiceIsRefused() {
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(new Answers.Answer(Answers.Kind.LOOK, null, "AMAZING", null))));
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(new Answers.Answer(Answers.Kind.LOOK, 7, null, null))));
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(new Answers.Answer(Answers.Kind.LOOK, null, "SAME", null),
                new Answers.Answer(Answers.Kind.LOOK, null, "BETTER", null))));
        // UNKNOWN is the engine's word for "not answered", not an answer.
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(new Answers.Answer(Answers.Kind.LOOK, null, "UNKNOWN", null))));
    }

    private static Decision decision(Action action) {
        return new Decision(action, List.of(new Reason(new RuleId("r"), new Source("arastirma/x.md#1", SourceTag.LITERATURE))),
                Confidence.LOW, LocalDate.of(2026, 10, 5), new CopyKey("decision.continue"));
    }
}
