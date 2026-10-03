package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Action;
import app.keel.engine.ParameterDomain;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.Sex;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;

/**
 * What applying a call does to the plan (K-216, U3): the one thing the call is about moves, everything else stays — and
 * the targets the user follows are read from the plan.
 */
class ApplyDecisionTests {

    private static final Parameters P = engineParameters().forSex(Sex.MALE);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 5);
    private static final CallStore.Plan CUT = new CallStore.Plan(Phase.CUT, LocalDate.of(2026, 8, 3), LocalDate.of(2026, 9, 7), 2600, false, null);

    @Test
    void aCalorieCallMovesOnlyTheTargetAndStartsItsWait() {
        // The ladder waits calorie_change_min_wait_weeks from the day the target began (K-107): the plan starts today.
        assertThat(PlanChange.after(CUT, new Action.AdjustCalories(-500), TODAY, P, Optional.empty()))
                .contains(new CallStore.Plan(Phase.CUT, CUT.phaseStart(), TODAY, 2100, false, null));
        assertThat(PlanChange.after(CUT, new Action.IncreaseCalories(250), TODAY, P, Optional.empty()))
                .contains(new CallStore.Plan(Phase.CUT, CUT.phaseStart(), TODAY, 2850, false, null));
    }

    @Test
    void aCalorieCallEndsTheWatchOfTheStartingEstimate() {
        // A target the engine moved is no longer the formula's estimate being observed (K-114).
        CallStore.Plan watched = new CallStore.Plan(Phase.BULK, TODAY.minusDays(30), TODAY.minusDays(30), 2700, true, 9000);

        assertThat(PlanChange.after(watched, new Action.AdjustCalories(250), TODAY, P, Optional.empty()))
                .contains(new CallStore.Plan(Phase.BULK, watched.phaseStart(), TODAY, 2950, false, 9000));
    }

    @Test
    void theDayATargetBeganNeverMovesBack() {
        // A time zone moved west can make today earlier than the plan's start: the ladder's wait (K-107) must not shrink,
        // and phase_start ≤ plan_start must hold.
        CallStore.Plan startsTomorrow = new CallStore.Plan(Phase.CUT, TODAY.minusDays(30), TODAY.plusDays(1), 2600, false, null);
        CallStore.Plan startsToday = new CallStore.Plan(Phase.CUT, TODAY.minusDays(30), TODAY, 2600, false, null);

        assertThat(PlanChange.after(startsTomorrow, new Action.AdjustCalories(-500), TODAY, P, Optional.empty())).hasValueSatisfying(plan ->
                assertThat(plan.planStart()).isEqualTo(TODAY.plusDays(1)));
        assertThat(PlanChange.after(startsToday, new Action.AdjustCalories(-500), TODAY, P, Optional.empty())).hasValueSatisfying(plan ->
                assertThat(plan.planStart()).isEqualTo(TODAY));
    }

    @Test
    void aCalorieCallWithNothingToMoveOrNothingLeftIsNotApplied() {
        // The engine does neither (plan_target_needed; its floors); if it ever did, CONFLICT — not an NPE or a
        // target_kcal > 0 violation, both 500s.
        CallStore.Plan noTarget = new CallStore.Plan(Phase.CUT, TODAY, TODAY, null, true, null);

        assertThat(PlanChange.after(noTarget, new Action.AdjustCalories(-500), TODAY, P, Optional.empty())).isEmpty();
        assertThat(PlanChange.after(CUT, new Action.AdjustCalories(-2600), TODAY, P, Optional.empty())).isEmpty();
        assertThat(PlanChange.after(CUT, new Action.AdjustCalories(-2599), TODAY, P, Optional.empty())).hasValueSatisfying(plan ->
                assertThat(plan.targetKcal()).isEqualTo(1));
    }

    @Test
    void moreMovementRaisesOnlyTheStepTarget() {
        int raised = P.wholeNumber(ParameterKey.STEPS_TARGET_RAISED);

        assertThat(PlanChange.after(CUT, new Action.ChangeMovement(), TODAY, P, Optional.empty()))
                .contains(new CallStore.Plan(Phase.CUT, CUT.phaseStart(), CUT.planStart(), 2600, false, raised));
        CallStore.Plan alreadyHigher = new CallStore.Plan(Phase.CUT, CUT.phaseStart(), CUT.planStart(), 2600, false, raised + 2000);
        assertThat(PlanChange.after(alreadyHigher, new Action.ChangeMovement(), TODAY, P, Optional.empty())).as("never lowered").contains(alreadyHigher);
    }

    @Test
    void aPlanWithoutAStepTargetFollowsTheStartingOne() {
        assertThat(PlanChange.steps(CUT, P)).isEqualTo(P.wholeNumber(ParameterKey.STEPS_TARGET_START));
        assertThat(PlanChange.steps(new CallStore.Plan(Phase.CUT, TODAY, TODAY, 2600, false, 8500), P)).isEqualTo(8500);
    }

    @Test
    void callsThatCannotBeAppliedYetChangeNothing() {
        // Training calls change the program, not the plan (K-217, TrainingCalls); the mini cut needs its target (K-227,
        // the overload with it). Not yet, continue and advice have nothing to apply.
        for (Action action : List.of(new Action.StopLoadIncrease(), new Action.Deload(new BigDecimal("0.5")), new Action.FullRestWeek(),
                new Action.MiniCut(2, 4), new Action.NoDecisionYet(),
                new Action.Continue(), new Action.FixTraining(), new Action.FixRecovery(), new Action.FixAdherence())) {
            assertThat(PlanChange.after(CUT, action, TODAY, P, Optional.empty())).as(action.type().name()).isEmpty();
        }
    }

    @Test
    void aMiniCutStartsTodayAsACutAtItsTargetUntilItsLongestWeeks() {
        // K-227, G7 K-102: a few weeks under maintenance, from today; not watched — the target is not the formula's
        // estimate being observed. It ends on the day its longest length is over (the engine turns it back then).
        CallStore.Plan bulk = new CallStore.Plan(Phase.BULK, TODAY.minusDays(200), TODAY.minusDays(20), 3000, false, 9000);

        assertThat(PlanChange.after(bulk, new Action.MiniCut(4, 6), TODAY, P, Optional.of(2800), Optional.of(2300)))
                .contains(new CallStore.Plan(Phase.CUT, TODAY, TODAY, 2300, false, 9000, TODAY.plusWeeks(6)));
        assertThat(PlanChange.after(bulk, new Action.MiniCut(4, 6), TODAY, P, Optional.of(2800), Optional.empty()))
                .as("without its target there is nothing to apply").isEmpty();
        CallStore.Plan startsTomorrow = new CallStore.Plan(Phase.BULK, TODAY.minusDays(200), TODAY.plusDays(1), 3000, false, null);
        assertThat(PlanChange.after(startsTomorrow, new Action.MiniCut(4, 6), TODAY, P, Optional.empty(), Optional.of(2300)))
                .as("a plan started later on the calendar").contains(new CallStore.Plan(Phase.CUT, TODAY.plusDays(1), TODAY.plusDays(1), 2300, false,
                        null, TODAY.plusDays(1).plusWeeks(6)));
    }

    @Test
    void onAMiniCutCaloriesAndMovementKeepItsDayAndANewDirectionEndsIt() {
        CallStore.Plan mini = new CallStore.Plan(Phase.CUT, TODAY.minusDays(14), TODAY.minusDays(14), 2300, false, 9000, TODAY.plusWeeks(4));

        for (Action keeps : List.of(new Action.AdjustCalories(-500), new Action.IncreaseCalories(250), new Action.ChangeMovement())) {
            assertThat(PlanChange.after(mini, keeps, TODAY, P, Optional.of(2800))).as(keeps.type().name())
                    .hasValueSatisfying(after -> assertThat(after.miniCutUntil()).isEqualTo(TODAY.plusWeeks(4)));
        }
        for (Action ends : List.of(new Action.ChangePhase(Phase.BULK), new Action.HardStop())) {
            assertThat(PlanChange.after(mini, ends, TODAY, P, Optional.of(2800))).as(ends.type().name())
                    .hasValueSatisfying(after -> assertThat(after.miniCutUntil()).isNull());
        }
    }

    @Test
    void aPlanKeptBeforeTheMiniCutReadsAsNotOnOne() throws Exception {
        // The plan before and after each applied call is kept as JSON (K-216); those kept before K-227 have no mini cut day.
        tools.jackson.databind.json.JsonMapper json = tools.jackson.databind.json.JsonMapper.builder().build();
        String kept = "{\"phase\":\"CUT\",\"phaseStart\":\"2026-08-03\",\"planStart\":\"2026-09-07\",\"targetKcal\":2600,"
                + "\"observingMaintenance\":false,\"stepsPerDay\":null}";

        assertThat(json.readValue(kept, CallStore.Plan.class)).isEqualTo(CUT);
        CallStore.Plan onIt = new CallStore.Plan(Phase.CUT, TODAY, TODAY, 2100, false, null, TODAY.plusWeeks(6));
        assertThat(json.readValue(json.writeValueAsString(onIt), CallStore.Plan.class)).isEqualTo(onIt);
    }

    @Test
    void aNewDirectionStartsFromTheMaintenanceEstimateWatched() {
        // K-222: the phase gate turns the direction; the new phase starts like a first plan (K-114): today, at the
        // maintenance estimate, watched before it is judged. The steps stay.
        CallStore.Plan lean = new CallStore.Plan(Phase.CUT, TODAY.minusDays(90), TODAY.minusDays(20), 1900, false, 9000);

        assertThat(PlanChange.after(lean, new Action.ChangePhase(Phase.BULK), TODAY, P, Optional.of(2400)))
                .contains(new CallStore.Plan(Phase.BULK, TODAY, TODAY, 2400, true, 9000));
        assertThat(PlanChange.after(lean, new Action.ChangePhase(Phase.BULK), TODAY, P, Optional.empty())).as("no estimate: the target stays")
                .contains(new CallStore.Plan(Phase.BULK, TODAY, TODAY, 1900, true, 9000));
    }

    @Test
    void theHardStopEndsTheDeficitAtLeastAtMaintenance() {
        // ADR-020 L-1: no more eating under maintenance. Maintenance is not a direction (03 §2.1): the plan turns to building
        // at the maintenance estimate — so the cut ladder cannot take the deficit back next week — and is watched.
        CallStore.Plan cut = new CallStore.Plan(Phase.CUT, TODAY.minusDays(90), TODAY.minusDays(20), 1600, false, null);
        CallStore.Plan alreadyHigher = new CallStore.Plan(Phase.CUT, TODAY.minusDays(90), TODAY.minusDays(20), 2600, false, null);

        assertThat(PlanChange.after(cut, new Action.HardStop(), TODAY, P, Optional.of(2200)))
                .contains(new CallStore.Plan(Phase.BULK, TODAY, TODAY, 2200, true, null));
        assertThat(PlanChange.after(alreadyHigher, new Action.HardStop(), TODAY, P, Optional.of(2200))).as("never lowered")
                .contains(new CallStore.Plan(Phase.BULK, TODAY, TODAY, 2600, true, null));
        // A bulk goes on: its phase keeps the day it began. Without an estimate the target stays; without a target, maintenance.
        CallStore.Plan bulk = new CallStore.Plan(Phase.BULK, TODAY.minusDays(90), TODAY.minusDays(20), 2000, false, null);
        assertThat(PlanChange.after(bulk, new Action.HardStop(), TODAY, P, Optional.of(2200)))
                .contains(new CallStore.Plan(Phase.BULK, TODAY.minusDays(90), TODAY, 2200, true, null));
        assertThat(PlanChange.after(cut, new Action.HardStop(), TODAY, P, Optional.empty()))
                .contains(new CallStore.Plan(Phase.BULK, TODAY, TODAY, 1600, true, null));
        CallStore.Plan noTarget = new CallStore.Plan(Phase.CUT, TODAY.minusDays(90), TODAY.minusDays(20), null, true, null);
        assertThat(PlanChange.after(noTarget, new Action.HardStop(), TODAY, P, Optional.of(2200)))
                .contains(new CallStore.Plan(Phase.BULK, TODAY, TODAY, 2200, true, null));
    }

    @Test
    void theHardStopIsNotTakenBackAndEveryOtherCallIs() {
        // ADR-020 L-1: after the hard stop, no more eating under maintenance — an undo would put the deficit back with
        // one tap (K-222 review). Every other applied call can be taken back (K-216).
        assertThat(PlanChange.undoable(new Action.HardStop())).isFalse();
        for (Action action : List.of(new Action.AdjustCalories(-250), new Action.IncreaseCalories(250), new Action.ChangeMovement(),
                new Action.ChangePhase(Phase.BULK), new Action.StopLoadIncrease(), new Action.Deload(new BigDecimal("0.5")), new Action.FullRestWeek())) {
            assertThat(PlanChange.undoable(action)).as(action.type().name()).isTrue();
        }
    }

    @Test
    void aNewDirectionOnAPlanStartedLaterOnTheCalendarStartsWithIt() {
        // A time zone moved west: the plan begins "tomorrow" on today's calendar; the new one cannot start before it.
        CallStore.Plan startsTomorrow = new CallStore.Plan(Phase.CUT, TODAY.minusDays(30), TODAY.plusDays(1), 1900, false, null);

        assertThat(PlanChange.after(startsTomorrow, new Action.ChangePhase(Phase.BULK), TODAY, P, Optional.of(2400)))
                .contains(new CallStore.Plan(Phase.BULK, TODAY.plusDays(1), TODAY.plusDays(1), 2400, true, null));
    }

    @Test
    void aTargetIsTheCaloriesWithTheirMacrosTheStepsAndTheTrainingDays() {
        // 2600 kcal at 80 kg, 30 years: protein 2.0 g/kg = 160 g, fat 1 g/kg = 80 g, carbs the rest (K-108).
        Optional<PlanTargets> targets = PlanTargets.of(CUT, new BigDecimal("80.0"), Sex.MALE, 30, 3, P);

        assertThat(targets).hasValueSatisfying(t -> {
            assertThat(t.targetKcal()).isEqualTo(2600);
            assertThat(t.proteinG()).isEqualTo(160);
            assertThat(t.fatG()).isEqualTo(80);
            assertThat(t.carbsG()).isEqualTo((2600 - 160 * 4 - 80 * 9) / 4);
            assertThat(t.stepsPerDay()).isEqualTo(P.wholeNumber(ParameterKey.STEPS_TARGET_START));
            assertThat(t.trainingSessionsPerWeek()).isEqualTo(3);
        });
    }

    @Test
    void aWomansTargetsFollowHerParameters() {
        // Women from protein_female_higher_from_age take protein_g_per_kg_female_45_plus (J1 A5): 60 kg at 50.
        Parameters female = engineParameters().forSex(Sex.FEMALE);
        CallStore.Plan plan = new CallStore.Plan(Phase.CUT, TODAY, TODAY, 1900, false, null);

        assertThat(PlanTargets.of(plan, new BigDecimal("60.0"), Sex.FEMALE, 50, 1, female)).hasValueSatisfying(t ->
                assertThat(t.proteinG()).isEqualTo(new BigDecimal("60.0").multiply(BigDecimal.valueOf(
                        female.number(ParameterKey.PROTEIN_G_PER_KG_FEMALE_45_PLUS))).setScale(0, java.math.RoundingMode.HALF_UP).intValueExact()));
    }

    @Test
    void whenNoSplitFitsTheTargetTheCaloriesProteinAndStepsStayAndCarbsAndFatAreLeftOut() {
        // 800 kcal at 80 kg cannot hold 2 g/kg protein and the fat floor (K-108 TargetTooLow). The engine never sets
        // that, but a heavier trend or a birthday can move the floor after a target was set (K-216 review): the targets
        // stay readable — protein does not depend on calories — and carbs and fat are not guessed.
        CallStore.Plan tooLow = new CallStore.Plan(Phase.CUT, TODAY, TODAY, 800, false, null);

        assertThat(PlanTargets.of(tooLow, new BigDecimal("80.0"), Sex.MALE, 30, 1, P)).hasValueSatisfying(t -> {
            assertThat(t.targetKcal()).isEqualTo(800);
            assertThat(t.proteinG()).isEqualTo(160);
            assertThat(t.carbsG()).isNull();
            assertThat(t.fatG()).isNull();
            assertThat(t.stepsPerDay()).isEqualTo(P.wholeNumber(ParameterKey.STEPS_TARGET_START));
        });
    }

    @Test
    void noTargetBeforeTheFirstEstimate() {
        CallStore.Plan noTarget = new CallStore.Plan(Phase.CUT, TODAY, TODAY, null, true, null);

        assertThat(PlanTargets.of(noTarget, new BigDecimal("80.0"), Sex.MALE, 30, 1, P)).isEmpty();
    }

    @Test
    void aKeptCallsActionIsReadBackAsTheEngineMadeIt() {
        // Applying reads the kept call, not a fresh run of the engine: parameters may have changed since (K-212 hash).
        // Through JSON text as jsonb keeps it, so numbers come back as the JSON reader types them.
        tools.jackson.databind.json.JsonMapper json = tools.jackson.databind.json.JsonMapper.builder().build();
        for (Action action : List.of(new Action.NoDecisionYet(), new Action.Continue(), new Action.AdjustCalories(-500),
                new Action.IncreaseCalories(250), new Action.ChangeMovement(), new Action.FixTraining(), new Action.FixRecovery(),
                new Action.FixAdherence(), new Action.HardStop(), new Action.StopLoadIncrease(), new Action.Deload(new BigDecimal("0.50")),
                new Action.FullRestWeek(), new Action.MiniCut(2, 4), new Action.ChangePhase(Phase.BULK))) {
            app.keel.engine.Decision decision = new app.keel.engine.Decision(action, List.of(new app.keel.engine.Reason(
                    new app.keel.engine.RuleId("r"), new app.keel.engine.Source("arastirma/x.md#1", app.keel.engine.SourceTag.LITERATURE))),
                    app.keel.engine.Confidence.LOW, TODAY, new app.keel.engine.CopyKey("decision.continue"));
            @SuppressWarnings("unchecked")
            Map<String, Object> kept = json.readValue(json.writeValueAsString(DecisionJson.of(decision)), Map.class);

            Action read = DecisionJson.action(kept);

            assertThat(read).as(action.type().name()).usingRecursiveComparison().withStrictTypeChecking().withComparatorForType(BigDecimal::compareTo, BigDecimal.class)
                    .isEqualTo(action);
        }
    }

    private static ParameterSet engineParameters() {
        Map<String, Object> documents = new HashMap<>();
        for (ParameterDomain domain : ParameterDomain.values()) {
            try (InputStream in = new ClassPathResource("data/parameters/" + domain.fileName()).getInputStream()) {
                documents.put(domain.fileName(), new Yaml().load(in));
            } catch (IOException e) {
                throw new IllegalStateException(domain.fileName(), e);
            }
        }
        return ParameterSet.fromDocuments(documents);
    }
}
