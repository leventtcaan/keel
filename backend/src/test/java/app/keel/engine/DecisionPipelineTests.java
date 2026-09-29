package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.engine.CheckIn.Appetite;
import app.keel.engine.CheckIn.Look;
import app.keel.engine.CheckIn.Training;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.junit.jupiter.api.Test;

/**
 * The assembled engine (K-112, ADR-003 §4): a fixed order, and the first step that decides stops the chain —
 * safety → training going wrong → observing maintenance → enough data → phase → mini cut → the weekly spine → the
 * calorie ladder; a quiet week (continue / not yet) leaves room for the training progression rungs. Confidence comes
 * from data density; the next review from the deciding step.
 */
class DecisionPipelineTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final Parameters MALE = parameters(Sex.MALE);
    private static final CheckIn ON_PLAN = CheckIn.NONE.withAdherence(new BigDecimal("0.9")).withTraining(Training.STABLE);
    private static final TrainingStatus PLATEAU = new TrainingStatus(MALE.wholeNumber(ParameterKey.PLATEAU_SESSIONS), 0, 0, false);
    private static final TrainingStatus PLAN_MISSED = new TrainingStatus(0, 0, 0, false)
            .withWeeksPlanMissed(MALE.wholeNumber(ParameterKey.OVERTRAINING_MISSED_PLAN_WEEKS));

    // ── the order ───────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void safetyComesBeforeEverything() {
        // U13: losing too fast outranks an overtraining week and a flat window.
        Snapshot snapshot = user(Phase.CUT, weekly("70.9", "70.9", "70.0")).withTraining(PLAN_MISSED);

        assertThat(DecisionPipeline.decide(snapshot, MALE).action()).isInstanceOf(Action.IncreaseCalories.class);
    }

    @Test
    void trainingGoingWrongComesBeforeFoodDecisions() {
        // Güray's tree: training bad → fix training first, no calorie decision. Even in the first two weeks of data.
        Snapshot early = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(9), series(daily(TODAY.minusDays(9), TODAY, "80.0")))
                .withTraining(PLAN_MISSED);
        Snapshot flat = user(Phase.CUT, weekly("80.0", "80.0", "80.0")).withTraining(PLAN_MISSED);

        assertThat(DecisionPipeline.decide(early, MALE).action()).isEqualTo(new Action.FullRestWeek());
        assertThat(DecisionPipeline.decide(flat, MALE).action()).isEqualTo(new Action.FullRestWeek());
    }

    @Test
    void whileMaintenanceIsObservedNothingAboutFoodChanges() {
        Snapshot observing = user(Phase.CUT, weekly("80.0", "80.0", "80.0"), TODAY.minusDays(10)).withObservingMaintenance(true);

        assertThat(DecisionPipeline.decide(observing, MALE).reasons().getFirst().rule()).isEqualTo(new RuleId("observing"));
    }

    @Test
    void aQuietWeekLeavesRoomForTheProgressionRungs() {
        // Spec WC-16: the spine says continue; a plateau then holds the load. Data too thin to judge weight does not
        // stop a training call either.
        Snapshot moving = user(Phase.BULK, weekly("70.0", "70.5", "71.0")).withTraining(PLATEAU);
        Snapshot early = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(9), series(daily(TODAY.minusDays(9), TODAY, "70.0")))
                .withTraining(PLATEAU);

        assertThat(DecisionPipeline.decide(moving, MALE).action()).isEqualTo(new Action.StopLoadIncrease());
        assertThat(DecisionPipeline.decide(early, MALE).action()).isEqualTo(new Action.StopLoadIncrease());
    }

    @Test
    void aFoodDecisionWinsTheWeekOverAPlateau() {
        // One variable at a time: a calorie step this week, the plateau is looked at next week.
        Snapshot snapshot = user(Phase.CUT, weekly("80.0", "80.0", "80.0")).withTraining(PLATEAU);

        assertThat(DecisionPipeline.decide(snapshot, MALE).action()).isEqualTo(new Action.AdjustCalories(-500));
    }

    @Test
    void thePhaseGateComesBeforeTheSpine() {
        // Bulk above the fat ceiling → cut, whatever the scale says this week (K-105).
        Snapshot aboveCeiling = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(20), weekly("70.0", "70.0", "70.0"),
                Optional.of(new BigDecimal("22"))).withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(3000, 300))
                .withProfile(new Profile(30, 180));

        assertThat(DecisionPipeline.decide(aboveCeiling, MALE).action()).isEqualTo(new Action.ChangePhase(Phase.CUT));
    }

    @Test
    void aMiniCutComesBeforeTheSpine() {
        Snapshot snapshot = user(Phase.BULK, weekly("70.0", "70.0", "70.0")).withPhaseStart(TODAY.minusMonths(6))
                .withCheckIn(ON_PLAN.withAppetite(Appetite.GONE));

        assertThat(DecisionPipeline.decide(snapshot, MALE).action()).isInstanceOf(Action.MiniCut.class);
    }

    @Test
    void aCalorieCallGoesThroughTheLadderWithMifflinAsBmr() {
        // Spec WC-12: 80 kg, 30 y, 180 cm → resting 1780. 2180 − 500 = 1680 < 1780 → move more.
        Snapshot snapshot = user(Phase.CUT, weekly("80.0", "80.0", "80.0")).withEnergy(new EnergyBudget(2180, 300));

        Decision decision = DecisionPipeline.decide(snapshot, MALE);

        assertThat(decision.action()).isEqualTo(new Action.ChangeMovement());
        assertThat(decision.reasons().getFirst().rule()).isEqualTo(new RuleId("bmr_floor"));
    }

    @Test
    void aCalorieCallWithoutAPlanTargetAsksForItInsteadOfCrashing() {
        // U3: name what is missing. A valid Snapshot may lack the plan target or the profile.
        Snapshot noPlan = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(20), weekly("80.0", "80.0", "80.0"))
                .withCheckIn(ON_PLAN).withProfile(new Profile(30, 180));

        Decision decision = DecisionPipeline.decide(noPlan, MALE);

        assertThat(decision.action()).isEqualTo(new Action.NoDecisionYet());
        assertThat(decision.reasons().getFirst().rule()).isEqualTo(new RuleId("plan_target_needed"));
        assertThat(decision.nextReview()).isEqualTo(TODAY.plusDays(7));
    }

    @Test
    void aStepDownWithoutAProfileAsksForItButAStepUpDoesNotNeedIt() {
        // BMR and the macro floors need age and height only on the way down.
        Snapshot cut = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(20), weekly("80.0", "80.0", "80.0"))
                .withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(2600, 300));
        Snapshot bulk = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(20), weekly("70.0", "70.0", "70.0"))
                .withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(3000, 300));

        assertThat(DecisionPipeline.decide(cut, MALE).reasons().getFirst().rule()).isEqualTo(new RuleId("profile_needed"));
        assertThat(DecisionPipeline.decide(bulk, MALE).action()).isEqualTo(new Action.AdjustCalories(250));
    }

    // ── confidence and next review ──────────────────────────────────────────────────────────────────────────

    @Test
    void dailyWeighInsGiveAHighConfidenceCall() {
        // dense_weighins_per_week in every week of the window → HIGH; the minimum (4 a week) → MEDIUM.
        assertThat(DecisionPipeline.decide(user(Phase.CUT, weekly("80.0", "79.5", "79.0")), MALE).confidence())
                .isEqualTo(Confidence.HIGH);
        assertThat(DecisionPipeline.decide(user(Phase.CUT, fourAWeek("80.0", "79.5", "79.0")), MALE).confidence())
                .isEqualTo(Confidence.MEDIUM);
    }

    @Test
    void notYetIsAlwaysLowConfidence() {
        Snapshot early = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(9), series(daily(TODAY.minusDays(9), TODAY, "80.0")));

        assertThat(DecisionPipeline.decide(early, MALE).confidence()).isEqualTo(Confidence.LOW);
    }

    @Test
    void aCalorieChangeIsLookedAtAgainAfterTheNewPlansWindow() {
        int window = MALE.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);

        assertThat(DecisionPipeline.decide(user(Phase.CUT, weekly("80.0", "80.0", "80.0")), MALE).nextReview())
                .isEqualTo(TODAY.plusDays(window));
    }

    @Test
    void parametersOfTheOtherSexAreRefused() {
        assertThatThrownBy(() -> DecisionPipeline.decide(user(Phase.CUT, weekly("80.0", "79.5", "79.0")), parameters(Sex.FEMALE)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("sex");
    }

    // ── every decision, whatever the input ──────────────────────────────────────────────────────────────────

    @Property
    boolean everyDecisionLooksAgainLaterAndHasItsWordsInEnJson(@ForAll("snapshots") Snapshot snapshot) {
        // K-101's deferred promises: the next review is after today, and the copy key exists (K2, ADR-010).
        Decision decision = DecisionPipeline.decide(snapshot, parameters(snapshot.sex()));
        return decision.nextReview().isAfter(snapshot.today())
                && EngineFixtures.copyGroup(decision.copyKey()).get("title") instanceof String;
    }

    @Provide
    Arbitrary<Snapshot> snapshots() {
        Arbitrary<List<String>> weeks = Arbitraries.bigDecimals().between(new BigDecimal("60"), new BigDecimal("90")).ofScale(1)
                .map(BigDecimal::toPlainString).list().ofSize(4);
        Arbitrary<CheckIn> checkIns = Combinators.combine(Arbitraries.of(Look.values()), Arbitraries.of(Training.values()),
                Arbitraries.of(CheckIn.Recovery.values()), Arbitraries.of(CheckIn.Waist.values()),
                Arbitraries.bigDecimals().between(BigDecimal.ZERO, BigDecimal.ONE).ofScale(2).optional(),
                Arbitraries.of(Appetite.values()))
                .as(CheckIn::new);
        return Combinators.combine(Arbitraries.of(Sex.values()), Arbitraries.of(Phase.values()), weeks, checkIns,
                Arbitraries.integers().between(3, 60), Arbitraries.of(true, false), Arbitraries.of(true, false),
                Arbitraries.of(true, false))
                .as((sex, phase, kgs, checkIn, planDaysAgo, withPlateau, withPlan, withProfile) -> {
                    Snapshot snapshot = new Snapshot(TODAY, sex, phase, TODAY.minusDays(planDaysAgo),
                            weekly(kgs.toArray(String[]::new))).withCheckIn(checkIn);
                    snapshot = withPlan ? snapshot.withEnergy(new EnergyBudget(2400, 300)) : snapshot;
                    snapshot = withProfile ? snapshot.withProfile(new Profile(30, 175)) : snapshot;
                    return withPlateau ? snapshot.withTraining(PLATEAU) : snapshot;
                });
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    /** A man on a plan that started with the first weigh-in of {@code weights}, on the plan, with a target and a profile. */
    private static Snapshot user(Phase phase, WeightSeries weights) {
        return user(phase, weights, weights.firstDay().orElseThrow());
    }

    private static Snapshot user(Phase phase, WeightSeries weights, LocalDate planStart) {
        return new Snapshot(TODAY, Sex.MALE, phase, planStart, weights).withCheckIn(ON_PLAN)
                .withEnergy(new EnergyBudget(phase == Phase.CUT ? 2600 : 3000, 300)).withProfile(new Profile(30, 180));
    }

    /** One weight per week, weighed every morning, oldest first; the last week ends today. */
    private static WeightSeries weekly(String... kgs) {
        LocalDate first = TODAY.minusDays(7L * kgs.length - 1);
        List<WeighIn> weighIns = new ArrayList<>();
        for (int week = 0; week < kgs.length; week++) {
            weighIns.addAll(daily(first.plusDays(7L * week), first.plusDays(7L * week + 6), kgs[week]));
        }
        return series(weighIns);
    }

    /** As {@link #weekly}, but four mornings a week (the minimum). */
    private static WeightSeries fourAWeek(String... kgs) {
        LocalDate first = TODAY.minusDays(7L * kgs.length - 1);
        List<WeighIn> weighIns = new ArrayList<>();
        for (int week = 0; week < kgs.length; week++) {
            for (int day : new int[] {0, 2, 4, 6}) {
                weighIns.add(EngineFixtures.weighIn(first.plusDays(7L * week + day), kgs[week]));
            }
        }
        return series(weighIns);
    }

    private static List<WeighIn> daily(LocalDate first, LocalDate last, String kg) {
        return EngineFixtures.daily(first, last, kg);
    }
}
