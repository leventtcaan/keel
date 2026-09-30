package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

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
import java.time.LocalDate;
import java.util.List;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

/**
 * Which questions a check-in asks (K-213, U9, 04 §8.5 CAT): only what the engine would wait for, found by running it on
 * what the data already says and on each possible answer; no more than the week's budget — larger when the data
 * disagrees with itself.
 */
class QuestionBudgetTests {

    // The spine's order (03 §2.4): training first; if training is not declining, recovery.
    private static final Function<CheckIn, Decision> SPINE = checkIn -> {
        if (checkIn.training() == CheckIn.Training.UNKNOWN) {
            return waiting("check_in_needed_training");
        }
        if (checkIn.training() != CheckIn.Training.DECLINING && checkIn.recovery() == CheckIn.Recovery.UNKNOWN) {
            return waiting("check_in_needed_recovery");
        }
        return decided();
    };

    @Test
    void theQuestionsAreWhatTheEngineWouldWaitForInItsOrder() {
        assertThat(CheckInQuestions.needed(SPINE, CheckIn.NONE, 2)).containsExactly(Answers.Kind.TRAINING, Answers.Kind.RECOVERY);
    }

    @Test
    void theBudgetStopsTheList() {
        assertThat(CheckInQuestions.needed(SPINE, CheckIn.NONE, 1)).containsExactly(Answers.Kind.TRAINING);
    }

    @Test
    void whatTheDataAlreadySaysIsNotAsked() {
        CheckIn trainingKnown = new CheckIn(CheckIn.Look.UNKNOWN, CheckIn.Training.STABLE, CheckIn.Recovery.UNKNOWN, CheckIn.Waist.UNKNOWN,
                java.util.Optional.empty(), CheckIn.Appetite.UNKNOWN);

        assertThat(CheckInQuestions.needed(SPINE, trainingKnown, 2)).containsExactly(Answers.Kind.RECOVERY);
        assertThat(CheckInQuestions.needed(checkIn -> decided(), CheckIn.NONE, 2)).as("a call without questions").isEmpty();
    }

    @Test
    void theDataDisagreeingWithItselfOpensTheLargerBudget() {
        assertThat(CheckInQuestions.anomaly(with(CheckIn.Look.WORSE, CheckIn.Waist.UNKNOWN), Phase.CUT)).isTrue();
        assertThat(CheckInQuestions.anomaly(with(CheckIn.Look.UNKNOWN, CheckIn.Waist.UP), Phase.CUT)).isTrue();
        assertThat(CheckInQuestions.anomaly(with(CheckIn.Look.UNKNOWN, CheckIn.Waist.DOWN), Phase.BULK)).isTrue();
        assertThat(CheckInQuestions.anomaly(with(CheckIn.Look.BETTER, CheckIn.Waist.DOWN), Phase.CUT)).isFalse();
        assertThat(CheckInQuestions.anomaly(with(CheckIn.Look.SAME, CheckIn.Waist.FLAT), Phase.BULK)).isFalse();
    }

    @Test
    void aQuestionSaysWhyItIsAsked() {
        // U9: every question comes with the reason it is asked.
        assertThat(CheckInQuestions.describe(Answers.Kind.TRAINING)).isEqualTo(new CheckInQuestions.Question(Answers.Kind.TRAINING, "CHOICE",
                List.of("IMPROVING", "STABLE", "DECLINING"), "checkIn.question.training", "checkIn.reason.training"));
        assertThat(CheckInQuestions.describe(Answers.Kind.RECOVERY).choices()).containsExactly("GOOD", "POOR");
    }

    private static CheckIn with(CheckIn.Look look, CheckIn.Waist waist) {
        return new CheckIn(look, CheckIn.Training.UNKNOWN, CheckIn.Recovery.UNKNOWN, waist, java.util.Optional.empty(), CheckIn.Appetite.UNKNOWN);
    }

    private static Decision waiting(String rule) {
        return new Decision(new Action.NoDecisionYet(), List.of(new Reason(new RuleId(rule),
                new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE))), Confidence.MEDIUM, LocalDate.of(2026, 10, 5),
                new CopyKey("decision.no_decision_yet.x"));
    }

    private static Decision decided() {
        return new Decision(new Action.Continue(), List.of(new Reason(new RuleId("toward_goal"),
                new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE))), Confidence.MEDIUM, LocalDate.of(2026, 10, 5),
                new CopyKey("decision.continue"));
    }
}
