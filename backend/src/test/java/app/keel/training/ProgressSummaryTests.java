package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * The progress and end-of-workout summaries (K-965, ADR-078, ADR-075 #7): presentations of the log, not rules. The phone
 * fills en.json templates with these facts and computes nothing (ADR-075 #3).
 */
class ProgressSummaryTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final ZoneId UTC = ZoneOffset.UTC;
    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 5);

    @ParameterizedTest(name = "{0} to {1}, {2} s paused: {3} min")
    @CsvSource({
        // K-998: endedAt − startedAt − pausedSeconds, whole minutes rounded half up.
        "2026-10-09T18:00:00Z, 2026-10-09T18:52:00Z, 0, 52",
        "2026-10-09T18:00:00Z, 2026-10-09T18:52:00Z, 600, 42",
        "2026-10-09T18:00:00Z, 2026-10-09T18:00:29Z, 0, 0",
        "2026-10-09T18:00:00Z, 2026-10-09T18:00:30Z, 0, 1",
        "2026-10-09T18:00:00Z, 2026-10-09T18:10:00Z, 600, 0",
        "2026-10-09T18:00:00Z, 2026-10-09T19:31:29Z, 89, 90"
    })
    void aSessionsMinutesAreItsActiveTime(String startedAt, String endedAt, int pausedSeconds, int minutes) {
        assertThat(ProgressSummary.activeMinutes(Instant.parse(startedAt), Instant.parse(endedAt), pausedSeconds)).isEqualTo(minutes);
    }

    @Test
    void eachPrimaryMuscleHasItsWeeksSetsAgainstItsTargetAsAShareCappedAtOne() {
        int perMuscle = P.wholeNumber(ParameterKey.WEEKLY_SETS_PER_MUSCLE);
        int arm = P.wholeNumber(ParameterKey.ARM_WEEKLY_SETS_MIN);

        List<ProgressSummary.MuscleSets> muscles = ProgressSummary.muscles(Map.of("chest", 12, "biceps", 6, "quads", 8),
                Map.of("chest", 7, "biceps", 8, "calves", 3), Set.of("biceps", "triceps"), P);

        // Alphabetical; planned from the program, done from the log, either alone is enough to be on the map.
        assertThat(muscles).containsExactly(
                new ProgressSummary.MuscleSets("biceps", 6, 8, arm, share(6, arm), BigDecimal.ONE.setScale(2)),
                new ProgressSummary.MuscleSets("calves", 0, 3, perMuscle, share(0, perMuscle), share(3, perMuscle)),
                new ProgressSummary.MuscleSets("chest", 12, 7, perMuscle, BigDecimal.ONE.setScale(2), share(7, perMuscle)),
                new ProgressSummary.MuscleSets("quads", 8, 0, perMuscle, share(8, perMuscle), share(0, perMuscle)));
    }

    @Test
    void aShareIsRoundedDownNeverToAFullMuscleNotYetReached() {
        assertThat(ProgressSummary.muscles(Map.of("chest", 29), Map.of(), Set.of(), RepositoryParameters.forSex(Sex.MALE)).getFirst().plannedShare())
                .isEqualByComparingTo("1");
        List<ProgressSummary.MuscleSets> almost = ProgressSummary.muscles(Map.of("biceps", 5), Map.of("biceps", 2), Set.of("biceps"), P);
        assertThat(almost.getFirst().plannedShare()).isLessThan(BigDecimal.ONE);
        assertThat(almost.getFirst().doneShare()).isEqualByComparingTo(share(2, P.wholeNumber(ParameterKey.ARM_WEEKLY_SETS_MIN)));
    }

    /**
     * The effort line's kind, one per move, in this order: stuck (the deload ladder's stall, plateau_sessions, H3 B5, counted
     * as the weekly call counts it: TrainingStatusReader's window, given here), then easier (the same load and reps with
     * more left), then reps rising at one load. Sessions oldest first, each "load×reps@left" its best set.
     */
    @ParameterizedTest(name = "{0} stalled={1} held={2} → {3}")
    @CsvSource(delimiter = '|', value = {
            "100x8@0 100x8@1                     | 1 | false | EASIER      | 100",
            "100x8@0 100x8@0                     | 1 | false |             |     ",
            "100x8@1 100x8@0                     | 1 | false |             |     ",
            "100x8@  100x8@1                     | 1 | false |             |     ",
            "72.5x8@0 72.5x8@0 72.5x8@0 72.5x8@0 | 3 | true  | STUCK       | 72.5",
            "72.5x8@0 72.5x8@0 72.5x8@0 72.5x8@1 | 3 | false | STUCK       | 72.5",
            "72.5x8@0 72.5x8@0 72.5x8@0          | 2 | false |             |     ",
            // Stalled in the history shown (imported, or before this program), not in the call's window: not stuck.
            "72.5x8@0 72.5x8@0 72.5x8@0 72.5x8@0 | 0 | true  |             |     ",
            "60x8@1 62.5x6@1 62.5x7@1 62.5x9@1   | 0 | false | REPS_RISING | 62.5",
            "62.5x6@1                            | 0 | false |             |     ",
            "62.5x9@1 62.5x6@1                   | 1 | false |             |     "})
    void theEffortLineIsTheFirstKindTheSessionsShow(String sessions, int stalled, boolean held, ProgressSummary.EffortKind kind, String kg) {
        List<ProgressSummary.Session> read = sessions(sessions);

        Optional<ProgressSummary.EffortLine> line = ProgressSummary.effort(read, stalled, held, P);

        if (kind == null) {
            assertThat(line).isEmpty();
            return;
        }
        assertThat(line).isPresent();
        ProgressSummary.EffortLine effort = line.get();
        assertThat(effort.kind()).isEqualTo(kind);
        assertThat(effort.loadKg()).isEqualByComparingTo(kg);
        switch (kind) {
            case EASIER -> assertThat(List.of(effort.reps(), effort.repsLeft(), effort.repsLeftBefore())).containsExactly(8, 1, 0);
            case STUCK -> {
                assertThat(effort.sessions()).isEqualTo(stalled);
                assertThat(effort.held()).isEqualTo(held);
            }
            case REPS_RISING -> {
                assertThat(effort.repsGained()).isEqualTo(3);
                assertThat(effort.sessions()).isEqualTo(3);
                // Since the first session at this load, in whole weeks to the latest: sessions three days apart.
                assertThat(effort.since()).isEqualTo(read.get(1).day());
                assertThat(effort.weeks()).isEqualTo(0);
            }
        }
    }

    @Test
    void theStallIsTheLaddersPlateau() {
        int plateau = P.wholeNumber(ParameterKey.PLATEAU_SESSIONS);
        List<ProgressSummary.Session> flat = sessions("80x10@0 80x10@0 80x10@0 80x10@0 80x10@0");

        assertThat(ProgressSummary.effort(flat, plateau - 1, false, P)).as("under plateau_sessions").isEmpty();
        assertThat(ProgressSummary.effort(flat, plateau, false, P)).map(ProgressSummary.EffortLine::kind).contains(ProgressSummary.EffortKind.STUCK);
    }

    @Test
    void aOneSidedMovesSetsCountOncePerWorkoutAsTheSideThatDidLess() {
        Instant at = MONDAY.atStartOfDay(UTC).toInstant();
        List<TrainingLog.WorkSet> workout = new ArrayList<>(List.of(set(at, "60", 8, 1), set(at, "60", 8, 1), set(at, "60", 8, 1)));
        for (Side side : List.of(Side.LEFT, Side.RIGHT, Side.LEFT, Side.RIGHT, Side.LEFT)) {
            workout.add(new TrainingLog.WorkSet("one_arm_dumbbell_row", at, ExerciseCatalog.Load.EXTERNAL, new BigDecimal("30"), 10, 1, side));
        }

        // Three bench sets; the row three on the left, two on the right: two (SessionProgress: the side that did less decides).
        assertThat(ProgressSummary.counted(workout)).isEqualTo(Map.of("bench_press", 3, "one_arm_dumbbell_row", 2));
        assertThat(ProgressSummary.counted(List.of())).isEmpty();
    }

    @Test
    void eachWorkoutsBestSetIsItsSessionOnTheUsersCalendar() {
        Instant late = Instant.parse("2026-10-05T23:30:00Z");
        List<TrainingLog.WorkSet> history = List.of(set(late, "60", 10, 2), set(late, "62.5", 8, 0), set(late, "62.5", 8, 1),
                set(late.plusSeconds(86_400 * 2), "62.5", 9, 1));

        List<ProgressSummary.Session> read = ProgressSummary.sessions(history, ZoneId.of("Europe/Istanbul"));

        // 23:30 UTC is the next day in Istanbul; the fewest left wins a tie (SessionTable.best).
        assertThat(read).containsExactly(new ProgressSummary.Session(LocalDate.of(2026, 10, 6), set(late, "62.5", 8, 0)),
                new ProgressSummary.Session(LocalDate.of(2026, 10, 8), set(late.plusSeconds(86_400 * 2), "62.5", 9, 1)));
    }

    @Test
    void eachWeekHasItsBestSetAndWhetherTheLoadWasHeld() {
        List<ProgressSummary.Session> read = List.of(session(MONDAY.minusDays(6), "80", 8, 1), session(MONDAY.minusDays(3), "80", 9, 0),
                session(MONDAY.plusDays(2), "82.5", 6, 1), session(MONDAY.plusDays(4), "82.5", 7, 1));
        List<TrainingChanges.Change> changes = List.of(new TrainingChanges.Change(UUID.randomUUID(), TrainingChanges.Kind.HOLD_LOAD,
                MONDAY.plusDays(6), null, null), new TrainingChanges.Change(UUID.randomUUID(), TrainingChanges.Kind.LIGHTER_WEEK,
                MONDAY.minusDays(7), MONDAY.minusDays(1), new BigDecimal("0.5")));

        assertThat(ProgressSummary.weeks(read, changes, true)).containsExactly(
                new ProgressSummary.WeekBest(MONDAY.minusDays(7), new BigDecimal("80"), 9, 0, false),
                new ProgressSummary.WeekBest(MONDAY, new BigDecimal("82.5"), 7, 1, true));
        // The hold is on the load the engine adds: an isolation move's week is never held (G6 K-33).
        assertThat(ProgressSummary.weeks(read, changes, false)).extracting(ProgressSummary.WeekBest::held).containsOnly(false);
    }

    @ParameterizedTest(name = "{0} kg after {1} kg → {2}%")
    @CsvSource({"1100, 1000, 10", "950, 1000, -5", "1000, 1000, 0", "1001, 3000, -67", "500, 0, ", "500, , "})
    void theWeightLiftedIsComparedWithTheLastSessionOfTheSameDayInWholePercent(String now, String before, Integer percent) {
        assertThat(ProgressSummary.changePercent(new BigDecimal(now), Optional.ofNullable(before).map(BigDecimal::new)))
                .isEqualTo(Optional.ofNullable(percent));
    }

    @Test
    void theWeightLiftedIsLoadTimesRepsOverTheWorkingSets() {
        Instant at = MONDAY.atStartOfDay(UTC).toInstant();
        assertThat(ProgressSummary.lifted(List.of(set(at, "100", 8, 1), set(at, "102.5", 6, 0), set(at, "0", 12, 1))))
                .isEqualByComparingTo("1415");
        assertThat(ProgressSummary.lifted(List.of())).isEqualByComparingTo("0");
    }

    /** "What moved" (K-1008, ADR-075 #7): each move's best set now against its best in the last session of the same day. */
    @ParameterizedTest(name = "{0} after {1} → {2} {3}")
    @CsvSource(delimiter = ';', value = {
        "100x8; 100x7; REPS; 1", // the same load, a rep more
        "100x6; 100x8; REPS; -2", // the same load, fewer reps: said as it is
        "102.5x6; 100x8; LOAD; 2.5", // heavier
        "95x10; 100x8; LOAD; -5", // lighter
        "100x8; 100x8; SAME; ", // the same
        "100x8; ; FIRST; ", // nothing to compare with
    })
    void eachMovesBestSetIsComparedWithItsBestInTheLastSessionOfTheDay(String now, String before, ProgressSummary.ChangeKind change, BigDecimal by) {
        Instant at = MONDAY.atStartOfDay(UTC).toInstant();
        List<TrainingLog.WorkSet> earlier = before == null ? List.of() : List.of(parsed(at.minusSeconds(86_400), before));
        List<ProgressSummary.MoveChange> moves = ProgressSummary.moves(List.of(parsed(at, now)), earlier, List.of(), Set.of());
        assertThat(moves).hasSize(1);
        assertThat(moves.getFirst().change()).isEqualTo(change);
        if (by == null) assertThat(moves.getFirst().by()).isNull();
        else assertThat(moves.getFirst().by()).isEqualByComparingTo(by);
    }

    @Test
    void aMoveNotInTheDaysLastSessionIsComparedWithItsOwnLastSessionOnAnyDay() {
        Instant at = MONDAY.atStartOfDay(UTC).toInstant();
        Instant older = at.minusSeconds(5 * 86_400);
        Instant newer = at.minusSeconds(2 * 86_400);
        TrainingLog.WorkSet row = move("seated_row", at, "60", 10, ExerciseCatalog.Load.EXTERNAL, null);
        // The day's last session had only the bench; the row was done on other days, last at 57.5 (not the heavier 62.5 before it).
        List<List<TrainingLog.WorkSet>> sessions = List.of(
                List.of(move("seated_row", older, "62.5", 8, ExerciseCatalog.Load.EXTERNAL, null)),
                List.of(move("seated_row", newer, "57.5", 10, ExerciseCatalog.Load.EXTERNAL, null)),
                List.of(set(newer, "100", 8, 1)));
        List<ProgressSummary.MoveChange> moves = ProgressSummary.moves(List.of(set(at, "100", 8, 1), row,
                move("face_pull", at, "20", 12, ExerciseCatalog.Load.EXTERNAL, null)), List.of(set(newer, "100", 8, 1)), sessions, Set.of());
        assertThat(moves).extracting(ProgressSummary.MoveChange::change)
                .containsExactly(ProgressSummary.ChangeKind.SAME, ProgressSummary.ChangeKind.LOAD, ProgressSummary.ChangeKind.FIRST);
        assertThat(moves.get(1).by()).isEqualByComparingTo("2.5");
    }

    @Test
    void theSameLoadOfAMoveTheCallHoldsIsHeldNotSame() {
        Instant at = MONDAY.atStartOfDay(UTC).toInstant();
        List<TrainingLog.WorkSet> before = List.of(set(at.minusSeconds(86_400), "100", 8, 1));
        assertThat(ProgressSummary.moves(List.of(set(at, "100", 8, 1)), before, List.of(), Set.of("bench_press")).getFirst().change()).isEqualTo(ProgressSummary.ChangeKind.HELD);
        // A move the call does not hold (an isolation move: the engine adds no load to it, G6 K-33) is the same.
        assertThat(ProgressSummary.moves(List.of(set(at, "100", 8, 1)), before, List.of(), Set.of()).getFirst().change()).isEqualTo(ProgressSummary.ChangeKind.SAME);
        // A held load with a rep more is reps: what moved is said.
        assertThat(ProgressSummary.moves(List.of(set(at, "100", 9, 1)), before, List.of(), Set.of("bench_press")).getFirst().change()).isEqualTo(ProgressSummary.ChangeKind.REPS);
    }

    @Test
    void eachMoveOnceInTheOrderFirstDoneWithItsBestSetNeverASetOfNoReps() {
        Instant at = MONDAY.atStartOfDay(UTC).toInstant();
        TrainingLog.WorkSet row = move("seated_row", at, "60", 10, ExerciseCatalog.Load.EXTERNAL, null);
        List<ProgressSummary.MoveChange> moves = ProgressSummary.moves(
                List.of(set(at, "100", 8, 1), row, set(at, "105", 0, null), set(at, "100", 9, 0)), List.of(), List.of(), Set.of());
        assertThat(moves).extracting(ProgressSummary.MoveChange::exerciseId).containsExactly("bench_press", "seated_row");
        assertThat(moves.getFirst().best()).isEqualTo(new ProgressSummary.Best(new BigDecimal("100"), 9));
    }

    @Test
    void aOneSidedMovesSidesAreOneHistoryAndABodyweightMoveComparesItsAddedLoad() {
        Instant at = MONDAY.atStartOfDay(UTC).toInstant();
        Instant before = at.minusSeconds(86_400);
        List<ProgressSummary.MoveChange> sided = ProgressSummary.moves(
                List.of(move("one_arm_dumbbell_row", at, "30", 10, ExerciseCatalog.Load.EXTERNAL, Side.LEFT),
                        move("one_arm_dumbbell_row", at, "30", 9, ExerciseCatalog.Load.EXTERNAL, Side.RIGHT)),
                List.of(move("one_arm_dumbbell_row", before, "30", 9, ExerciseCatalog.Load.EXTERNAL, Side.RIGHT)), List.of(), Set.of());
        assertThat(sided.getFirst()).isEqualTo(new ProgressSummary.MoveChange("one_arm_dumbbell_row", new ProgressSummary.Best(new BigDecimal("30"), 10),
                ProgressSummary.ChangeKind.REPS, BigDecimal.ONE));
        List<ProgressSummary.MoveChange> dip = ProgressSummary.moves(
                List.of(move("dip", at, "10", 8, ExerciseCatalog.Load.BODYWEIGHT_PLUS_EXTERNAL, null)),
                List.of(move("dip", before, "7.5", 8, ExerciseCatalog.Load.BODYWEIGHT_PLUS_EXTERNAL, null)), List.of(), Set.of());
        assertThat(dip.getFirst().change()).isEqualTo(ProgressSummary.ChangeKind.LOAD);
        assertThat(dip.getFirst().by()).isEqualByComparingTo("2.5");
        List<ProgressSummary.MoveChange> pullUp = ProgressSummary.moves(
                List.of(move("pull_up", at, "0", 9, ExerciseCatalog.Load.BODYWEIGHT, null)),
                List.of(move("pull_up", before, "0", 7, ExerciseCatalog.Load.BODYWEIGHT, null)), List.of(), Set.of());
        assertThat(pullUp.getFirst()).isEqualTo(new ProgressSummary.MoveChange("pull_up", new ProgressSummary.Best(new BigDecimal("0"), 9),
                ProgressSummary.ChangeKind.REPS, BigDecimal.valueOf(2)));
    }

    private static TrainingLog.WorkSet parsed(Instant at, String loadByReps) {
        String[] parts = loadByReps.split("x");
        return set(at, parts[0], Integer.parseInt(parts[1]), 1);
    }

    private static TrainingLog.WorkSet move(String id, Instant at, String kg, int reps, ExerciseCatalog.Load load, Side side) {
        return new TrainingLog.WorkSet(id, at, load, new BigDecimal(kg), reps, 1, side);
    }

    private static BigDecimal share(int sets, int target) {
        return BigDecimal.valueOf(Math.min(sets, target)).divide(BigDecimal.valueOf(target), 2, java.math.RoundingMode.DOWN);
    }

    /** "load×reps@left …", three days apart from MONDAY; an empty left is a set logged without it. */
    private static List<ProgressSummary.Session> sessions(String text) {
        List<ProgressSummary.Session> sessions = new ArrayList<>();
        String[] each = text.trim().split("\\s+");
        for (int i = 0; i < each.length; i++) {
            String[] loadAndRest = each[i].split("x");
            String[] repsAndLeft = loadAndRest[1].split("@", -1);
            sessions.add(session(MONDAY.plusDays(3L * i), loadAndRest[0], Integer.parseInt(repsAndLeft[0]),
                    repsAndLeft[1].isEmpty() ? null : Integer.parseInt(repsAndLeft[1])));
        }
        return sessions;
    }

    private static ProgressSummary.Session session(LocalDate day, String kg, int reps, Integer rir) {
        return new ProgressSummary.Session(day, set(day.atStartOfDay(UTC).toInstant(), kg, reps, rir));
    }

    private static TrainingLog.WorkSet set(Instant at, String kg, int reps, Integer rir) {
        return PersonalRecordTests.set(at, kg, reps, rir);
    }
}
