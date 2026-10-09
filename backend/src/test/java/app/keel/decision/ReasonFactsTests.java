package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Phase;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Each reason's facts (K-1000, ADR-077 #3 "two reasons: the data and the rule"): the numbers the rule read, from the call's
 * own kept data (its basis, its first week, its action), for the app's short line ("decision.ruleShort.<rule>"). The
 * server writes the numbers, the app the words (U1). A rule with nothing of its own to count has none.
 */
class ReasonFactsTests {

    private static final LocalDate MONDAY = LocalDate.of(2026, 12, 28);
    private static final List<DecisionBasis.WeekMean> THREE_WEEKS = List.of(new DecisionBasis.WeekMean(MONDAY.minusDays(15), new BigDecimal("82.4")),
            new DecisionBasis.WeekMean(MONDAY.minusDays(8), new BigDecimal("82.3")), new DecisionBasis.WeekMean(MONDAY.minusDays(1), new BigDecimal("82.35")));
    private static final DecisionBasis WINDOW = basis(THREE_WEEKS, new BigDecimal("-0.025"), null, null);

    @Test
    void aRuleOnTheWeightWindowSaysTheChangeAWeekAndTheWeeksRead() {
        for (String rule : List.of("not_toward_goal", "toward_goal", "stall_window", "bulk_stall", "wait_one_more_week", "genetic_limit", "rapid_loss",
                "loss_rate_cap", "weight_steady_waist_down")) {
            assertThat(ReasonFacts.of(rule, WINDOW, null, Map.of())).as(rule).isEqualTo(Map.of("kgPerWeek", new BigDecimal("0.0"), "weeks", 3));
        }
        DecisionBasis losing = basis(THREE_WEEKS, new BigDecimal("-0.6667"), null, null);
        assertThat(ReasonFacts.of("rapid_loss", losing, null, Map.of())).as("one decimal, the sign as read")
                .isEqualTo(Map.of("kgPerWeek", new BigDecimal("-0.7"), "weeks", 3));
    }

    @Test
    void anAdherenceRuleSaysWhatWasDoneOfWhatWasPlanned() {
        DecisionBasis counted = basis(List.of(), null, new DecisionBasis.AdherenceCount(9, 19), null);

        assertThat(ReasonFacts.of("adherence_low", counted, null, Map.of())).isEqualTo(Map.of("done", 9, "planned", 19));
        assertThat(ReasonFacts.of("adherence_partial", counted, null, Map.of())).isEqualTo(Map.of("done", 9, "planned", 19));
        // A call kept before the counts (K-526) has none: no fact is made up from the share.
        assertThat(ReasonFacts.of("adherence_low", basis(List.of(), null, null, null), null, Map.of())).isEmpty();
    }

    @Test
    void theFirstWeeksRulesSayTheSessionsDoneOfThePlanned() {
        StoredSnapshot.FirstWeek week = new StoredSnapshot.FirstWeek(3, 2, 3, List.of(java.time.DayOfWeek.WEDNESDAY), null, List.of());

        for (String rule : List.of("first_week_on_track", "first_week_add_day", "first_week_move_missed")) {
            assertThat(ReasonFacts.of(rule, basis(List.of(), null, null, null), week, Map.of())).as(rule).isEqualTo(Map.of("done", 2, "planned", 3));
        }
    }

    @Test
    void aTrainingRuleSaysHowLongTheLiftHasStalled() {
        DecisionBasis stalled = basis(List.of(), null, null, new StoredSnapshot.Training(3, 2, 0, false, false, 1));

        assertThat(ReasonFacts.of("plateau", stalled, null, Map.of())).isEqualTo(Map.of("sessions", 3));
        assertThat(ReasonFacts.of("performance_red_flag", stalled, null, Map.of())).isEqualTo(Map.of("sessions", 3));
        assertThat(ReasonFacts.of("load_held_still_stalled", stalled, null, Map.of())).isEqualTo(Map.of("weeks", 2));
        assertThat(ReasonFacts.of("plan_missed", stalled, null, Map.of())).isEqualTo(Map.of("weeks", 1));
    }

    @Test
    void aCalorieStepSaysItsSize() {
        Map<String, Object> cut = Map.of("action", Map.of("type", "ADJUST_CALORIES", "kcalPerDay", -500));
        Map<String, Object> narrowed = Map.of("action", Map.of("type", "INCREASE_CALORIES", "kcalPerDay", 250));

        assertThat(ReasonFacts.of("cut_step", basis(List.of(), null, null, null), null, cut)).isEqualTo(Map.of("kcal", 500));
        assertThat(ReasonFacts.of("bulk_step", basis(List.of(), null, null, null), null, cut)).isEqualTo(Map.of("kcal", 500));
        assertThat(ReasonFacts.of("loss_rate_cap", basis(List.of(), null, null, null), null, narrowed)).isEqualTo(Map.of("kcal", 250));
    }

    @Test
    void aRuleWithNothingOfItsOwnToCountHasNoFacts() {
        for (String rule : List.of("energy_floor", "declared_context", "observing", "training_first", "low_energy_safety")) {
            assertThat(ReasonFacts.of(rule, WINDOW, null, Map.of())).as(rule).isEmpty();
        }
    }

    private static DecisionBasis basis(List<DecisionBasis.WeekMean> weeks, BigDecimal change, DecisionBasis.AdherenceCount count, StoredSnapshot.Training training) {
        return new DecisionBasis(Phase.CUT, weeks, change, null, count, null, training, null, null);
    }
}
