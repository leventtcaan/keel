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
