package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/**
 * The calorie ladder (K-107). A cut moves in steps of cut_step_min_kcal, up or down (G7 K-97: under 500 is measurement
 * noise; the literature's 5-10 % loses to Güray, U14). A bulk moves in steps of bulk_step_kcal (G3 K-10), all from carbs:
 * macros follow from the new target with protein and fat held (K-108). Going down, the target never crosses BMR (move
 * more instead, G2 K-11), the low-energy floor (a smaller step, or none, J1 L2.1) or the macro floors (move more, ADR-020
 * L-11). Changes are at least calorie_change_min_wait_weeks apart (H3 B3). Whether calories may move at all is the
 * spine's call, where training — not the scale — is the gauge (G7 K-98, K-106).
 */
class CalorieLadderTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final Parameters MALE = parameters(Sex.MALE);
    private static final int CUT_STEP = MALE.wholeNumber(ParameterKey.CUT_STEP_MIN_KCAL);
    private static final int BULK_STEP = MALE.wholeNumber(ParameterKey.BULK_STEP_KCAL);
    private static final Reason NOT_TOWARD = new Reason(new RuleId("not_toward_goal"),
            new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE));
    private static final Reason GENETIC_LIMIT = new Reason(new RuleId("genetic_limit"),
            new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE));
    private static final Reason CUT_STEP_REASON = new Reason(new RuleId("cut_step"),
            new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-97", SourceTag.EXPERIENCE));
    private static final Reason BULK_STEP_REASON = new Reason(new RuleId("bulk_step"),
            new Source("arastirma/ham/guray/G3-kilo-alma-beslenme.md#K-10", SourceTag.EXPERIENCE));
    private static final int LOW_BMR = 1000;

    // ── the step ────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void aStalledCutGoesDownOneFullStep() {
        // Spec WC-04: 2400 → 1900 kcal.
        Decision decision = CalorieLadder.step(down(NOT_TOWARD), plan(Phase.CUT, 2400), LOW_BMR, MALE);

        assertThat(decision.action()).isEqualTo(new Action.AdjustCalories(-CUT_STEP));
        assertThat(decision.reasons()).containsExactly(NOT_TOWARD, CUT_STEP_REASON);
        assertThat(decision.copyKey()).isEqualTo(new CopyKey("decision.adjust_calories.not_toward_goal"));
    }

    @Test
    void aStalledBulkGoesUpAQuarterStepAllFromCarbs() {
        // Spec WC-14, G3 K-10: +250 kcal, protein and fat unchanged, carbs up ~62 g (250 / 4).
        Decision decision = CalorieLadder.step(up(NOT_TOWARD), plan(Phase.BULK, 2800), LOW_BMR, MALE);

        assertThat(decision.action()).isEqualTo(new Action.AdjustCalories(BULK_STEP));
        assertThat(decision.reasons()).containsExactly(NOT_TOWARD, BULK_STEP_REASON);
        Macros before = split(2800);
        Macros after = split(2800 + BULK_STEP);
        assertThat(after.proteinG()).isEqualTo(before.proteinG());
        assertThat(after.fatG()).isEqualTo(before.fatG());
        assertThat(after.carbsG() - before.carbsG()).isBetween(BULK_STEP / 4, BULK_STEP / 4 + 1);
    }

    @Test
    void theGeneticLimitPullsBackOneStepOfEachPhase() {
        // ADR-020 L-5: cut → a full step up (K-97 counts both directions); bulk → a bulk step down (G3 K-10's size).
        assertThat(CalorieLadder.step(up(GENETIC_LIMIT), plan(Phase.CUT, 2000), LOW_BMR, MALE).action())
                .isEqualTo(new Action.AdjustCalories(CUT_STEP));
        Decision bulk = CalorieLadder.step(down(GENETIC_LIMIT), plan(Phase.BULK, 3000), LOW_BMR, MALE);
        assertThat(bulk.action()).isEqualTo(new Action.AdjustCalories(-BULK_STEP));
        assertThat(bulk.copyKey()).isEqualTo(new CopyKey("decision.adjust_calories.genetic_limit"));
    }

    @Test
    void theNewPlanIsJudgedAfterAFullWindow() {
        // A calorie change starts a new plan; the next calorie call waits its whole decision window (J1 D1).
        int window = MALE.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);

        assertThat(CalorieLadder.step(down(NOT_TOWARD), plan(Phase.CUT, 2400), LOW_BMR, MALE).nextReview())
                .isEqualTo(TODAY.plusDays(window));
    }

    @Test
    void changesAreAtLeastTheMinimumWaitApart() {
        // H3 B3: at least calorie_change_min_wait_weeks between adjustments.
        int waitDays = 7 * MALE.wholeNumber(ParameterKey.CALORIE_CHANGE_MIN_WAIT_WEEKS);
        Snapshot tooSoon = plan(Phase.CUT, 2400, TODAY.minusDays(waitDays - 1L));
        Snapshot justInTime = plan(Phase.CUT, 2400, TODAY.minusDays(waitDays));

        Decision early = CalorieLadder.step(down(NOT_TOWARD), tooSoon, LOW_BMR, MALE);
        assertThat(early.action()).isEqualTo(new Action.NoDecisionYet());
        assertThat(early.reasons().getFirst()).isEqualTo(new Reason(new RuleId("calorie_change_too_soon"),
                new Source("arastirma/ham/H3-bosluk-literatur.md#B3", SourceTag.LITERATURE)));
        assertThat(early.nextReview()).isEqualTo(TODAY.plusDays(1));
        assertThat(CalorieLadder.step(down(NOT_TOWARD), justInTime, LOW_BMR, MALE).action())
                .isInstanceOf(Action.AdjustCalories.class);
    }

    // ── floors on the way down ──────────────────────────────────────────────────────────────────────────────

    @Test
    void aStepUnderBmrBecomesMoreMovement() {
        // Spec WC-12: 2000 - 500 = 1500 < BMR 1600 → food stays, movement goes up (G2 K-11).
        Decision decision = CalorieLadder.step(down(NOT_TOWARD), plan(Phase.CUT, 2000), 1600, MALE);

        assertThat(decision.action()).isEqualTo(new Action.ChangeMovement());
        assertThat(decision.reasons().getFirst().rule()).isEqualTo(new RuleId("bmr_floor"));
        assertThat(CalorieLadder.step(down(NOT_TOWARD), plan(Phase.CUT, 2100), 1600, MALE).action())
                .isEqualTo(new Action.AdjustCalories(-CUT_STEP));
    }

    @Test
    void aFullStepIntoTheLowEnergyBandIsNotTakenAndNotShortened() {
        // 80 kg at 25 % → 60 kg fat-free, 300 kcal exercise: the floor is 1801. From 2100 a full step would reach 1600.
        // A shorter step (-299) would be under K-97's minimum — measurement noise — so calories stay (J1 L2.1).
        Decision decision = CalorieLadder.step(down(NOT_TOWARD), fueled(2100), LOW_BMR, MALE);

        assertThat(decision.action()).isEqualTo(new Action.Continue());
        assertThat(decision.reasons().getFirst().rule()).isEqualTo(new RuleId("energy_floor"));
    }

    @Test
    void aFullStepThatStaysAboveTheFloorIsTaken() {
        // 2301 - 500 = 1801: exactly on the floor, which is out of the low band. 2300 would land one under it: hold.
        assertThat(CalorieLadder.step(down(NOT_TOWARD), fueled(2301), LOW_BMR, MALE).action())
                .isEqualTo(new Action.AdjustCalories(-CUT_STEP));
        assertThat(CalorieLadder.step(down(NOT_TOWARD), fueled(2300), LOW_BMR, MALE).action())
                .isEqualTo(new Action.Continue());
    }

    @Test
    void atTheEnergyFloorMovementIsNeverTheAnswerEvenUnderBmr() {
        // Review finding: with BMR 1400 the raw step 1801 - 500 = 1301 is under BMR, but "move more" would lower energy
        // availability further. The low-energy floor is looked at first.
        assertThat(CalorieLadder.step(down(NOT_TOWARD), fueled(1801), 1400, MALE).action()).isEqualTo(new Action.Continue());
        assertThat(CalorieLadder.step(down(NOT_TOWARD), fueled(2200), 1800, MALE).action()).isEqualTo(new Action.Continue());
    }

    @Test
    void aCutStepComesOutOfCarbsWhileFatStaysAtItsCeiling() {
        // The card: fat to 1 g/kg first, then carbs are the lever (03 §2.3, G3 K-22). 2400 → 1900: protein and fat held,
        // carbs down 125 g (500 / 4). G7 K-117 ("take it from fat") conflicts; see the class note.
        Macros before = split(2400);
        Macros after = split(2400 - CUT_STEP);

        assertThat(after.proteinG()).isEqualTo(before.proteinG());
        assertThat(after.fatG()).isEqualTo(before.fatG());
        assertThat(before.carbsG() - after.carbsG()).isEqualTo(CUT_STEP / 4);
    }

    @Test
    void atTheLowEnergyFloorCaloriesStay() {
        // No room above the floor: no cut, and no extra exercise either (it would lower energy availability further).
        Decision decision = CalorieLadder.step(down(NOT_TOWARD), fueled(1801), LOW_BMR, MALE);

        assertThat(decision.action()).isEqualTo(new Action.Continue());
        assertThat(decision.reasons().getFirst()).isEqualTo(new Reason(new RuleId("energy_floor"),
                new Source("arastirma/ham/J1-cinsiyet.md#L2.1", SourceTag.LITERATURE)));
        assertThat(decision.copyKey()).isEqualTo(new CopyKey("decision.continue.energy_floor"));
    }

    @Test
    void aStepUnderTheMacroFloorsBecomesMoreMovement() {
        // ADR-020 L-11: 80 kg needs 160 g protein, 40 g fat and 50 g carbs at least = 1200 kcal. 1650 - 500 = 1150.
        Decision decision = CalorieLadder.step(down(NOT_TOWARD), plan(Phase.CUT, 1650), LOW_BMR, MALE);

        assertThat(decision.action()).isEqualTo(new Action.ChangeMovement());
        assertThat(decision.reasons().getFirst().rule()).isEqualTo(new RuleId("carb_squeeze"));
        assertThat(decision.copyKey()).isEqualTo(new CopyKey("decision.change_movement.carb_squeeze"));
    }

    @Test
    void aWomanFrom45HasTheHigherProteinFloorUnderHerStep() {
        // 70 kg, 2.2 g/kg from 45 → 154 g + 53 g fat (0.75 g/kg) + 50 g carbs = 1293 kcal; at 44 → 1237. 1750 - 500 = 1250.
        Parameters female = parameters(Sex.FEMALE);
        assertThat(CalorieLadder.step(down(NOT_TOWARD), woman(1750, 44), LOW_BMR, female).action())
                .isEqualTo(new Action.AdjustCalories(-CUT_STEP));
        Decision at45 = CalorieLadder.step(down(NOT_TOWARD), woman(1750, 45), LOW_BMR, female);
        assertThat(at45.action()).isEqualTo(new Action.ChangeMovement());
        assertThat(at45.reasons().getFirst().rule()).isEqualTo(new RuleId("carb_squeeze"));
    }

    @Test
    void aWomansHigherFatFloorAlsoLimitsTheStep() {
        // 70 kg, 30 y: 140 g protein + 53 g fat (0.75 g/kg) + 50 g carbs = 1237. 1720 - 500 = 1220.
        assertThat(CalorieLadder.step(down(NOT_TOWARD), woman(1720, 30), LOW_BMR, parameters(Sex.FEMALE)).action())
                .isEqualTo(new Action.ChangeMovement());
    }

    @Test
    void aBulkPulledBackByTheGeneticLimitStillRespectsTheEnergyFloor() {
        // 60 kg fat-free, 300 kcal exercise: floor 1801. 2000 - 250 = 1750 is in the low band; 2051 - 250 = 1801 is not.
        Snapshot bulk = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(21), series(EngineFixtures.daily(TODAY.minusDays(30), TODAY, "80.0")),
                Optional.of(new BigDecimal("25"))).withEnergy(new EnergyBudget(2000, 300)).withProfile(new Profile(30, 180));

        assertThat(CalorieLadder.step(down(GENETIC_LIMIT), bulk, LOW_BMR, MALE).action()).isEqualTo(new Action.Continue());
        assertThat(CalorieLadder.step(down(GENETIC_LIMIT), bulk.withEnergy(new EnergyBudget(2051, 300)), LOW_BMR, MALE).action())
                .isEqualTo(new Action.AdjustCalories(-BULK_STEP));
    }

    @Test
    void goingUpNeedsNoFloor() {
        // A bulk step up from a low plan is never blocked by BMR or macro floors.
        assertThat(CalorieLadder.step(up(NOT_TOWARD), plan(Phase.BULK, 1100), 1600, MALE).action())
                .isEqualTo(new Action.AdjustCalories(BULK_STEP));
    }

    // ── what the ladder needs ───────────────────────────────────────────────────────────────────────────────

    @Test
    void aStepNeedsTheCurrentTargetAndAProfile() {
        Snapshot noPlan = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(30), series(EngineFixtures.daily(TODAY.minusDays(30), TODAY, "80.0")))
                .withProfile(new Profile(30, 180));
        Snapshot noProfile = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(30), series(EngineFixtures.daily(TODAY.minusDays(30), TODAY, "80.0")))
                .withEnergy(new EnergyBudget(2400, 300));

        assertThatThrownBy(() -> CalorieLadder.step(down(NOT_TOWARD), noPlan, LOW_BMR, MALE))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("target");
        assertThatThrownBy(() -> CalorieLadder.step(down(NOT_TOWARD), noProfile, LOW_BMR, MALE))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("profile");
    }

    @Test
    void everyCopyKeyItCanReturnHasATitleAndBodyInEnJson() {
        for (String key : List.of("decision.adjust_calories.not_toward_goal", "decision.adjust_calories.genetic_limit",
                "decision.continue.energy_floor", "decision.no_decision_yet.calorie_change_too_soon",
                "decision.change_movement.carb_squeeze")) {
            assertThat(EngineFixtures.copyGroup(new CopyKey(key))).as(key)
                    .hasEntrySatisfying("title", title -> assertThat(title).isInstanceOf(String.class))
                    .hasEntrySatisfying("body", body -> assertThat(body).isInstanceOf(String.class));
        }
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    @Property
    boolean aStepDownNeverCrossesBmrOrGoesFurtherThanOneStep(@ForAll @IntRange(min = 1100, max = 4000) int target,
            @ForAll @IntRange(min = 900, max = 2200) int bmr) {
        Decision decision = CalorieLadder.step(down(NOT_TOWARD), plan(Phase.CUT, target), bmr, MALE);
        if (!(decision.action() instanceof Action.AdjustCalories(int kcal))) {
            return true;
        }
        return kcal < 0 && kcal >= -CUT_STEP && target + kcal >= bmr;
    }

    @Property
    boolean aStepDownIsAlwaysAFullStep(@ForAll @IntRange(min = 1100, max = 4000) int target,
            @ForAll @IntRange(min = 900, max = 2200) int bmr) {
        // K-97: under the minimum step is noise; floors stop a step, they never shorten it.
        Decision decision = CalorieLadder.step(down(NOT_TOWARD), fueled(target), bmr, MALE);
        return !(decision.action() instanceof Action.AdjustCalories(int kcal)) || kcal == -CUT_STEP;
    }

    @Property
    boolean aStepDownNeverLandsInTheLowEnergyBand(@ForAll @IntRange(min = 1500, max = 3500) int target) {
        Snapshot snapshot = fueled(target);
        Decision decision = CalorieLadder.step(down(NOT_TOWARD), snapshot, LOW_BMR, MALE);
        if (!(decision.action() instanceof Action.AdjustCalories(int kcal))) {
            return true;
        }
        Snapshot after = snapshot.withEnergy(new EnergyBudget(target + kcal, 300));
        return SafetyNet.energyAvailability(after, MALE).filter(band -> band != EnergyAvailability.LOW).isPresent();
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    private static SpineResult.CaloriesNeeded down(Reason why) {
        return new SpineResult.CaloriesNeeded(CalorieDirection.DOWN, List.of(why));
    }

    private static SpineResult.CaloriesNeeded up(Reason why) {
        return new SpineResult.CaloriesNeeded(CalorieDirection.UP, List.of(why));
    }

    private static Snapshot plan(Phase phase, int targetKcal) {
        return plan(phase, targetKcal, TODAY.minusDays(21));
    }

    /** 80 kg every morning for 30 days, a 30-year-old at 180 cm, the plan's target and 300 kcal of exercise a day. */
    private static Snapshot plan(Phase phase, int targetKcal, LocalDate planStart) {
        return new Snapshot(TODAY, Sex.MALE, phase, planStart, series(EngineFixtures.daily(TODAY.minusDays(30), TODAY, "80.0")))
                .withEnergy(new EnergyBudget(targetKcal, 300)).withProfile(new Profile(30, 180));
    }

    /** As {@link #plan} on a cut, with an internal fat estimate of 25 %, so the low-energy floor is known (1801 kcal). */
    private static Snapshot fueled(int targetKcal) {
        return new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(21), series(EngineFixtures.daily(TODAY.minusDays(30), TODAY, "80.0")),
                Optional.of(new BigDecimal("25"))).withEnergy(new EnergyBudget(targetKcal, 300)).withProfile(new Profile(30, 180));
    }

    private static Snapshot woman(int targetKcal, int age) {
        return new Snapshot(TODAY, Sex.FEMALE, Phase.CUT, TODAY.minusDays(21), series(EngineFixtures.daily(TODAY.minusDays(30), TODAY, "70.0")))
                .withEnergy(new EnergyBudget(targetKcal, 300)).withProfile(new Profile(age, 165));
    }

    private static Macros split(int kcal) {
        return ((MacroResult.Split) MacroTargets.forTarget(kcal, new BigDecimal("80"), Sex.MALE, 30, MALE)).macros();
    }
}
