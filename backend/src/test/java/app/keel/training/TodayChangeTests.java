package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Changing today's session (K-964, ADR-073 #5): the week's sessions on the calendar, the short version, a move to tomorrow
 * that never passes Sunday (the week re-laying itself), a skip that adds no catch-up. The week of Monday 5 October 2026.
 */
class TodayChangeTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final int SHORT = P.wholeNumber(ParameterKey.SHORT_SESSION_MOVES);
    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 5);
    private static final LocalDate TUESDAY = MONDAY.plusDays(1);
    private static final LocalDate WEDNESDAY = MONDAY.plusDays(2);
    private static final LocalDate THURSDAY = MONDAY.plusDays(3);
    private static final LocalDate SATURDAY = MONDAY.plusDays(5);
    private static final LocalDate SUNDAY = MONDAY.plusDays(6);

    private static final ProgramStore.Day UPPER = day(DayOfWeek.MONDAY, "bench_press", "barbell_row", "overhead_press", "barbell_curl", "triceps_pushdown");
    private static final ProgramStore.Day LOWER = day(DayOfWeek.TUESDAY, "squat", "romanian_deadlift", "standing_calf_raise");
    private static final ProgramStore.Day PUSH = day(DayOfWeek.THURSDAY, "dumbbell_bench_press", "cable_fly");
    private static final ProgramStore.Day ANYDAY = day(null, "leg_press");

    @Test
    void theWeekPutsEachDayOnItsWeekdayAndADayOnNoWeekdayOnNone() {
        List<TodayChanges.Session> week = TodayChanges.week(List.of(PUSH, UPPER, ANYDAY, LOWER), MONDAY, Map.of(), SHORT);

        assertThat(week).extracting(TodayChanges.Session::date).containsExactly(MONDAY, TUESDAY, THURSDAY);
        assertThat(week).extracting(TodayChanges.Session::programDayId).containsExactly(UPPER.id(), LOWER.id(), PUSH.id());
        assertThat(week).noneMatch(session -> session.moved() || session.skipped() || session.shortVersion());
        assertThat(week.getFirst().exerciseIds()).containsExactly("bench_press", "barbell_row", "overhead_press", "barbell_curl", "triceps_pushdown");
        assertThat(TodayChanges.monday(SUNDAY)).isEqualTo(MONDAY);
        assertThat(TodayChanges.monday(MONDAY)).isEqualTo(MONDAY);
    }

    @Test
    void theShortVersionIsTheFirstMovesInTheProgramsOrderAndStillASessionOfTheWeek() {
        Map<UUID, TodayChanges.Change> changes = Map.of(UPPER.id(), TodayChanges.Change.NONE.shortened());

        TodayChanges.Session upper = TodayChanges.week(List.of(UPPER, LOWER), MONDAY, changes, SHORT).getFirst();

        assertThat(upper.exerciseIds()).containsExactly("bench_press", "barbell_row", "overhead_press");
        assertThat(upper.shortVersion()).isTrue();
        assertThat(upper.skipped()).isFalse();
        assertThat(TodayChanges.on(TodayChanges.week(List.of(UPPER, LOWER), MONDAY, changes, SHORT), MONDAY)).containsExactly(upper);
    }

    @Test
    void aShortDayWithFewerMovesKeepsThemAll() {
        Map<UUID, TodayChanges.Change> changes = Map.of(PUSH.id(), TodayChanges.Change.NONE.shortened());

        assertThat(TodayChanges.week(List.of(PUSH), MONDAY, changes, SHORT).getFirst().exerciseIds()).containsExactly("dumbbell_bench_press", "cable_fly");
    }

    @Test
    void todaysSwapIsInTheSessionAndTheShortVersionCountsItsPlace() {
        Map<UUID, TodayChanges.Change> changes = Map.of(UPPER.id(), TodayChanges.Change.NONE.swapped("barbell_row", "seated_row").shortened());

        TodayChanges.Session upper = TodayChanges.week(List.of(UPPER), MONDAY, changes, SHORT).getFirst();
        assertThat(upper.exerciseIds()).containsExactly("bench_press", "seated_row", "overhead_press");
        assertThat(upper.swaps()).as("each swap in force, by the planned move").isEqualTo(Map.of("barbell_row", "seated_row"));
        // A swap kept for a move the day no longer has is not in force.
        assertThat(TodayChanges.week(List.of(UPPER), MONDAY, Map.of(UPPER.id(), TodayChanges.Change.NONE.swapped("squat", "leg_press")), SHORT)
                .getFirst().swaps()).isEmpty();
        assertThat(TodayChanges.Change.NONE.swapped("barbell_row", "seated_row").swapped("barbell_row", "barbell_row").swaps()).isEmpty();
    }

    @Test
    void aSwapFromNowOnEndsTodaysSwapOfThatMoveAndAnyOneToItsNewMove() {
        TodayChanges.Change today = TodayChanges.Change.NONE.swapped("squat", "leg_press").swapped("romanian_deadlift", "hack_squat").shortened();

        assertThat(today.withoutSwapsOf("squat", "bulgarian_split_squat").swaps()).isEqualTo(Map.of("romanian_deadlift", "hack_squat"));
        assertThat(today.withoutSwapsOf("squat", "hack_squat").swaps()).isEmpty();
        assertThat(today.withoutSwapsOf("squat", "hack_squat").shortVersion()).isTrue();
    }

    @Test
    void movingPutsTodaysSessionOnTomorrow() {
        List<TodayChanges.Session> week = TodayChanges.week(List.of(UPPER, PUSH), MONDAY, Map.of(), SHORT);

        assertThat(TodayChanges.moveToTomorrow(week, UPPER.id(), MONDAY)).contains(Map.of(UPPER.id(), TUESDAY));
    }

    @Test
    void aSessionAlreadyOnTomorrowMovesOnADayWithIt() {
        List<TodayChanges.Session> week = TodayChanges.week(List.of(UPPER, LOWER, PUSH), MONDAY, Map.of(), SHORT);

        assertThat(TodayChanges.moveToTomorrow(week, UPPER.id(), MONDAY)).contains(Map.of(UPPER.id(), TUESDAY, LOWER.id(), WEDNESDAY));
        // Moved, then laid out again: on their new days, marked moved; the one not touched stays.
        Map<UUID, TodayChanges.Change> changes = Map.of(UPPER.id(), TodayChanges.Change.NONE.on(TUESDAY), LOWER.id(), TodayChanges.Change.NONE.on(WEDNESDAY));
        List<TodayChanges.Session> after = TodayChanges.week(List.of(UPPER, LOWER, PUSH), MONDAY, changes, SHORT);
        assertThat(after).extracting(TodayChanges.Session::date).containsExactly(TUESDAY, WEDNESDAY, THURSDAY);
        assertThat(after).extracting(TodayChanges.Session::moved).containsExactly(true, true, false);
    }

    @Test
    void aMoveNeverPassesSunday() {
        ProgramStore.Day saturday = day(DayOfWeek.SATURDAY, "squat");
        ProgramStore.Day sunday = day(DayOfWeek.SUNDAY, "bench_press");

        // Sunday's session has no tomorrow in its week.
        assertThat(TodayChanges.moveToTomorrow(TodayChanges.week(List.of(sunday), MONDAY, Map.of(), SHORT), sunday.id(), SUNDAY)).isEmpty();
        // Saturday's goes to a free Sunday; onto Sunday's session it would push that one past Sunday.
        assertThat(TodayChanges.moveToTomorrow(TodayChanges.week(List.of(saturday), MONDAY, Map.of(), SHORT), saturday.id(), SATURDAY))
                .contains(Map.of(saturday.id(), SUNDAY));
        assertThat(TodayChanges.moveToTomorrow(TodayChanges.week(List.of(saturday, sunday), MONDAY, Map.of(), SHORT), saturday.id(), SATURDAY)).isEmpty();
    }

    @Test
    void onlyTodaysSessionMoves() {
        List<TodayChanges.Session> week = TodayChanges.week(List.of(UPPER, PUSH), MONDAY, Map.of(), SHORT);

        assertThat(TodayChanges.moveToTomorrow(week, PUSH.id(), MONDAY)).isEmpty();
        assertThat(TodayChanges.moveToTomorrow(week, ANYDAY.id(), MONDAY)).isEmpty();
    }

    @Test
    void aSkippedSessionIsNotDoneAndNothingIsPlannedAgain() {
        Map<UUID, TodayChanges.Change> changes = Map.of(UPPER.id(), TodayChanges.Change.NONE.skip());

        List<TodayChanges.Session> week = TodayChanges.week(List.of(UPPER, LOWER, PUSH), MONDAY, changes, SHORT);

        // No catch-up: the week has the same sessions on the same days, the skipped one marked, none added or moved.
        assertThat(week).extracting(TodayChanges.Session::date).containsExactly(MONDAY, TUESDAY, THURSDAY);
        assertThat(week).extracting(TodayChanges.Session::skipped).containsExactly(true, false, false);
        assertThat(week).noneMatch(TodayChanges.Session::moved);
        assertThat(TodayChanges.on(week, MONDAY)).isEmpty();
        // Skipped, it is no longer today's session: it does not move either.
        assertThat(TodayChanges.moveToTomorrow(week, UPPER.id(), MONDAY)).isEmpty();
    }

    @Test
    void aSessionMovedTwiceStaysInItsWeek() {
        Map<UUID, TodayChanges.Change> changes = Map.of(PUSH.id(), TodayChanges.Change.NONE.on(SATURDAY));
        List<TodayChanges.Session> week = TodayChanges.week(List.of(PUSH), MONDAY, changes, SHORT);

        assertThat(TodayChanges.on(week, SATURDAY)).extracting(TodayChanges.Session::programDayId).containsExactly(PUSH.id());
        assertThat(TodayChanges.moveToTomorrow(week, PUSH.id(), SATURDAY)).contains(Map.of(PUSH.id(), SUNDAY));
        assertThat(TodayChanges.moveToTomorrow(TodayChanges.week(List.of(PUSH), MONDAY, Map.of(PUSH.id(), TodayChanges.Change.NONE.on(SUNDAY)), SHORT),
                PUSH.id(), SUNDAY)).isEqualTo(Optional.empty());
    }

    private static ProgramStore.Day day(DayOfWeek weekday, String... moves) {
        return new ProgramStore.Day(UUID.randomUUID(), null, "Day", weekday, Arrays.stream(moves)
                .map(move -> new ProgramStore.PlannedExercise(move, 3, 6, 10, 1, null, null, null, UUID.randomUUID(), null, false)).toList());
    }
}
