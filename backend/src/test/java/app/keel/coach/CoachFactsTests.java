package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.decision.CallFacts;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** What the conversational coach is told (ADR-092 #1): the call, its rules' numbers, this week's counts and a few words — no dates, no name. */
class CoachFactsTests {

    @Test
    void theCallItsRulesNumbersAndTheSurroundingsAreTold() {
        CoachFacts facts = CoachFacts.of(ReplyValidatorTests.CUT);

        assertThat(facts.json()).startsWith("FACTS: {").contains("\"type\":\"ADJUST_CALORIES\"", "\"kcalPerDay\":-500", "\"rule\":\"not_toward_goal\"",
                "\"source\":\"EXPERIENCE\"", "\"kgPerWeek\":0.1", "\"weeks\":3", "\"confidence\":\"MEDIUM\"", "\"training\":{", "\"goal\":\"LOSE_FAT\"");
        assertThat(facts.numbers()).extracting(BigDecimal::toPlainString).contains("-500", "0.1", "3", "4", "1");
    }

    @Test
    void noDateIsToldAndNoResearchPathOrName() {
        CallFacts dated = new CallFacts(ReplyValidatorTests.CUT.id(), LocalDate.of(2026, 10, 5), Map.of("type", "ADD_TRAINING_DAY", "suggested", List.of("2026-10-07", "MONDAY"),
                "since", "2026-10-05"), ReplyValidatorTests.CUT.reasons(), "HIGH", LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 19), "decision.x", true);

        String json = CoachFacts.of(dated).json();

        assertThat(json).doesNotContain("2026", "-10-", "arastirma/").contains("MONDAY");
    }

    @Test
    void aCallWithoutSurroundingsIsStillTold() {
        CallFacts bare = new CallFacts(ReplyValidatorTests.CUT.id(), LocalDate.of(2026, 10, 5), Map.of("type", "CONTINUE"), List.of(), "HIGH",
                LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 19), "decision.x", true);

        assertThat(CoachFacts.of(bare).json()).contains("CONTINUE").doesNotContain("\"week\"", "\"profile\"");
        assertThat(CoachFacts.of(bare).numbers()).isEmpty();
    }

    @Test
    void whyAMoveFeltHeavyIsToldAsTheEngineReadsIt() {
        // K-1265 (ADR-096 #4): each move's effort and the workouts it went lighter in; their counts are numbers the reply may say.
        Map<String, Object> effort = Map.of("windowDays", 28, "moves", List.of(Map.of("move", "squat", "effort", "RISING", "wentLighterWorkouts", 2)));

        CoachFacts facts = CoachFacts.of(ReplyValidatorTests.CUT, List.of(), effort);

        assertThat(facts.json()).contains("\"effort\":{", "\"move\":\"squat\"", "\"effort\":\"RISING\"", "\"wentLighterWorkouts\":2", "\"windowDays\":28");
        assertThat(facts.numbers()).extracting(BigDecimal::toPlainString).contains("28", "2");
        assertThat(CoachFacts.of(ReplyValidatorTests.CUT, List.of(), Map.of()).json()).as("nothing read: nothing told").doesNotContain("\"effort\"");
    }
}
