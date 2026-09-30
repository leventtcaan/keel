package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.TrainingStatus;
import java.math.BigDecimal;
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
        TrainingChanges.Change hold = change(TrainingChanges.Kind.HOLD_LOAD, MONDAY.minusDays(15), null);
        TrainingChanges.Change lighterLastWeek = change(TrainingChanges.Kind.LIGHTER_WEEK, MONDAY.minusDays(7), MONDAY.minusDays(1));

        assertThat(TrainingStatuses.weeksLoadHeld(List.of(hold), MONDAY)).as("two whole weeks").isEqualTo(2);
        assertThat(TrainingStatuses.weeksLoadHeld(List.of(), MONDAY)).isZero();
        assertThat(TrainingStatuses.restedLastWeek(List.of(lighterLastWeek), MONDAY)).isTrue();
        assertThat(TrainingStatuses.restedLastWeek(List.of(change(TrainingChanges.Kind.REST_WEEK, MONDAY.minusDays(21), MONDAY.minusDays(15))),
                MONDAY)).as("the week before last").isFalse();
        assertThat(TrainingStatuses.restedLastWeek(List.of(change(TrainingChanges.Kind.REST_WEEK, MONDAY.minusDays(14), MONDAY.minusDays(8))),
                MONDAY)).as("ended the day before last week").isFalse();
        assertThat(TrainingStatuses.restedLastWeek(List.of(hold), MONDAY)).as("a hold is not rest").isFalse();
    }

    @Test
    void theWeeksPlanMissedCountBackFromTheWeekJustOver() {
        // Three sessions a week asked. The week just over (28 Sep) had 2, the one before (21 Sep) 2, the one before that 3.
        List<LocalDate> workouts = List.of(day(-21), day(-19), day(-17), day(-14), day(-12), day(-7), day(-5), day(-5));

        assertThat(TrainingStatuses.weeksPlanMissed(workouts, 3, MONDAY, MONDAY.minusDays(60))).isEqualTo(2);
        assertThat(TrainingStatuses.weeksPlanMissed(workouts, 2, MONDAY, MONDAY.minusDays(60))).as("two asked: kept").isZero();
        assertThat(TrainingStatuses.weeksPlanMissed(List.of(), 3, MONDAY, MONDAY.minusDays(8))).as("not before the program").isEqualTo(1);
    }

    @Test
    void theStatusIsTheMostStalledCompoundLift() {
        Map<String, List<TrainingStatuses.Session>> lifts = Map.of(
                "bench_press", List.of(session(-14, "80", 8), session(-10, "80", 8), session(-7, "80", 8)),
                "squat", List.of(session(-14, "100", 5), session(-10, "102.5", 5), session(-7, "105", 5)));

        TrainingStatus status = TrainingStatuses.of(lifts, List.of(), List.of(day(-14), day(-10), day(-7)), 2, MONDAY, MONDAY.minusDays(30));

        assertThat(status.stalledSessions()).isEqualTo(2);
        assertThat(status.loadsBelowLastWeek()).isFalse();
        assertThat(TrainingStatuses.of(Map.of(), List.of(), List.of(), 2, MONDAY, MONDAY.minusDays(30)).stalledSessions()).isZero();
    }

    private static TrainingStatuses.Session session(int day, String kg, int reps) {
        return new TrainingStatuses.Session(day(day), new BigDecimal(kg), reps);
    }

    private static LocalDate day(int fromMonday) {
        return MONDAY.plusDays(fromMonday);
    }

    private static TrainingChanges.Change change(TrainingChanges.Kind kind, LocalDate from, LocalDate until) {
        return new TrainingChanges.Change(UUID.randomUUID(), kind, from, until, kind == TrainingChanges.Kind.LIGHTER_WEEK ? new BigDecimal("0.5") : null);
    }
}
