package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.CheckIn.Training;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * "What would change the call" (K-610, L3 Y3, prototype 5.6): the same rules on example data — a week from the call, its
 * trend toward the goal or flat, the plan kept or not, training holding or dropping. The call's own data is not touched;
 * the example is a Snapshot of its own (U1: the engine, no model; U2: which data would change it).
 */
class WhatIfTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final Parameters MALE = parameters(Sex.MALE);
    private static final CheckIn ON_PLAN = CheckIn.NONE.withAdherence(new BigDecimal("0.9")).withTraining(Training.STABLE);

    /** A man three weeks flat on a cut: today's call is a calorie step. */
    private static final Snapshot FLAT_CUT = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(20), weekly("80.0", "80.0", "80.0"))
            .withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(2600, 300)).withProfile(new Profile(30, 180));

    @Test
    void everyCombinationOfNextWeekIsRunThroughTheRules() {
        List<WhatIf.Scenario> scenarios = WhatIf.scenarios(FLAT_CUT, MALE);

        assertThat(scenarios).hasSize(8).extracting(WhatIf.Scenario::when).doesNotHaveDuplicates();
    }

    @Test
    void whatEachNextWeekWouldCall() {
        // The prototype's rows: flat with the plan kept → a calorie step; toward the goal → no change; the plan not kept →
        // the plan first; training dropping → training first, no calorie change.
        assertThat(decide(WhatIf.Trend.FLAT, WhatIf.Adherence.ON_TRACK, WhatIf.Training.HOLDING).action()).isEqualTo(new Action.AdjustCalories(-500));
        assertThat(decide(WhatIf.Trend.TOWARD_GOAL, WhatIf.Adherence.ON_TRACK, WhatIf.Training.HOLDING).action()).isEqualTo(new Action.Continue());
        assertThat(decide(WhatIf.Trend.FLAT, WhatIf.Adherence.UNDER, WhatIf.Training.HOLDING).copyKey())
                .as("the plan not kept is the plan-missed rule, not the partial one (K-610 review)").isEqualTo(new CopyKey("decision.fix_adherence.adherence_low"));
        assertThat(decide(WhatIf.Trend.FLAT, WhatIf.Adherence.ON_TRACK, WhatIf.Training.DROPPING).action()).isEqualTo(new Action.FixTraining());
    }

    @Test
    void aBulkTowardItsGoalIsMovingAndAFlatOneIsNot() {
        Snapshot flatBulk = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(20), weekly("70.0", "70.0", "70.0"))
                .withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(3000, 300)).withProfile(new Profile(30, 180));
        WhatIf.When toward = new WhatIf.When(WhatIf.Trend.TOWARD_GOAL, WhatIf.Adherence.ON_TRACK, WhatIf.Training.HOLDING);
        WhatIf.When flat = new WhatIf.When(WhatIf.Trend.FLAT, WhatIf.Adherence.ON_TRACK, WhatIf.Training.HOLDING);
        List<WhatIf.Scenario> scenarios = WhatIf.scenarios(flatBulk, MALE);

        assertThat(scenarios.stream().filter(s -> s.when().equals(toward)).findFirst().orElseThrow().decision().action()).isEqualTo(new Action.Continue());
        assertThat(scenarios.stream().filter(s -> s.when().equals(flat)).findFirst().orElseThrow().decision().action()).isEqualTo(new Action.AdjustCalories(250));
    }

    @Test
    void onALightCutTowardTheGoalIsNeverOverTheWeeklyLossCap() {
        // K-610 review: a fixed step was over 1 % of bodyweight under about 73 kg — "move toward your goal" read as losing
        // too fast. The cut's step is a share of the cap (min(weekly_loss_cap_kg, weekly_loss_cap_pct_bodyweight)).
        Snapshot lightCut = new Snapshot(TODAY, Sex.FEMALE, Phase.CUT, TODAY.minusDays(27), weekly("62.0", "62.0", "62.0", "62.0"))
                .withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(1900, 200)).withProfile(new Profile(30, 165)).withFatProxyPct(new BigDecimal("30"));
        WhatIf.When toward = new WhatIf.When(WhatIf.Trend.TOWARD_GOAL, WhatIf.Adherence.ON_TRACK, WhatIf.Training.HOLDING);

        Decision decision = WhatIf.scenarios(lightCut, parameters(Sex.FEMALE)).stream().filter(s -> s.when().equals(toward)).findFirst().orElseThrow()
                .decision();

        assertThat(decision.action()).isEqualTo(new Action.Continue());
        // At 48 kg the percentage binds (1 % is under the 1 kg cap): half of 1 kg would already be over it.
        Snapshot lighter = new Snapshot(TODAY, Sex.FEMALE, Phase.CUT, TODAY.minusDays(27), weekly("48.0", "48.0", "48.0", "48.0"))
                .withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(1700, 200)).withProfile(new Profile(30, 150)).withFatProxyPct(new BigDecimal("30"));
        assertThat(WhatIf.scenarios(lighter, parameters(Sex.FEMALE)).stream().filter(s -> s.when().equals(toward)).findFirst().orElseThrow()
                .decision().action()).isEqualTo(new Action.Continue());
    }

    @Test
    void theExampleIsAWeekLaterAndTheCallsOwnDataIsUntouched() {
        Snapshot example = WhatIf.example(FLAT_CUT, new WhatIf.When(WhatIf.Trend.FLAT, WhatIf.Adherence.ON_TRACK, WhatIf.Training.HOLDING), MALE);

        assertThat(example.today()).isEqualTo(TODAY.plusDays(7));
        assertThat(example.weights().between(TODAY.plusDays(1), TODAY.plusDays(7))).hasSize(7);
        assertThat(FLAT_CUT.today()).isEqualTo(TODAY);
        assertThat(FLAT_CUT.weights().between(TODAY.plusDays(1), TODAY.plusDays(7))).isEmpty();
    }

    @Test
    void theSameCallAndChoicesGiveTheSameAnswer() {
        assertThat(WhatIf.scenarios(FLAT_CUT, MALE)).isEqualTo(WhatIf.scenarios(FLAT_CUT, MALE));
    }

    private static Decision decide(WhatIf.Trend trend, WhatIf.Adherence adherence, WhatIf.Training training) {
        WhatIf.When when = new WhatIf.When(trend, adherence, training);
        return WhatIf.scenarios(FLAT_CUT, MALE).stream().filter(scenario -> scenario.when().equals(when)).findFirst().orElseThrow().decision();
    }

    private static WeightSeries weekly(String... kgs) {
        LocalDate first = TODAY.minusDays(7L * kgs.length - 1);
        List<WeighIn> weighIns = new ArrayList<>();
        for (int week = 0; week < kgs.length; week++) {
            weighIns.addAll(EngineFixtures.daily(first.plusDays(7L * week), first.plusDays(7L * week + 6), kgs[week]));
        }
        return series(weighIns);
    }
}
