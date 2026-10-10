package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Decision;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.SafetyNet;
import app.keel.engine.Sex;
import app.keel.engine.WeighIn;
import app.keel.engine.WeightSeries;
import app.keel.engine.Snapshot;
import java.util.ArrayList;
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
        for (String rule : List.of("not_toward_goal", "toward_goal", "stall_window", "bulk_stall", "wait_one_more_week", "genetic_limit",
                "weight_steady_waist_down")) {
            assertThat(ReasonFacts.of(rule, WINDOW, null, Map.of())).as(rule).isEqualTo(Map.of("kgPerWeek", new BigDecimal("0.0"), "weeks", 3));
        }
        DecisionBasis losing = basis(THREE_WEEKS, new BigDecimal("-0.6667"), null, null);
        assertThat(ReasonFacts.of("stall_window", losing, null, Map.of())).as("one decimal, the sign as read")
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
    void aSafetyCallSaysItsOwnStepNotAWindowItNeverRead() {
        // The real safety net's calls (U1): they judge the trend a week and eight weeks back, never the decision window, so no
        // window figure is theirs to say. What they carry is the size of the step.
        Parameters male = RepositoryParameters.set().forSex(Sex.MALE);
        LocalDate today = LocalDate.of(2026, 10, 26);
        // 70.9 kg a week ago, 70.0 now: over the weekly cap.
        List<WeighIn> weighIns = new ArrayList<>(days(today.minusDays(40), today.minusDays(7), "70.9"));
        weighIns.addAll(days(today.minusDays(6), today, "70.0"));
        Snapshot cut = new Snapshot(today, Sex.MALE, Phase.CUT, today.minusDays(60), new WeightSeries(weighIns));
        Decision made = SafetyNet.check(cut, male).orElseThrow();
        Map<String, Object> kept = DecisionJson.of(made);
        DecisionBasis read = DecisionBasis.of(StoredSnapshot.of(cut), male);

        assertThat(made.reasons()).extracting(reason -> reason.rule().value()).contains("loss_rate_cap");
        for (var reason : made.reasons()) {
            String rule = reason.rule().value();
            assertThat(ReasonFacts.of(rule, read, null, kept).keySet()).as(rule).isEqualTo(ReasonFacts.keysOf(rule));
        }
        assertThat(ReasonFacts.of("loss_rate_cap", read, null, kept)).isEqualTo(Map.of("kcal", 500));
        assertThat(ReasonFacts.keysOf("rapid_loss")).containsExactly("kcal");
        assertThat(ReasonFacts.keysOf("loss_rate_cap")).containsExactly("kcal");
    }

    private static List<WeighIn> days(LocalDate first, LocalDate last, String kg) {
        List<WeighIn> weighIns = new ArrayList<>();
        for (LocalDate day = first; !day.isAfter(last); day = day.plusDays(1)) {
            weighIns.add(new WeighIn(day, new BigDecimal(kg)));
        }
        return weighIns;
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
