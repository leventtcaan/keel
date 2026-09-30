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
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.EnumSet;
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
        assertThat(PlanChange.after(CUT, new Action.AdjustCalories(-500), TODAY, P))
                .contains(new CallStore.Plan(Phase.CUT, CUT.phaseStart(), TODAY, 2100, false, null));
        assertThat(PlanChange.after(CUT, new Action.IncreaseCalories(250), TODAY, P))
                .contains(new CallStore.Plan(Phase.CUT, CUT.phaseStart(), TODAY, 2850, false, null));
    }

    @Test
    void aCalorieCallEndsTheWatchOfTheStartingEstimate() {
        // A target the engine moved is no longer the formula's estimate being observed (K-114).
        CallStore.Plan watched = new CallStore.Plan(Phase.BULK, TODAY.minusDays(30), TODAY.minusDays(30), 2700, true, 9000);

        assertThat(PlanChange.after(watched, new Action.AdjustCalories(250), TODAY, P))
                .contains(new CallStore.Plan(Phase.BULK, watched.phaseStart(), TODAY, 2950, false, 9000));
    }

    @Test
    void theDayATargetBeganNeverMovesBack() {
        // A time zone moved west can make today earlier than the plan's start: the ladder's wait (K-107) must not shrink,
        // and phase_start ≤ plan_start must hold.
        CallStore.Plan startsTomorrow = new CallStore.Plan(Phase.CUT, TODAY.minusDays(30), TODAY.plusDays(1), 2600, false, null);
        CallStore.Plan startsToday = new CallStore.Plan(Phase.CUT, TODAY.minusDays(30), TODAY, 2600, false, null);

        assertThat(PlanChange.after(startsTomorrow, new Action.AdjustCalories(-500), TODAY, P)).hasValueSatisfying(plan ->
                assertThat(plan.planStart()).isEqualTo(TODAY.plusDays(1)));
        assertThat(PlanChange.after(startsToday, new Action.AdjustCalories(-500), TODAY, P)).hasValueSatisfying(plan ->
                assertThat(plan.planStart()).isEqualTo(TODAY));
    }

    @Test
    void aCalorieCallWithNothingToMoveOrNothingLeftIsNotApplied() {
        // The engine does neither (plan_target_needed; its floors); if it ever did, CONFLICT — not an NPE or a
        // target_kcal > 0 violation, both 500s.
        CallStore.Plan noTarget = new CallStore.Plan(Phase.CUT, TODAY, TODAY, null, true, null);

        assertThat(PlanChange.after(noTarget, new Action.AdjustCalories(-500), TODAY, P)).isEmpty();
        assertThat(PlanChange.after(CUT, new Action.AdjustCalories(-2600), TODAY, P)).isEmpty();
        assertThat(PlanChange.after(CUT, new Action.AdjustCalories(-2599), TODAY, P)).hasValueSatisfying(plan ->
                assertThat(plan.targetKcal()).isEqualTo(1));
    }

    @Test
    void moreMovementRaisesOnlyTheStepTarget() {
        int raised = P.wholeNumber(ParameterKey.STEPS_TARGET_RAISED);

        assertThat(PlanChange.after(CUT, new Action.ChangeMovement(), TODAY, P))
                .contains(new CallStore.Plan(Phase.CUT, CUT.phaseStart(), CUT.planStart(), 2600, false, raised));
        CallStore.Plan alreadyHigher = new CallStore.Plan(Phase.CUT, CUT.phaseStart(), CUT.planStart(), 2600, false, raised + 2000);
        assertThat(PlanChange.after(alreadyHigher, new Action.ChangeMovement(), TODAY, P)).as("never lowered").contains(alreadyHigher);
    }

    @Test
    void aPlanWithoutAStepTargetFollowsTheStartingOne() {
        assertThat(PlanChange.steps(CUT, P)).isEqualTo(P.wholeNumber(ParameterKey.STEPS_TARGET_START));
        assertThat(PlanChange.steps(new CallStore.Plan(Phase.CUT, TODAY, TODAY, 2600, false, 8500), P)).isEqualTo(8500);
    }

    @Test
    void callsThatCannotBeAppliedYetChangeNothing() {
        // Training calls go to the program (K-217); the phase, the mini cut and the hard stop wait for what the engine
        // cannot read yet (DURUM 11, 17, 18). Not yet, continue and advice have nothing to apply.
        for (Action action : List.of(new Action.StopLoadIncrease(), new Action.Deload(new BigDecimal("0.5")), new Action.FullRestWeek(),
                new Action.ChangePhase(Phase.BULK), new Action.MiniCut(2, 4), new Action.HardStop(), new Action.NoDecisionYet(),
                new Action.Continue(), new Action.FixTraining(), new Action.FixRecovery(), new Action.FixAdherence())) {
            assertThat(PlanChange.after(CUT, action, TODAY, P)).as(action.type().name()).isEmpty();
        }
    }

    @Test
    void aTargetIsTheCaloriesWithTheirMacrosTheStepsAndTheTrainingDays() {
        // 2600 kcal at 80 kg, 30 years: protein 2.0 g/kg = 160 g, fat 1 g/kg = 80 g, carbs the rest (K-108).
        Optional<PlanTargets> targets = PlanTargets.of(CUT, new BigDecimal("80.0"), Sex.MALE, 30,
                EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY), P);

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

        assertThat(PlanTargets.of(plan, new BigDecimal("60.0"), Sex.FEMALE, 50, EnumSet.of(DayOfWeek.TUESDAY), female)).hasValueSatisfying(t ->
                assertThat(t.proteinG()).isEqualTo(new BigDecimal("60.0").multiply(BigDecimal.valueOf(
                        female.number(ParameterKey.PROTEIN_G_PER_KG_FEMALE_45_PLUS))).setScale(0, java.math.RoundingMode.HALF_UP).intValueExact()));
    }

    @Test
    void noSplitNoTargets() {
        // 800 kcal at 80 kg cannot hold 2 g/kg protein and the fat floor (K-108 TargetTooLow): no targets, not a guess.
        CallStore.Plan tooLow = new CallStore.Plan(Phase.CUT, TODAY, TODAY, 800, false, null);

        assertThat(PlanTargets.of(tooLow, new BigDecimal("80.0"), Sex.MALE, 30, EnumSet.of(DayOfWeek.MONDAY), P)).isEmpty();
    }

    @Test
    void noTargetBeforeTheFirstEstimate() {
        CallStore.Plan noTarget = new CallStore.Plan(Phase.CUT, TODAY, TODAY, null, true, null);

        assertThat(PlanTargets.of(noTarget, new BigDecimal("80.0"), Sex.MALE, 30, EnumSet.of(DayOfWeek.MONDAY), P)).isEmpty();
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
