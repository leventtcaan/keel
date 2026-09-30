package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

/** The spine names the answer it waits for (K-213): training or recovery; nothing else is a question. */
class MissingAnswerTests {

    @Test
    void theSpinesCheckInNeedsAreItsQuestions() {
        assertThat(WeeklySpine.missingAnswer(waiting(WeeklySpine.CHECK_IN_NEEDED_TRAINING))).contains(WeeklySpine.Missing.TRAINING);
        assertThat(WeeklySpine.missingAnswer(waiting(WeeklySpine.CHECK_IN_NEEDED_RECOVERY))).contains(WeeklySpine.Missing.RECOVERY);
    }

    @Test
    void adherenceAndEverythingElseAreNotQuestions() {
        assertThat(WeeklySpine.missingAnswer(waiting(WeeklySpine.CHECK_IN_NEEDED_ADHERENCE))).isEmpty();
        assertThat(WeeklySpine.missingAnswer(new Decision(new Action.Continue(), List.of(new Reason(WeeklySpine.CHECK_IN_NEEDED_TRAINING,
                new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE))), Confidence.MEDIUM, LocalDate.of(2026, 10, 5),
                new CopyKey("decision.continue")))).as("not a pause").isEmpty();
    }

    private static Decision waiting(RuleId rule) {
        return new Decision(new Action.NoDecisionYet(), List.of(new Reason(rule, new Source("arastirma/03-guray-karar-omurgasi.md#2.4",
                SourceTag.EXPERIENCE))), Confidence.MEDIUM, LocalDate.of(2026, 10, 5), new CopyKey("decision.no_decision_yet.x"));
    }
}
