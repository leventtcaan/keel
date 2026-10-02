package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.TrainingStatus;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Where training stands for the deload ladder (K-221, K-110): the most-stalled compound lift from the set log, the
 * ladder's own changes on the program (K-217), and the weeks the plan was not kept (G7 K-73).
 */
class TrainingStatusTests {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 5);

    @Test
    void aSessionStallsWithNeitherMoreLoadNorMoreRepsThanTheOneBefore() {
        // 80×8 → 80×9 (reps up) → 80×9 → 82.5×6 (load up) → 82.5×6 → 82.5×5 → 80×10 (less load: not progress).
        List<TrainingStatuses.Session> sessions = List.of(session(0, "80", 8), session(3, "80", 9), session(7, "80", 9), session(10, "82.5", 6),
                session(14, "82.5", 6), session(17, "82.5", 5), session(21, "80", 10));

        assertThat(TrainingStatuses.stalledSessions(sessions)).isEqualTo(3);
        assertThat(TrainingStatuses.stalledSessions(sessions.subList(0, 4))).as("the latest went up").isZero();
        assertThat(TrainingStatuses.stalledSessions(sessions.subList(0, 1))).as("one session, nothing to compare").isZero();
    }

    @Test
    void theMonthsStalledCountFromTheLastSessionThatWentUp() {
        LocalDate start = MONDAY.minusMonths(3).minusDays(2);
        List<TrainingStatuses.Session> sessions = List.of(new TrainingStatuses.Session(start, new BigDecimal("100"), 5),
                new TrainingStatuses.Session(start.plusDays(4), new BigDecimal("100"), 5), new TrainingStatuses.Session(MONDAY.minusDays(1),
                        new BigDecimal("100"), 5));

        assertThat(TrainingStatuses.monthsStalled(sessions, MONDAY)).isEqualTo(3);
        // An older start does not count: it went up since (six months ago → three months ago, then stalled).
        List<TrainingStatuses.Session> earlierStart = new java.util.ArrayList<>(List.of(new TrainingStatuses.Session(MONDAY.minusMonths(6),
                new BigDecimal("90"), 5)));
        earlierStart.addAll(sessions);
        assertThat(TrainingStatuses.monthsStalled(earlierStart, MONDAY)).isEqualTo(3);
        assertThat(TrainingStatuses.monthsStalled(List.of(session(0, "80", 8), session(3, "82.5", 6)), MONDAY)).as("not stalled").isZero();
    }

    @Test
    void goingBackwardsIsThisWeeksTopBelowLastWeeks() {
        List<TrainingStatuses.Session> below = List.of(session(0, "100", 5), session(8, "95", 5));
        List<TrainingStatuses.Session> same = List.of(session(0, "100", 5), session(8, "100", 3));

        assertThat(TrainingStatuses.loadsBelowLastWeek(below, day(8))).isTrue();
        assertThat(TrainingStatuses.loadsBelowLastWeek(same, day(8))).isFalse();
        assertThat(TrainingStatuses.loadsBelowLastWeek(List.of(session(8, "95", 5)), day(8))).as("nothing last week").isFalse();
    }

    @Test
    void theLadderReadsItsOwnChangesOnTheProgram() {
        TrainingChanges.Change hold = change(TrainingChanges.Kind.HOLD_LOAD, MONDAY.minusDays(14), null);
        TrainingChanges.Change lighterLastWeek = change(TrainingChanges.Kind.LIGHTER_WEEK, MONDAY.minusDays(7), MONDAY.minusDays(1));

        assertThat(TrainingStatuses.weeksLoadHeld(List.of(hold), MONDAY, DayOfWeek.MONDAY)).as("two check-in weeks").isEqualTo(2);
        assertThat(TrainingStatuses.weeksLoadHeld(List.of(), MONDAY, DayOfWeek.MONDAY)).isZero();
        assertThat(TrainingStatuses.restedLastWeek(List.of(lighterLastWeek), MONDAY)).isTrue();
        assertThat(TrainingStatuses.restedLastWeek(List.of(change(TrainingChanges.Kind.REST_WEEK, MONDAY.minusDays(21), MONDAY.minusDays(15))),
                MONDAY)).as("the week before last").isFalse();
        assertThat(TrainingStatuses.restedLastWeek(List.of(change(TrainingChanges.Kind.REST_WEEK, MONDAY.minusDays(14), MONDAY.minusDays(8))),
                MONDAY)).as("ended the day before last week").isFalse();
        assertThat(TrainingStatuses.restedLastWeek(List.of(hold), MONDAY)).as("a hold is not rest").isFalse();
    }

    @Test
    void aHoldCountsTheCheckInWeeksSinceTheFirstRung() {
        // Applied on Thursday after Monday's call: the next Monday's review is one week held, not 4 days / 7 = 0 (K-221
        // review). A second hold applied later does not start the count again: the first rung is the earliest.
        TrainingChanges.Change appliedThursday = change(TrainingChanges.Kind.HOLD_LOAD, MONDAY.minusDays(4), null);
        TrainingChanges.Change again = change(TrainingChanges.Kind.HOLD_LOAD, MONDAY, null);

        assertThat(TrainingStatuses.weeksLoadHeld(List.of(appliedThursday), MONDAY, DayOfWeek.MONDAY)).isEqualTo(1);
        assertThat(TrainingStatuses.weeksLoadHeld(List.of(appliedThursday, again), MONDAY, DayOfWeek.MONDAY)).isEqualTo(1);
        assertThat(TrainingStatuses.weeksLoadHeld(List.of(appliedThursday), MONDAY.minusDays(1), DayOfWeek.MONDAY)).as("the same week").isZero();
    }

    @Test
    void noWorkoutLoggedYetIsNoMissedPlanAndARestWeekIsNeitherKeptNorMissed() {
        // Not logging is not failing to train (U3, U7; as K-220). A week the ladder ordered off is not a missed one.
        assertThat(TrainingStatuses.weeksPlanMissed(List.of(), List.of(), 3, MONDAY, MONDAY.minusDays(60))).isZero();
        // Workouts start 21 Sep: the week of 14 Sep (nothing logged) is before the first and is not counted.
        assertThat(TrainingStatuses.weeksPlanMissed(List.of(day(-14), day(-7)), List.of(), 3, MONDAY, MONDAY.minusDays(60))).isEqualTo(2);
        TrainingChanges.Change restThursdayToWednesday = change(TrainingChanges.Kind.REST_WEEK, day(-11), day(-5));
        // Week of 28 Sep overlaps the rest (to Wed 30 Sep): skipped; week of 21 Sep too; the week of 14 Sep kept the plan.
        List<LocalDate> kept = List.of(day(-21), day(-19), day(-17), day(-4), day(-2));
        assertThat(TrainingStatuses.weeksPlanMissed(kept, List.of(restThursdayToWednesday), 3, MONDAY, MONDAY.minusDays(60))).isZero();
    }

    @Test
    void aWeekWithADeclaredDayIsNeitherKeptNorMissed() {
        // K-516 (ADR-038): sick from Thursday 24 Sep — the week of 21 Sep is paused, like a week off; the week of 28 Sep
        // missed is counted; the week of 14 Sep kept the plan and ends the count.
        List<LocalDate> kept = List.of(day(-21), day(-19), day(-17));
        assertThat(TrainingStatuses.weeksPlanMissed(kept, List.of(), java.util.Set.of(day(-11)), 3, MONDAY, MONDAY.minusDays(60))).isEqualTo(1);
        assertThat(TrainingStatuses.weeksPlanMissed(kept, List.of(), java.util.Set.of(), 3, MONDAY, MONDAY.minusDays(60))).isEqualTo(2);
    }

    @Test
    void aSessionIsTheTopLoadOfAWorkoutAndTheMostRepsAtIt() {
        java.time.Instant workout = java.time.Instant.parse("2026-09-28T17:00:00Z");
        List<TrainingLog.WorkSet> sets = List.of(set(workout, "80", 8), set(workout, "82.5", 5), set(workout, "80", 10), set(workout, "82.5", 6),
                set(java.time.Instant.parse("2026-09-24T22:30:00Z"), "80", 8));

        // The second workout is Friday 01:30 in Istanbul: its day is the user's.
        assertThat(TrainingStatuses.sessions(sets, java.time.ZoneId.of("Europe/Istanbul"))).containsExactly(
                new TrainingStatuses.Session(LocalDate.of(2026, 9, 25), new BigDecimal("80"), 8),
                new TrainingStatuses.Session(LocalDate.of(2026, 9, 28), new BigDecimal("82.5"), 6));
    }

    @Test
    void aTieBetweenLiftsIsBrokenTheSameWayWhateverTheOrder() {
        // One stalled session each; only squat went below last week: squat is the lift the ladder reads, in any order.
        List<TrainingStatuses.Session> bench = List.of(session(-8, "80", 8), session(-1, "80", 8));
        List<TrainingStatuses.Session> squat = List.of(session(-8, "100", 5), session(-1, "95", 5));
        Map<String, List<TrainingStatuses.Session>> benchFirst = new java.util.LinkedHashMap<>();
        benchFirst.put("bench_press", bench);
        benchFirst.put("squat", squat);
        Map<String, List<TrainingStatuses.Session>> squatFirst = new java.util.LinkedHashMap<>();
        squatFirst.put("squat", squat);
        squatFirst.put("bench_press", bench);

        assertThat(TrainingStatuses.of(benchFirst, List.of(), List.of(), 2, MONDAY, DayOfWeek.MONDAY, MONDAY.minusDays(30)).loadsBelowLastWeek()).isTrue();
        assertThat(TrainingStatuses.of(squatFirst, List.of(), List.of(), 2, MONDAY, DayOfWeek.MONDAY, MONDAY.minusDays(30)).loadsBelowLastWeek()).isTrue();
    }

    @Test
    void theWeeksPlanMissedCountBackFromTheWeekJustOver() {
        // Three sessions a week asked. The week just over (28 Sep) had 2, the one before (21 Sep) 2, the one before that 3.
        List<LocalDate> workouts = List.of(day(-21), day(-19), day(-17), day(-14), day(-12), day(-7), day(-5), day(-5));

        assertThat(TrainingStatuses.weeksPlanMissed(workouts, List.of(), 3, MONDAY, MONDAY.minusDays(60))).isEqualTo(2);
        assertThat(TrainingStatuses.weeksPlanMissed(workouts, List.of(), 2, MONDAY, MONDAY.minusDays(60))).as("two asked: kept").isZero();
        assertThat(TrainingStatuses.weeksPlanMissed(List.of(day(-10), day(-5)), List.of(), 3, MONDAY, MONDAY.minusDays(8))).as("not before the program")
                .isEqualTo(1);
    }

    @Test
    void theStatusIsTheMostStalledCompoundLift() {
        Map<String, List<TrainingStatuses.Session>> lifts = Map.of(
                "bench_press", List.of(session(-14, "80", 8), session(-10, "80", 8), session(-7, "80", 8)),
                "squat", List.of(session(-14, "100", 5), session(-10, "102.5", 5), session(-7, "105", 5)));

        TrainingChanges.Change hold = change(TrainingChanges.Kind.HOLD_LOAD, MONDAY.minusDays(7), null);
        TrainingStatus status = TrainingStatuses.of(lifts, List.of(hold), List.of(day(-14), day(-10), day(-7)), 2, MONDAY, DayOfWeek.MONDAY,
                MONDAY.minusDays(30));

        // Bench: 2 stalled; held one check-in week; the week just over (28 Sep) had one session of two asked.
        assertThat(status).isEqualTo(new TrainingStatus(2, 1, 0, false, false, 1));
        assertThat(TrainingStatuses.of(Map.of(), List.of(), List.of(), 2, MONDAY, DayOfWeek.MONDAY, MONDAY.minusDays(30)).stalledSessions()).isZero();
    }

    private static TrainingStatuses.Session session(int day, String kg, int reps) {
        return new TrainingStatuses.Session(day(day), new BigDecimal(kg), reps);
    }

    private static LocalDate day(int fromMonday) {
        return MONDAY.plusDays(fromMonday);
    }

    private static TrainingLog.WorkSet set(java.time.Instant workout, String kg, int reps) {
        return new TrainingLog.WorkSet("bench_press", workout, ExerciseCatalog.Load.EXTERNAL, new BigDecimal(kg), reps, 1, null);
    }

    private static TrainingChanges.Change change(TrainingChanges.Kind kind, LocalDate from, LocalDate until) {
        return new TrainingChanges.Change(UUID.randomUUID(), kind, from, until, kind == TrainingChanges.Kind.LIGHTER_WEEK ? new BigDecimal("0.5") : null);
    }
}
