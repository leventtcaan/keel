package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.CheckIn.Recovery;
import app.keel.engine.CheckIn.Training;
import app.keel.engine.TrainingTrend.Lift;
import app.keel.engine.TrainingTrend.LoggedSet;
import app.keel.engine.TrainingTrend.Reading;
import app.keel.engine.TrainingTrend.Session;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

/**
 * The set log's reading of training and recovery (K-1218, ADR-091): e1RM direction per compound lift over the last four
 * sessions, a majority across lifts, never a guess where the log is thin. The window, the noise margin and the counts are
 * read from the parameter file, so the tables below hold for the values it has: a 28-day window, two sessions a side, a 3 %
 * margin, two lifts, a half. Sets of one rep to failure make a session's e1RM the load itself, so the margins are exact.
 */
class TrainingTrendTests {

    private static final Parameters P = parameters(Sex.MALE);
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 22);

    /** A session {@code daysAgo} days back with one set: {@code kg} for one rep to failure (e1RM = kg). */
    private static Session max(int daysAgo, String kg) {
        return new Session(TODAY.minusDays(daysAgo), List.of(new LoggedSet(new BigDecimal(kg), 1, 0)));
    }

    /** Four sessions, oldest first, 26, 19, 12 and 5 days back. */
    private static Lift lift(String id, String first, String second, String third, String fourth) {
        return new Lift(id, List.of(max(26, first), max(19, second), max(12, third), max(5, fourth)));
    }

    private static Reading read(Lift... lifts) {
        return TrainingTrend.read(List.of(lifts), TODAY, Set.of(), P);
    }

    @Test
    void anE1rmThatRoseBeyondTheMarginIsImproving() {
        // Last two sessions average 106, the two before 100: +6 %.
        assertThat(read(lift("squat", "100", "100", "106", "106")).training()).isEqualTo(Training.IMPROVING);
    }

    @Test
    void anE1rmThatFellBeyondTheMarginIsDeclining() {
        assertThat(read(lift("squat", "106", "106", "100", "100")).training()).isEqualTo(Training.DECLINING);
    }

    @Test
    void anE1rmWithinTheMarginIsStable() {
        assertThat(read(lift("squat", "100", "100", "102", "102")).training()).isEqualTo(Training.STABLE);
        assertThat(read(lift("squat", "102", "102", "100", "100")).training()).isEqualTo(Training.STABLE);
    }

    @Test
    void theMarginItselfIsAChange() {
        // 3.0 % is the margin (e1rm_trend_noise_pct): at it, up or down, the lift moved; just inside it, it held.
        assertThat(read(lift("squat", "100", "100", "103", "103")).training()).isEqualTo(Training.IMPROVING);
        assertThat(read(lift("squat", "100", "100", "97", "97")).training()).isEqualTo(Training.DECLINING);
        assertThat(read(lift("squat", "100", "100", "102.9", "102.9")).training()).isEqualTo(Training.STABLE);
        assertThat(read(lift("squat", "100", "100", "97.1", "97.1")).training()).isEqualTo(Training.STABLE);
    }

    @Test
    void onlyTheLastFourSessionsInTheWindowCount() {
        // Day 27 is the window's first day (28 days with today); its heavy session is the fifth from the end, so it is not read.
        Lift squat = new Lift("squat", List.of(max(27, "200"), max(20, "100"), max(13, "100"), max(6, "106"), max(2, "106")));
        assertThat(read(squat).training()).isEqualTo(Training.IMPROVING);
    }

    @Test
    void fewerThanFourSessionsInTheWindowIsUnknown() {
        Lift three = new Lift("squat", List.of(max(19, "100"), max(12, "106"), max(5, "106")));
        assertThat(read(three)).isEqualTo(Reading.UNKNOWN);
        // Day 28 is outside the window: four sessions, three of them in it.
        Lift old = new Lift("squat", List.of(max(28, "100"), max(19, "100"), max(12, "106"), max(5, "106")));
        assertThat(read(old)).isEqualTo(Reading.UNKNOWN);
    }

    @Test
    void aSessionWithoutAnEstimateDoesNotCount() {
        // No RIR: the distance from failure is unknown, so no e1RM (E1rm); the lift has three sessions that count.
        Session blind = new Session(TODAY.minusDays(12), List.of(new LoggedSet(new BigDecimal("106"), 1, null)));
        Lift squat = new Lift("squat", List.of(max(26, "100"), max(19, "100"), blind, max(5, "106")));
        assertThat(read(squat)).isEqualTo(Reading.UNKNOWN);
    }

    @Test
    void aSessionIsItsBestEstimate() {
        // 100 x 5 at RIR 2 (123.3) and a lighter 80 x 5 at RIR 2 (98.7): the session is 123.3, whatever the order of its sets.
        Session first = new Session(TODAY.minusDays(26), List.of(new LoggedSet(new BigDecimal("100"), 5, 2), new LoggedSet(new BigDecimal("80"), 5, 2)));
        Session same = new Session(TODAY.minusDays(19), List.of(new LoggedSet(new BigDecimal("100"), 5, 2)));
        Session later = new Session(TODAY.minusDays(12), List.of(new LoggedSet(new BigDecimal("80"), 5, 2), new LoggedSet(new BigDecimal("100"), 5, 2)));
        Session last = new Session(TODAY.minusDays(5), List.of(new LoggedSet(new BigDecimal("100"), 5, 2)));
        assertThat(read(new Lift("squat", List.of(first, same, later, last))).training()).isEqualTo(Training.STABLE);
    }

    @Test
    void aProgramWithTwoLiftsNeedsBothReadable() {
        Lift squat = lift("squat", "100", "100", "106", "106");
        Lift bench = new Lift("bench", List.of(max(19, "60"), max(12, "64"), max(5, "64")));
        assertThat(read(squat, bench)).isEqualTo(Reading.UNKNOWN);
        assertThat(read(squat).training()).isEqualTo(Training.IMPROVING);
    }

    @Test
    void theMajorityOfTheLiftsSaysWhereTrainingStands() {
        Lift up = lift("squat", "100", "100", "106", "106");
        Lift down = lift("bench", "106", "106", "100", "100");
        Lift flat = lift("row", "100", "100", "101", "101");
        Lift flat2 = lift("press", "100", "100", "100", "100");
        // A half going down is declining, up lifts or not.
        assertThat(read(up, down).training()).isEqualTo(Training.DECLINING);
        // One of three going down is under a half: stable.
        assertThat(read(down, flat, flat2).training()).isEqualTo(Training.STABLE);
        // Improving: half or more up and none down; one of three up is under a half.
        assertThat(read(up, flat).training()).isEqualTo(Training.IMPROVING);
        assertThat(read(up, flat, flat2).training()).isEqualTo(Training.STABLE);
    }

    @Test
    void sessionsOnExcludedDaysDoNotCount() {
        Lift five = new Lift("squat", List.of(max(26, "100"), max(21, "90"), max(19, "100"), max(12, "106"), max(5, "106")));
        // The day-21 session was in a lighter week: the four others are read.
        Set<LocalDate> excluded = Set.of(TODAY.minusDays(21));
        assertThat(TrainingTrend.read(List.of(five), TODAY, excluded, P).training()).isEqualTo(Training.IMPROVING);
        // Without that session to spare, one fewer is too few.
        Lift four = lift("squat", "100", "100", "106", "106");
        assertThat(TrainingTrend.read(List.of(four), TODAY, Set.of(TODAY.minusDays(19)), P)).isEqualTo(Reading.UNKNOWN);
    }

    @Test
    void anExcludedDayInTheCheckInWeekMakesTheWeekUnreadable() {
        // After a rest or lighter week, or on a declared day, the log of the week says nothing about training: the answer stands.
        Lift squat = lift("squat", "100", "100", "106", "106");
        assertThat(TrainingTrend.read(List.of(squat), TODAY, Set.of(TODAY.minusDays(6)), P)).isEqualTo(Reading.UNKNOWN);
        assertThat(TrainingTrend.read(List.of(squat), TODAY, Set.of(TODAY.minusDays(7)), P).training()).isEqualTo(Training.IMPROVING);
    }

    @Test
    void aWeekWithoutASessionIsUnknownNeverNotTrainedSoTheUserIsAsked() {
        // Sessions 26, 19, 12 and 9 days back: nothing in the seven days to today. A missing log is no evidence (design §4).
        Lift squat = new Lift("squat", List.of(max(26, "100"), max(19, "100"), max(12, "106"), max(9, "106")));
        assertThat(read(squat)).isEqualTo(Reading.UNKNOWN);
        // No log at all is no evidence: the user may train elsewhere.
        assertThat(TrainingTrend.read(List.of(new Lift("squat", List.of())), TODAY, Set.of(), P)).isEqualTo(Reading.UNKNOWN);
        assertThat(TrainingTrend.read(List.of(), TODAY, Set.of(), P)).isEqualTo(Reading.UNKNOWN);
    }

    // Recovery: effort rising at the same load and reps, RIR down by one or more (G7 K-67), and the e1RM not up.

    private static Session at(int daysAgo, String kg, int reps, int rir) {
        return new Session(TODAY.minusDays(daysAgo), List.of(new LoggedSet(new BigDecimal(kg), reps, rir)));
    }

    private static Lift rirs(String id, int first, int second, int third, int fourth) {
        return new Lift(id, List.of(at(26, "100", 5, first), at(19, "100", 5, second), at(12, "100", 5, third), at(5, "100", 5, fourth)));
    }

    @Test
    void aDropInRirAtTheSameLoadAndRepsIsPoorRecovery() {
        // Last two sessions average RIR 1, the two before 3: two reps nearer failure at the same weight.
        Reading reading = read(rirs("squat", 3, 3, 1, 1));
        assertThat(reading.recovery()).isEqualTo(Recovery.POOR);
        // The e1RM fell with it (reps to failure 8 to 6), so the log also says declining.
        assertThat(reading.training()).isEqualTo(Training.DECLINING);
    }

    @Test
    void aDropOfExactlyTheDriftIsPoorAndLessIsNot() {
        assertThat(read(rirs("squat", 3, 3, 2, 2)).recovery()).isEqualTo(Recovery.POOR);
        // Mean 3 before, 2.5 after: half a rep.
        assertThat(read(rirs("squat", 3, 3, 3, 2)).recovery()).isEqualTo(Recovery.UNKNOWN);
    }

    @Test
    void theLogNeverSaysRecoveryIsGood() {
        assertThat(read(rirs("squat", 2, 2, 2, 2)).recovery()).isEqualTo(Recovery.UNKNOWN);
        assertThat(read(rirs("squat", 1, 1, 3, 3)).recovery()).isEqualTo(Recovery.UNKNOWN);
    }

    @Test
    void aDropInRirWhileTheE1rmIsUpIsNotTiredness() {
        // The 100 x 5 sets slide from RIR 3 to RIR 1, but a heavier top set came in the last two sessions: e1RM up.
        List<Session> sessions = new ArrayList<>();
        sessions.add(at(26, "100", 5, 3));
        sessions.add(at(19, "100", 5, 3));
        sessions.add(new Session(TODAY.minusDays(12), List.of(new LoggedSet(new BigDecimal("100"), 5, 1), new LoggedSet(new BigDecimal("120"), 5, 2))));
        sessions.add(new Session(TODAY.minusDays(5), List.of(new LoggedSet(new BigDecimal("100"), 5, 1), new LoggedSet(new BigDecimal("120"), 5, 2))));
        Reading reading = read(new Lift("squat", sessions));
        assertThat(reading.training()).isEqualTo(Training.IMPROVING);
        assertThat(reading.recovery()).isEqualTo(Recovery.UNKNOWN);
    }

    @Test
    void sessionsWithoutACommonLoadAndRepsHaveNoRirToCompare() {
        Lift moving = new Lift("squat", List.of(at(26, "100", 5, 3), at(19, "102.5", 5, 3), at(12, "105", 5, 1), at(5, "107.5", 5, 1)));
        assertThat(read(moving).recovery()).isEqualTo(Recovery.UNKNOWN);
    }

    @Test
    void eachLiftsEffortIsTheTirednessTheRecoveryReadsLiftByLift() {
        // K-1265 (ADR-096 #4): what the coach may say about "why it felt heavy" is what the engine reads, lift by lift — effort
        // rising at the same load and reps (G7 K-67) with the e1RM not up, or steady; a lift with nothing to compare is not told.
        Lift tired = rirs("squat", 3, 3, 1, 1);
        Lift steady = rirs("bench_press", 2, 2, 2, 2);
        Lift moving = new Lift("deadlift", List.of(at(26, "100", 5, 3), at(19, "102.5", 5, 3), at(12, "105", 5, 1), at(5, "107.5", 5, 1)));

        assertThat(TrainingTrend.efforts(List.of(tired, steady, moving), TODAY, Set.of(), P)).containsExactly(
                new TrainingTrend.LiftEffort("squat", TrainingTrend.Effort.RISING), new TrainingTrend.LiftEffort("bench_press", TrainingTrend.Effort.STEADY));
        // Half a rep is under the drift: steady.
        assertThat(TrainingTrend.efforts(List.of(rirs("squat", 3, 3, 3, 2)), TODAY, Set.of(), P))
                .containsExactly(new TrainingTrend.LiftEffort("squat", TrainingTrend.Effort.STEADY));
        // A declared or lighter week this week: nothing is read, as for the recovery.
        assertThat(TrainingTrend.efforts(List.of(tired), TODAY, Set.of(TODAY.minusDays(2)), P)).isEmpty();
    }

    @Test
    void halfOfTheComparableLiftsTiredIsPoor() {
        Lift tired = rirs("squat", 3, 3, 1, 1);
        Lift fresh = rirs("bench", 2, 2, 2, 2);
        Lift fresh2 = rirs("row", 2, 2, 2, 2);
        assertThat(read(tired, fresh).recovery()).isEqualTo(Recovery.POOR);
        assertThat(read(tired, fresh, fresh2).recovery()).isEqualTo(Recovery.UNKNOWN);
    }

    // Reconciling with the answer.

    @Test
    void theLogOverridesTheAnswerWhereItKnowsAndLeavesItWhereItDoesNot() {
        CheckIn answered = CheckIn.NONE.withTraining(Training.STABLE).withRecovery(Recovery.GOOD);
        assertThat(TrainingTrend.withLog(answered, new Reading(Training.DECLINING, Recovery.POOR)))
                .isEqualTo(answered.withTraining(Training.DECLINING).withRecovery(Recovery.POOR));
        assertThat(TrainingTrend.withLog(answered, new Reading(Training.IMPROVING, Recovery.UNKNOWN)))
                .isEqualTo(answered.withTraining(Training.IMPROVING));
        assertThat(TrainingTrend.withLog(answered, Reading.UNKNOWN)).isEqualTo(answered);
    }

    private static final Function<CheckIn, Decision> SPINE = checkIn -> switch (checkIn.training()) {
        case DECLINING -> decision(new Action.FixTraining(), "training_first");
        case UNKNOWN -> decision(new Action.NoDecisionYet(), "check_in_needed_training");
        default -> decision(new Action.Continue(), "toward_goal");
    };

    private static Decision decision(Action action, String rule) {
        return new Decision(action, List.of(new Reason(new RuleId(rule), new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE))),
                Confidence.MEDIUM, TODAY.plusDays(7), new CopyKey("decision.continue"));
    }

    private static List<String> rules(Decision decision) {
        return decision.reasons().stream().map(reason -> reason.rule().value()).toList();
    }

    @Test
    void aLogThatChangesTheCallIsSaidNextToTheRuleThatDecided() {
        CheckIn answered = CheckIn.NONE.withTraining(Training.DECLINING);
        Decision decided = TrainingTrend.decide(SPINE, answered, new Reading(Training.IMPROVING, Recovery.UNKNOWN));

        assertThat(decided.action()).isEqualTo(new Action.Continue());
        assertThat(rules(decided)).containsExactly("toward_goal", "training_log_improving");
    }

    @Test
    void eachLogReadingHasItsOwnReason() {
        Function<CheckIn, Decision> readsTheAnswer = checkIn -> checkIn.training() == Training.STABLE
                ? decision(new Action.Continue(), "toward_goal") : decision(new Action.FixTraining(), "training_first");

        assertThat(rules(TrainingTrend.decide(readsTheAnswer, CheckIn.NONE.withTraining(Training.DECLINING),
                new Reading(Training.STABLE, Recovery.UNKNOWN)))).containsExactly("toward_goal", "training_log_stable");
        assertThat(rules(TrainingTrend.decide(readsTheAnswer, CheckIn.NONE.withTraining(Training.STABLE),
                new Reading(Training.DECLINING, Recovery.UNKNOWN)))).containsExactly("training_first", "training_log_declining");
    }

    @Test
    void aPoorRecoveryTheLogFoundIsSaidToo() {
        Function<CheckIn, Decision> spine = checkIn -> checkIn.recovery() == Recovery.POOR
                ? decision(new Action.FixRecovery(), "recovery_poor") : decision(new Action.Continue(), "toward_goal");
        Decision decided = TrainingTrend.decide(spine, CheckIn.NONE.withTraining(Training.STABLE).withRecovery(Recovery.GOOD),
                new Reading(Training.UNKNOWN, Recovery.POOR));

        assertThat(decided.action()).isEqualTo(new Action.FixRecovery());
        assertThat(rules(decided)).containsExactly("recovery_poor", "recovery_log_poor");
    }

    @Test
    void nothingIsSaidWhereTheLogAgreesOrChangesNothingOrTheUserDidNotAnswer() {
        Reading improving = new Reading(Training.IMPROVING, Recovery.UNKNOWN);
        // The same: the answer was the log's.
        assertThat(rules(TrainingTrend.decide(SPINE, CheckIn.NONE.withTraining(Training.IMPROVING), improving))).containsExactly("toward_goal");
        // No answer: the log is the only reading, and the rule that used it speaks for itself.
        assertThat(rules(TrainingTrend.decide(SPINE, CheckIn.NONE, improving))).containsExactly("toward_goal");
        // A call that reads no training is the same either way.
        Function<CheckIn, Decision> blind = checkIn -> decision(new Action.Continue(), "toward_goal");
        assertThat(rules(TrainingTrend.decide(blind, CheckIn.NONE.withTraining(Training.DECLINING), improving))).containsExactly("toward_goal");
        // The log does not know: the answer stands, and nothing is said about a log.
        assertThat(rules(TrainingTrend.decide(SPINE, CheckIn.NONE.withTraining(Training.DECLINING), Reading.UNKNOWN))).containsExactly("training_first");
    }
}
