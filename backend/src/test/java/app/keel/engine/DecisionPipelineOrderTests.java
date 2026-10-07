package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;

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
import net.jqwik.api.Builders;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.junit.jupiter.api.Test;

/**
 * The order of the assembled engine, pair by pair (ADR-022): a step that must come first is tested against each step
 * it outranks, and a model-based property checks over a wide input space that the first deciding step is the answer.
 * Written from the K-112 test review: 14 of 16 order and confidence mutations survived the first suite.
 */
class DecisionPipelineOrderTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final Parameters MALE = parameters(Sex.MALE);
    private static final Parameters FEMALE = parameters(Sex.FEMALE);
    private static final CheckIn ON_PLAN = CheckIn.NONE.withAdherence(new BigDecimal("0.9")).withTraining(Training.STABLE);
    private static final TrainingStatus PLAN_MISSED = new TrainingStatus(0, 0, 0, false)
            .withWeeksPlanMissed(MALE.wholeNumber(ParameterKey.OVERTRAINING_MISSED_PLAN_WEEKS));

    // U13: the hard stop is never swallowed by "not yet".
    @Test
    void theHardStopIsNotSwallowedByObservingOrThinData() {
        Snapshot observing = new Snapshot(TODAY, Sex.FEMALE, Phase.CUT, TODAY.minusDays(10), weekly("70.0", "70.0", "70.0", "70.0"))
                .withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(2000, 300)).withProfile(new Profile(30, 165))
                .withObservingMaintenance(true).withMenstrualLossReported(true);
        Snapshot firstDays = new Snapshot(TODAY, Sex.FEMALE, Phase.CUT, TODAY.minusDays(5), series(EngineFixtures.daily(TODAY.minusDays(5), TODAY, "70.0")))
                .withMenstrualLossReported(true);

        assertThat(DecisionPipeline.decide(observing, FEMALE).action()).isEqualTo(new Action.HardStop());
        assertThat(DecisionPipeline.decide(firstDays, FEMALE).action()).isEqualTo(new Action.HardStop());
    }

    @Test
    void safetyComesBeforeThePhaseGate() {
        Snapshot lean = new Snapshot(TODAY, Sex.FEMALE, Phase.CUT, TODAY.minusDays(27), weekly("60.0", "59.6", "59.2", "58.8"),
                Optional.of(new BigDecimal("18"))).withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(2000, 300))
                .withProfile(new Profile(30, 165)).withMenstrualLossReported(true);

        assertThat(DecisionPipeline.decide(lean, FEMALE).action()).isEqualTo(new Action.HardStop());
    }

    // K-227 review: a stopped cycle on the mini cut's last day is the hard stop (U13), not "back to building".
    @Test
    void theSafetyNetComesBeforeTheMiniCutsEnd() {
        Snapshot lastDay = new Snapshot(TODAY, Sex.FEMALE, Phase.CUT, TODAY.minusDays(27), weekly("60.0", "59.6", "59.2", "58.8"),
                Optional.of(new BigDecimal("18"))).withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(2000, 300))
                .withProfile(new Profile(30, 165)).withMenstrualLossReported(true).withMiniCutUntil(TODAY);

        assertThat(DecisionPipeline.decide(lastDay, FEMALE).action()).isEqualTo(new Action.HardStop());
    }

    // K-227: the mini cut ends on its day even in a week training goes wrong — one change a week (U3), the rest next.
    @Test
    void theMiniCutsEndComesBeforeTrainingGoingWrong() {
        Snapshot lastDay = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(27), weekly("80.0", "79.6", "79.2", "78.8"),
                Optional.of(new BigDecimal("18"))).withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(2300, 300))
                .withProfile(new Profile(30, 180)).withTraining(PLAN_MISSED).withMiniCutUntil(TODAY);

        assertThat(DecisionPipeline.decide(lastDay.withMiniCutUntil(TODAY.plusDays(1)), MALE).action()).as("the day not come yet")
                .isEqualTo(new Action.FullRestWeek());
        assertThat(DecisionPipeline.decide(lastDay, MALE).action()).isEqualTo(new Action.ChangePhase(Phase.BULK));
    }

    // ADR-030 #32: while a mini cut runs, the spine's calorie steps wait for its day (G7 K-102 sets weeks of deficit, not
    // a deeper one); after it, a flat cut steps down as usual.
    @Test
    void aMiniCutHoldsItsCaloriesUntilItsDay() {
        Snapshot flatCut = user(Phase.CUT, weekly("80.0", "80.0", "80.0"));

        assertThat(DecisionPipeline.decide(flatCut, MALE).action()).as("an ordinary cut").isEqualTo(new Action.AdjustCalories(-500));
        Decision onIt = DecisionPipeline.decide(flatCut.withMiniCutUntil(TODAY.plusWeeks(2)), MALE);
        assertThat(onIt.action()).isEqualTo(new Action.Continue());
        assertThat(onIt.reasons().getFirst().rule()).isEqualTo(MiniCutGate.MINI_CUT_RUNNING);
        assertThat(EngineFixtures.copyGroup(onIt.copyKey())).containsKeys("title", "body");
    }

    // ADR-022 step 2 before step 4.
    @Test
    void trainingGoingWrongComesBeforeThePhaseGateAndTheMiniCut() {
        Snapshot aboveCeiling = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(20), weekly("70.0", "70.5", "71.0"),
                Optional.of(new BigDecimal("22"))).withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(3000, 300))
                .withProfile(new Profile(30, 180)).withTraining(PLAN_MISSED);
        Snapshot appetiteGone = user(Phase.BULK, weekly("70.0", "70.5", "71.0")).withPhaseStart(TODAY.minusMonths(6))
                .withCheckIn(ON_PLAN.withAppetite(Appetite.GONE)).withTraining(PLAN_MISSED);

        assertThat(DecisionPipeline.decide(aboveCeiling, MALE).action()).isEqualTo(new Action.FullRestWeek());
        assertThat(DecisionPipeline.decide(appetiteGone, MALE).action()).isEqualTo(new Action.FullRestWeek());
    }

    // A full cut outranks a mini cut.
    @Test
    void thePhaseGateComesBeforeTheMiniCut() {
        Snapshot both = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(20), weekly("70.0", "70.0", "70.0"),
                Optional.of(new BigDecimal("22"))).withCheckIn(ON_PLAN.withAppetite(Appetite.GONE))
                .withEnergy(new EnergyBudget(3000, 300)).withProfile(new Profile(30, 180)).withPhaseStart(TODAY.minusMonths(6));

        assertThat(DecisionPipeline.decide(both, MALE).action()).isEqualTo(new Action.ChangePhase(Phase.CUT));
    }

    // Loads going backwards is "training going wrong" too, not only the missed plan.
    @Test
    void loadsGoingBackwardsOnAStalledBulkFixRecoveryBeforeAddingCalories() {
        Snapshot stalled = user(Phase.BULK, weekly("70.0", "70.0", "70.0"))
                .withTraining(new TrainingStatus(0, 0, 0, false).withLoadsBelowLastWeek(true));

        assertThat(DecisionPipeline.decide(stalled, MALE).action()).isEqualTo(new Action.FixRecovery());
    }

    // The spine's own "not yet" (asking for a signal) is LOW even on dense data.
    @Test
    void aSpineNotYetOnDenseDataIsStillLow() {
        Snapshot askTraining = user(Phase.CUT, weekly("80.0", "79.5", "79.0"))
                .withCheckIn(CheckIn.NONE.withAdherence(new BigDecimal("0.9")).withLook(Look.WORSE));

        Decision decision = DecisionPipeline.decide(askTraining, MALE);
        assertThat(decision.action()).isEqualTo(new Action.NoDecisionYet());
        assertThat(decision.confidence()).isEqualTo(Confidence.LOW);
    }

    // dense_weighins_per_week in every week of the window, not only the latest.
    @Test
    void highConfidenceNeedsEveryWeekDenseAndSixADayIsEnough() {
        assertThat(DecisionPipeline.decide(user(Phase.CUT, perWeek(6, "80.0", "79.5", "79.0")), MALE).confidence()).isEqualTo(Confidence.HIGH);
        assertThat(DecisionPipeline.decide(user(Phase.CUT, perWeek(5, "80.0", "79.5", "79.0")), MALE).confidence()).isEqualTo(Confidence.MEDIUM);
        List<WeighIn> oldWeekSparse = new ArrayList<>();
        for (int day : new int[] {0, 2, 4, 6}) {
            oldWeekSparse.add(EngineFixtures.weighIn(TODAY.minusDays(20).plusDays(day), "80.0"));
        }
        oldWeekSparse.addAll(EngineFixtures.daily(TODAY.minusDays(13), TODAY.minusDays(7), "79.5"));
        oldWeekSparse.addAll(EngineFixtures.daily(TODAY.minusDays(6), TODAY, "79.0"));
        assertThat(DecisionPipeline.decide(user(Phase.CUT, series(oldWeekSparse)), MALE).confidence()).isEqualTo(Confidence.MEDIUM);
    }

    // Safety floors keep HIGH on sparse data; the phase gate and the plateau keep MEDIUM on dense data.
    @Test
    void eachStepKeepsItsOwnConfidence() {
        Snapshot bmrSparse = user(Phase.CUT, perWeek(4, "80.0", "80.0", "80.0")).withEnergy(new EnergyBudget(2180, 300));
        Snapshot aboveCeiling = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(20), weekly("70.0", "70.0", "70.0"),
                Optional.of(new BigDecimal("22"))).withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(3000, 300)).withProfile(new Profile(30, 180));
        Snapshot plateau = user(Phase.BULK, weekly("70.0", "70.5", "71.0"))
                .withTraining(new TrainingStatus(MALE.wholeNumber(ParameterKey.PLATEAU_SESSIONS), 0, 0, false));

        assertThat(DecisionPipeline.decide(bmrSparse, MALE).confidence()).isEqualTo(Confidence.HIGH);
        assertThat(DecisionPipeline.decide(aboveCeiling, MALE).confidence()).isEqualTo(Confidence.MEDIUM);
        assertThat(DecisionPipeline.decide(plateau, MALE).confidence()).isEqualTo(Confidence.MEDIUM);
    }

    // No phase change while the starting estimate is observed.
    @Test
    void noDirectionChangeWhileMaintenanceIsObserved() {
        Snapshot observing = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(10), weekly("70.0", "70.0", "70.0"),
                Optional.of(new BigDecimal("22"))).withCheckIn(ON_PLAN).withEnergy(new EnergyBudget(3000, 300))
                .withProfile(new Profile(30, 180)).withObservingMaintenance(true);

        assertThat(DecisionPipeline.decide(observing, MALE).action()).isEqualTo(new Action.NoDecisionYet());
    }

    // K-962, ADR-077 #4: the call that closes the first week comes from the sessions, in place of "not yet" — and of any
    // weight or calorie call (U8), whatever the scale says.
    @Test
    void theFirstWeeksCallTakesThePlaceOfNotYetAndOfAnyWeightCall() {
        FirstWeekAdjustment.Week allDone = new FirstWeekAdjustment.Week(3, 3, 3, List.of(), Optional.of(Experience.Y1_3));
        Snapshot firstDays = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(6), series(EngineFixtures.daily(TODAY.minusDays(6), TODAY, "80.0")))
                .withCheckIn(CheckIn.NONE.withWeek1Feel(CheckIn.Week1Feel.COULD_DO_MORE));
        Snapshot flatCut = user(Phase.CUT, weekly("80.0", "80.0", "80.0"));

        assertThat(DecisionPipeline.decide(firstDays, MALE).action()).as("no first week: not yet").isEqualTo(new Action.NoDecisionYet());
        assertThat(DecisionPipeline.decide(firstDays.withFirstWeek(allDone), MALE).action()).isEqualTo(new Action.AddTrainingDay(4));
        assertThat(DecisionPipeline.decide(flatCut, MALE).action()).as("a weight call otherwise").isEqualTo(new Action.AdjustCalories(-500));
        assertThat(DecisionPipeline.decide(flatCut.withFirstWeek(allDone), MALE).action()).isEqualTo(new Action.Continue());
        assertThat(DecisionPipeline.windowRead(flatCut.withFirstWeek(allDone), MALE)).as("no weekly mean read").isFalse();
    }

    // U13 and K-516 before the first week's call: a hard stop is never swallowed, a declared week still waits.
    @Test
    void theSafetyNetAndADeclaredWeekComeBeforeTheFirstWeeksCall() {
        List<java.time.DayOfWeek> wednesdayAndFriday = List.of(java.time.DayOfWeek.WEDNESDAY, java.time.DayOfWeek.FRIDAY);
        Snapshot firstDays = new Snapshot(TODAY, Sex.FEMALE, Phase.CUT, TODAY.minusDays(6), series(EngineFixtures.daily(TODAY.minusDays(6), TODAY, "70.0")))
                .withFirstWeek(new FirstWeekAdjustment.Week(3, 1, 3, wednesdayAndFriday, Optional.empty()));

        assertThat(DecisionPipeline.decide(firstDays, FEMALE).action()).isEqualTo(new Action.MoveMissedSessions(wednesdayAndFriday));
        assertThat(DecisionPipeline.decide(firstDays.withMenstrualLossReported(true), FEMALE).action()).isEqualTo(new Action.HardStop());
        assertThat(DecisionPipeline.decide(firstDays.withContext(DeclaredContext.SICK), FEMALE).reasons().getFirst().rule())
                .isEqualTo(StateMode.DECLARED_CONTEXT);
    }

    // A first week that planned no session has nothing to adjust: the call is the "not yet" it was.
    @Test
    void aFirstWeekWithNothingPlannedIsNotYet() {
        Snapshot firstDays = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(1), series(EngineFixtures.daily(TODAY.minusDays(1), TODAY, "80.0")));

        assertThat(DecisionPipeline.decide(firstDays.withFirstWeek(new FirstWeekAdjustment.Week(0, 0, 3, List.of(), Optional.empty())), MALE))
                .isEqualTo(DecisionPipeline.decide(firstDays, MALE));
    }

    // Model-based: whatever the input, the safety net's decision (if any) is the answer, then a red training signal;
    // "not yet" is always LOW; the next review is after today; the words exist in en.json.
    @Property(tries = 1000)
    boolean theFirstStepThatDecidesIsTheAnswer(@ForAll("anySnapshot") Snapshot snapshot) {
        Parameters p = parameters(snapshot.sex());
        Decision decision = DecisionPipeline.decide(snapshot, p);
        Optional<Decision> safety = SafetyNet.check(snapshot, p);
        if (safety.isPresent()) {
            return decision.equals(safety.get());
        }
        Optional<Decision> ladder = snapshot.training().flatMap(t -> DeloadLadder.check(t, snapshot, p));
        if (ladder.isPresent() && (ladder.get().action() instanceof Action.FullRestWeek || ladder.get().action() instanceof Action.FixRecovery)) {
            return decision.equals(ladder.get());
        }
        boolean notYetIsLow = !(decision.action() instanceof Action.NoDecisionYet) || decision.confidence() == Confidence.LOW;
        return notYetIsLow && decision.nextReview().isAfter(snapshot.today())
                && EngineFixtures.copyGroup(decision.copyKey()).get("title") instanceof String;
    }

    @Provide
    Arbitrary<Snapshot> anySnapshot() {
        Arbitrary<List<String>> weeks = Arbitraries.of("-1.2", "-0.6", "-0.3", "0.0", "0.0", "0.3", "0.6").list().ofSize(5);
        Arbitrary<CheckIn> checkIns = Combinators.combine(Arbitraries.of(Look.values()), Arbitraries.of(Training.values()),
                Arbitraries.of(CheckIn.Recovery.values()), Arbitraries.of(CheckIn.Waist.values()),
                Arbitraries.of(new BigDecimal("0.4"), new BigDecimal("0.8"), new BigDecimal("0.95")).optional(),
                Arbitraries.of(Appetite.values())).as(CheckIn::new);
        Arbitrary<Optional<TrainingStatus>> training = Combinators.combine(Arbitraries.integers().between(0, 5),
                Arbitraries.integers().between(0, 1), Arbitraries.integers().between(0, 4), Arbitraries.of(true, false),
                Arbitraries.of(true, false), Arbitraries.integers().between(0, 3))
                .as((stalled, held, months, rested, below, missed) ->
                        new TrainingStatus(stalled, held, stalled == 0 ? 0 : months, rested, below, missed)).optional(0.6);
        return Builders.withBuilder(() -> new Object[13])
                .use(Arbitraries.of(Sex.values())).in((a, v) -> { a[0] = v; return a; })
                .use(Arbitraries.of(Phase.values())).in((a, v) -> { a[1] = v; return a; })
                .use(weeks).in((a, v) -> { a[2] = v; return a; })
                .use(checkIns).in((a, v) -> { a[3] = v; return a; })
                .use(Arbitraries.integers().between(3, 60)).in((a, v) -> { a[4] = v; return a; })
                .use(training).in((a, v) -> { a[5] = v; return a; })
                .use(Arbitraries.integers().between(8, 40).map(BigDecimal::valueOf).optional(0.5)).in((a, v) -> { a[6] = v; return a; })
                .use(Arbitraries.integers().between(0, 8)).in((a, v) -> { a[7] = v; return a; })
                .use(Arbitraries.of(true, false)).in((a, v) -> { a[8] = v; return a; })
                .use(Arbitraries.of(false, false, false, true)).in((a, v) -> { a[9] = v; return a; })
                .use(Arbitraries.integers().between(1400, 3400)).in((a, v) -> { a[10] = v; return a; })
                .use(Arbitraries.integers().between(0, 30)).in((a, v) -> { a[11] = v; return a; })
                .build(this::snapshotOf);
    }

    @SuppressWarnings("unchecked")
    private Snapshot snapshotOf(Object[] a) {
        Sex sex = (Sex) a[0];
        Phase phase = (Phase) a[1];
        List<String> deltas = (List<String>) a[2];
        BigDecimal kg = new BigDecimal(phase == Phase.CUT ? "80" : "70");
        String[] kgs = new String[deltas.size()];
        for (int i = 0; i < kgs.length; i++) {
            kg = kg.add(new BigDecimal(deltas.get(i)));
            kgs[i] = kg.toPlainString();
        }
        WeightSeries weights = weekly(kgs);
        int historyDays = 35 - (Integer) a[11]; // drop the oldest 0-30 days to get thin data too
        List<WeighIn> kept = weights.weighIns().stream().filter(w -> !w.date().isBefore(TODAY.minusDays(historyDays - 1L))).toList();
        LocalDate planStart = TODAY.minusDays((Integer) a[4]);
        Snapshot s = new Snapshot(TODAY, sex, phase, planStart, series(kept), (Optional<BigDecimal>) a[6])
                .withCheckIn((CheckIn) a[3]).withEnergy(new EnergyBudget((Integer) a[10], 300))
                .withProfile(new Profile(30, sex == Sex.MALE ? 180 : 165))
                .withPhaseStart(planStart.minusMonths((Integer) a[7]))
                .withObservingMaintenance((Boolean) a[8]).withMenstrualLossReported(sex == Sex.FEMALE && (Boolean) a[9]);
        return ((Optional<TrainingStatus>) a[5]).map(s::withTraining).orElse(s);
    }

    private static Snapshot user(Phase phase, WeightSeries weights) {
        return new Snapshot(TODAY, Sex.MALE, phase, TODAY.minusDays(20), weights).withCheckIn(ON_PLAN)
                .withEnergy(new EnergyBudget(phase == Phase.CUT ? 2600 : 3000, 300)).withProfile(new Profile(30, 180));
    }

    private static WeightSeries weekly(String... kgs) {
        return perWeek(7, kgs);
    }

    private static WeightSeries perWeek(int perWeek, String... kgs) {
        LocalDate first = TODAY.minusDays(7L * kgs.length - 1);
        List<WeighIn> weighIns = new ArrayList<>();
        for (int week = 0; week < kgs.length; week++) {
            for (int day = 7 - perWeek; day < 7; day++) {
                weighIns.add(EngineFixtures.weighIn(first.plusDays(7L * week + day), kgs[week]));
            }
        }
        return series(weighIns);
    }
}
