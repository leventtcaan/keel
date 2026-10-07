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
import app.keel.engine.SafetyHold;
import app.keel.engine.Sex;
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
    void aWeekThatOverlapsTheLastCallIsTakenForTheQuestionsAndTheAnswersAlike() {
        // One call a week (K-212). GET and POST read the same rule (K-213 review): a check-in day moved from Monday to
        // Thursday must not offer a check-in whose answers would all get CONFLICT.
        LocalDate monday = LocalDate.of(2026, 9, 28);
        assertThat(CheckInWeek.taken(monday, java.util.Optional.empty())).as("no call yet").isFalse();
        assertThat(CheckInWeek.taken(monday, java.util.Optional.of(monday))).as("this week answered").isTrue();
        assertThat(CheckInWeek.taken(monday.plusDays(3), java.util.Optional.of(monday))).as("check-in day moved to Thursday").isTrue();
        assertThat(CheckInWeek.taken(monday.plusDays(6), java.util.Optional.of(monday))).as("the week's last day").isTrue();
        assertThat(CheckInWeek.taken(monday.plusDays(7), java.util.Optional.of(monday))).as("a week later").isFalse();
    }

    @Test
    void anAnswerIsTakenForEveryQuestionTheEngineCanWaitFor() {
        // Not only this moment's questions: data can change between asking and answering (a new weigh-in, midnight), and
        // a question the app just showed must not come back as 400 (K-213 review). What the data says (look, waist) is
        // never an answer. The cycle question too (V4, K-222): the band can leave "low" between asking and answering; whose
        // answer it is, Answers decides (a woman's). Appetite since K-227 (the mini cut): only the user can say it.
        // Whether a declared state is still so since K-516, how week 1 felt since K-962 (K1 note to the product owner: the list
        // grows by the question it adds).
        assertThat(java.util.Arrays.stream(Answers.Kind.values()).filter(CheckInQuestions::answerable))
                .containsExactly(Answers.Kind.TRAINING, Answers.Kind.RECOVERY, Answers.Kind.APPETITE, Answers.Kind.CYCLE_STOPPED,
                        Answers.Kind.STATE_STILL, Answers.Kind.WEEK1_FEEL);
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
    @SuppressWarnings("unchecked")
    void aCallIsSentWithItsSourcesKindOnlyAndKeptWithTheirPaths() {
        // K-523 (ADR-041 #72): the kept call holds each reason's research path (audit); what is sent holds its kind only —
        // a hard stop too, still marked safety under the change-of-phase words (ADR-028 #24).
        Decision decision = new Decision(new Action.HardStop(),
                List.of(new Reason(new RuleId("cut_stalled"), new Source("arastirma/ham/guray/G2-kilo-verme.md#K-14", SourceTag.EXPERIENCE)),
                        new Reason(new RuleId("low_energy_safety"), new Source("arastirma/ham/J1-cinsiyet.md#C6", SourceTag.LITERATURE))),
                Confidence.HIGH, LocalDate.of(2026, 10, 12), new CopyKey("decision.hard_stop.low_energy_safety"));
        Map<String, Object> kept = DecisionJson.of(decision);

        Map<String, Object> sent = SourceView.sent(kept);

        assertThat(sent.get("reasons")).isEqualTo(List.of(
                Map.of("rule", "cut_stalled", "source", Map.of("tag", "EXPERIENCE")),
                Map.of("rule", "low_energy_safety", "source", Map.of("tag", "LITERATURE"))));
        assertThat(sent).containsEntry("safety", true).containsEntry("copyKey", "decision.change_phase.low_energy_safety")
                .containsEntry("action", kept.get("action"));
        assertThat(((List<Map<String, Object>>) kept.get("reasons")).getFirst().get("source"))
                .isEqualTo(Map.of("reference", "arastirma/ham/guray/G2-kilo-verme.md#K-14", "tag", "EXPERIENCE"));
        assertThat(DecisionJson.action(kept)).isInstanceOf(Action.HardStop.class);
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
                new Answers.Answer(Answers.Kind.APPETITE, null, "GONE", null)), Sex.MALE);

        assertThat(read.checkIn()).isEqualTo(new CheckIn(CheckIn.Look.BETTER, CheckIn.Training.STABLE, CheckIn.Recovery.POOR,
                CheckIn.Waist.UNKNOWN, java.util.Optional.empty(), CheckIn.Appetite.GONE));
        assertThat(read.menstrualLossReported()).isFalse();
        assertThat(Answers.read(List.of(), Sex.MALE).checkIn()).as("nothing answered: all unknown, the engine asks").isEqualTo(CheckIn.NONE);
        // K-525: only an explicit "yes" is "still so" — a check-in with no answer to it neither ends nor keeps the state.
        Answers.Read none = Answers.read(List.of(), Sex.MALE);
        assertThat(none.stillSo()).isFalse();
        assertThat(none.stateOver()).isFalse();
        Answers.Read yes = Answers.read(List.of(new Answers.Answer(Answers.Kind.STATE_STILL, null, "YES", null)), Sex.MALE);
        assertThat(yes.stillSo()).isTrue();
        assertThat(yes.stateOver()).isFalse();
        Answers.Read no = Answers.read(List.of(new Answers.Answer(Answers.Kind.STATE_STILL, null, "NO", null)), Sex.MALE);
        assertThat(no.stillSo()).isFalse();
        assertThat(no.stateOver()).isTrue();
    }

    @Test
    void anAnswerOutsideItsChoicesOrTwiceIsRefused() {
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(new Answers.Answer(Answers.Kind.LOOK, null, "AMAZING", null)), Sex.MALE));
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(new Answers.Answer(Answers.Kind.LOOK, 7, null, null)), Sex.MALE));
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(new Answers.Answer(Answers.Kind.LOOK, null, "SAME", null),
                new Answers.Answer(Answers.Kind.LOOK, null, "BETTER", null)), Sex.MALE));
        // Read with their questions (K-213): the scales and the waist. Each in its own well-formed shape, so the refusal is
        // for the kind, not the shape.
        for (Answers.Answer later : List.of(new Answers.Answer(Answers.Kind.SLEEP_QUALITY, 3, null, null),
                new Answers.Answer(Answers.Kind.ENERGY, 7, null, null), new Answers.Answer(Answers.Kind.WAIST, null, null, new BigDecimal("88")))) {
            assertThatIllegalArgumentException().as(later.kind().name()).isThrownBy(() -> Answers.read(List.of(later), Sex.MALE));
        }
        // UNKNOWN is the engine's word for "not answered", not an answer.
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(new Answers.Answer(Answers.Kind.LOOK, null, "UNKNOWN", null)), Sex.MALE));
    }

    @Test
    void theCycleAnswerIsTakenFromAWomanOnly() {
        // V4 (K-222): asked only of a woman in the low energy band; taken from anyone it stopped a man's plan (K-212 review).
        Answers.Answer yes = new Answers.Answer(Answers.Kind.CYCLE_STOPPED, null, "YES", null);
        Answers.Answer no = new Answers.Answer(Answers.Kind.CYCLE_STOPPED, null, "NO", null);

        assertThat(Answers.read(List.of(yes), Sex.FEMALE).menstrualLossReported()).isTrue();
        assertThat(Answers.read(List.of(no), Sex.FEMALE).menstrualLossReported()).isFalse();
        assertThat(Answers.read(List.of(yes), Sex.FEMALE).checkIn()).as("nothing else is answered").isEqualTo(CheckIn.NONE);
        for (Answers.Answer answer : List.of(yes, no)) {
            assertThatIllegalArgumentException().as("a man: " + answer.choice()).isThrownBy(() -> Answers.read(List.of(answer), Sex.MALE));
        }
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(new Answers.Answer(Answers.Kind.CYCLE_STOPPED, null, "MAYBE", null)),
                Sex.FEMALE));
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(new Answers.Answer(Answers.Kind.CYCLE_STOPPED, 1, null, null)),
                Sex.FEMALE));
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(yes, no), Sex.FEMALE));
    }

    @Test
    void aCallThatChangesNothingNeedsNoApplyingAndEveryOtherDoes() {
        // K-216 applies PENDING calls; "not yet", "continue" and advice change no target.
        java.util.Map<Action, CallStore.Application> expected = new java.util.LinkedHashMap<>();
        expected.put(new Action.NoDecisionYet(), CallStore.Application.NOT_NEEDED);
        expected.put(new Action.Continue(), CallStore.Application.NOT_NEEDED);
        expected.put(new Action.FixTraining(), CallStore.Application.NOT_NEEDED);
        expected.put(new Action.FixRecovery(), CallStore.Application.NOT_NEEDED);
        expected.put(new Action.FixAdherence(), CallStore.Application.NOT_NEEDED);
        expected.put(new Action.AdjustCalories(-500), CallStore.Application.PENDING);
        expected.put(new Action.IncreaseCalories(250), CallStore.Application.PENDING);
        expected.put(new Action.ChangeMovement(), CallStore.Application.PENDING);
        expected.put(new Action.HardStop(), CallStore.Application.PENDING);
        expected.put(new Action.StopLoadIncrease(), CallStore.Application.PENDING);
        expected.put(new Action.Deload(new BigDecimal("0.5")), CallStore.Application.PENDING);
        expected.put(new Action.FullRestWeek(), CallStore.Application.PENDING);
        expected.put(new Action.MiniCut(2, 4), CallStore.Application.PENDING);
        expected.put(new Action.ChangePhase(Phase.BULK), CallStore.Application.PENDING);
        // Week 1's calls change no target: the day is the user's to pick (ADR-077 Ek 1).
        expected.put(new Action.AddTrainingDay(4, 4), CallStore.Application.NOT_NEEDED);
        expected.put(new Action.MoveMissedSessions(List.of(java.time.DayOfWeek.WEDNESDAY)), CallStore.Application.NOT_NEEDED);
        assertThat(expected.keySet()).extracting(Action::type).containsExactlyInAnyOrder(app.keel.engine.ActionType.values());

        expected.forEach((action, state) -> assertThat(DecisionService.application(decision(action))).as(action.type().name()).isEqualTo(state));
    }

    private static Decision decision(Action action) {
        return new Decision(action, List.of(new Reason(new RuleId("r"), new Source("arastirma/x.md#1", SourceTag.LITERATURE))),
                Confidence.LOW, LocalDate.of(2026, 10, 5), new CopyKey("decision.continue"));
    }

    @Test
    void theCycleAnswerNoIsReadAsResolvedAndYesAsStoppedAndNeitherWhenNotAnswered() {
        // K-229: after a hard stop, "no, it has not stopped" lets a deficit open again; the answer is never kept.
        Answers.Read no = Answers.read(List.of(new Answers.Answer(Answers.Kind.CYCLE_STOPPED, null, "NO", null)), Sex.FEMALE);
        Answers.Read yes = Answers.read(List.of(new Answers.Answer(Answers.Kind.CYCLE_STOPPED, null, "YES", null)), Sex.FEMALE);
        Answers.Read none = Answers.read(List.of(), Sex.FEMALE);

        assertThat(no.cycleResolved()).isTrue();
        assertThat(no.menstrualLossReported()).isFalse();
        assertThat(yes.cycleResolved()).isFalse();
        assertThat(yes.menstrualLossReported()).isTrue();
        assertThat(none.cycleResolved()).isFalse();
        assertThat(none.menstrualLossReported()).isFalse();
    }

    @Test
    void theCheckInSeesACallWaitingForTheCycleQuestionAndNothingElse() {
        Source reds = new Source("arastirma/ham/J1-cinsiyet.md#C6", SourceTag.LITERATURE);
        Decision waiting = new Decision(new Action.NoDecisionYet(), List.of(new Reason(SafetyHold.CYCLE_CHECK_NEEDED, reds)), Confidence.LOW,
                LocalDate.of(2026, 10, 12), new CopyKey("decision.no_decision_yet.cycle_check_needed"));
        Decision other = new Decision(new Action.NoDecisionYet(), List.of(new Reason(new RuleId("data_insufficient"), reds)), Confidence.LOW,
                LocalDate.of(2026, 10, 12), new CopyKey("decision.no_decision_yet.data_insufficient"));

        assertThat(CheckInQuestions.waitsForTheCycle(waiting)).isTrue();
        assertThat(CheckInQuestions.waitsForTheCycle(other)).isFalse();
    }
}
