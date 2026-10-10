package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Each swap option's in-session table (K-1011, ADR-073 Ek 8): what a move swapped in for today carries (WeekSession.swaps) — its
 * own last best set, "too heavy?" / heavier loads from it, the calibration step, no target — read from the account's one
 * scan of last sessions, on the repository's catalog and parameters.
 */
class SwapOptionTablesTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static ExerciseCatalog catalog;

    @BeforeAll
    static void catalog() throws IOException {
        catalog = ExerciseCatalogTestData.catalog();
    }

    @Test
    void anOptionDoneBeforeHasItsOwnLastBestSetAndATableFromIt() {
        // bench_press is swapped for dumbbell_bench_press: the dumbbell move's own best set (30 x 10, heaviest then most reps), not the bench's.
        Map<String, List<TrainingLog.WorkSet>> last = history(set("dumbbell_bench_press", "30", 10, 2), set("dumbbell_bench_press", "27.5", 12, 1),
                set("bench_press", "80", 5, 1));

        ProgramController.SwapOptionTable dumbbell = table(of("bench_press", last, Optional.empty()), "dumbbell_bench_press");

        assertThat(dumbbell.lastBestSet()).isEqualTo(new ProgramController.BestSet(new BigDecimal("30"), 10, 2));
        // The upper-body step is 2.5 kg; no gym: the engine's step either way. No target, so the calibration step is there too.
        assertThat(dumbbell.lighterLoadKg()).isEqualByComparingTo("27.5");
        assertThat(dumbbell.heavierLoadKg()).isEqualByComparingTo("32.5");
        assertThat(dumbbell.calibrationStepKg()).isEqualByComparingTo("2.5");
    }

    @Test
    void anOptionNeverDoneHasOnlyTheCalibrationStep() {
        ProgramController.SwapOptionTable machine = table(of("bench_press", history(set("bench_press", "80", 5, 1)), Optional.empty()),
                "machine_chest_press");

        assertThat(machine.lastBestSet()).isNull();
        assertThat(machine.lighterLoadKg()).isNull();
        assertThat(machine.heavierLoadKg()).isNull();
        assertThat(machine.calibrationStepKg()).isEqualByComparingTo("2.5");
    }

    @Test
    void theStepIsTheOptionsOwnRegionNotThePlannedMoves() {
        // squat (lower) is swapped for hack_squat (lower, 5 kg); bench_press (upper) for dip (upper, 2.5): each by its own muscle.
        ProgramController.SwapOptionTable hack = table(of("squat", history(set("hack_squat", "100", 8, 2)), Optional.empty()), "hack_squat");
        ProgramController.SwapOptionTable dip = table(of("bench_press", history(set("dip", "10", 8, 2)), Optional.empty()), "dip");

        assertThat(hack.lighterLoadKg()).isEqualByComparingTo("95");
        assertThat(hack.heavierLoadKg()).isEqualByComparingTo("105");
        assertThat(hack.calibrationStepKg()).isEqualByComparingTo("5");
        assertThat(dip.lighterLoadKg()).isEqualByComparingTo("7.5");
        assertThat(dip.heavierLoadKg()).isEqualByComparingTo("12.5");
        assertThat(dip.calibrationStepKg()).isEqualByComparingTo("2.5");
    }

    @Test
    void aBodyweightOptionKeepsItsLastTimeAndHasNoTable() {
        ProgramController.SwapOptionTable pushUp = table(of("bench_press", history(set("push_up", "0", 15, 2)), Optional.empty()), "push_up");

        assertThat(pushUp.lastBestSet()).isEqualTo(new ProgramController.BestSet(new BigDecimal("0"), 15, 2));
        assertThat(pushUp.lighterLoadKg()).isNull();
        assertThat(pushUp.heavierLoadKg()).isNull();
        assertThat(pushUp.calibrationStepKg()).isNull();
    }

    @Test
    void theGymInUseMakesTheLoadsOfTheOption() {
        // A rack of 20, 25, 30, 35 kg dumbbells: from 30, nothing heavier within 2.5 kg and the next down is 25 (ADR-032).
        GymStore.Gym rack = new GymStore.Gym(null, "Rack", true, new BigDecimal("20"), List.of(), weights("20", "25", "30", "35"), null, Map.of());

        ProgramController.SwapOptionTable dumbbell = table(of("bench_press", history(set("dumbbell_bench_press", "30", 8, 2)), Optional.of(rack)),
                "dumbbell_bench_press");

        assertThat(dumbbell.lighterLoadKg()).isEqualByComparingTo("25");
        assertThat(dumbbell.heavierLoadKg()).isNull();
    }

    @Test
    void oneEntryPerSwapOptionInTheirOrderAndNoneForTheUsersOwnMove() {
        List<String> options = SwapOptions.of("bench_press", List.of("bench_press"), catalog, Optional.empty());

        assertThat(of("bench_press", Map.of(), Optional.empty()).stream().map(ProgramController.SwapOptionTable::exerciseId).toList())
                .isEqualTo(options).isNotEmpty();
        assertThat(SwapOptionTables.of(List.of(), planned("custom:sled_push"), catalog, Map.of(), P, Optional.empty())).isEmpty();
    }

    @Test
    void anOptionsTableIsWhatTheTodaySwapRowOfThatMoveCarries() {
        // The swap row (ProgramController asShown) is the move as a planned move of the swapped one's sets and range, no target, its
        // own last time, through SessionTable.table; every move's option table must be those fields, with or without a gym.
        GymStore.Gym plates = new GymStore.Gym(null, "Plates", true, new BigDecimal("20"), weights("20", "10", "5", "2.5", "1.25"),
                weights("10", "12", "14", "16", "20"), new BigDecimal("5"), Map.of());
        Map<String, List<TrainingLog.WorkSet>> last = new LinkedHashMap<>();
        catalog.all().forEach(move -> last.put(move.id(), List.of(set(move.id(), "42.5", 8, 2))));
        int checked = 0;
        for (Optional<GymStore.Gym> gym : List.of(Optional.<GymStore.Gym>empty(), Optional.of(plates))) {
            for (ExerciseCatalog.Exercise move : catalog.all()) {
                ProgramStore.PlannedExercise planned = planned(move.id());
                for (ProgramController.SwapOptionTable option : SwapOptionTables.of(SwapOptions.of(move.id(), List.of(move.id()), catalog, gym), planned,
                        catalog, last, P, gym)) {
                    // What asShown builds for the swapped-in move.
                    ProgramStore.PlannedExercise row = new ProgramStore.PlannedExercise(option.exerciseId(), planned.sets(), planned.repMin(),
                            planned.repMax(), planned.targetRir());
                    Optional<TrainingLog.WorkSet> best = SessionTable.best(last.getOrDefault(option.exerciseId(), List.of()));
                    SessionTable.Table expected = SessionTable.table(catalog, row, Optional.empty(), best, false, planned.sets(), P, gym);

                    assertThat(option.lighterLoadKg()).as(move.id() + " -> " + option.exerciseId()).isEqualTo(expected.lighterKg());
                    assertThat(option.heavierLoadKg()).as(move.id() + " -> " + option.exerciseId()).isEqualTo(expected.heavierKg());
                    assertThat(option.calibrationStepKg()).as(move.id() + " -> " + option.exerciseId()).isEqualTo(expected.calibrationStepKg());
                    assertThat(option.lastBestSet()).isEqualTo(best.map(ProgramController.BestSet::of).orElse(null));
                    checked++;
                }
            }
        }
        assertThat(checked).as("options checked").isGreaterThan(50);
    }

    private static List<ProgramController.SwapOptionTable> of(String planned, Map<String, List<TrainingLog.WorkSet>> last, Optional<GymStore.Gym> gym) {
        return SwapOptionTables.of(SwapOptions.of(planned, List.of(planned), catalog, gym), planned(planned), catalog, last, P, gym);
    }

    private static ProgramController.SwapOptionTable table(List<ProgramController.SwapOptionTable> tables, String exerciseId) {
        return tables.stream().filter(table -> table.exerciseId().equals(exerciseId)).findFirst().orElseThrow();
    }

    private static ProgramStore.PlannedExercise planned(String exerciseId) {
        return new ProgramStore.PlannedExercise(exerciseId, 3, 6, 10, 2);
    }

    private static TrainingLog.WorkSet set(String exerciseId, String kg, int reps, Integer rir) {
        return new TrainingLog.WorkSet(exerciseId, Instant.parse("2026-10-05T18:00:00Z"), ExerciseCatalog.Load.EXTERNAL, new BigDecimal(kg), reps, rir, null);
    }

    private static Map<String, List<TrainingLog.WorkSet>> history(TrainingLog.WorkSet... sets) {
        Map<String, List<TrainingLog.WorkSet>> byMove = new LinkedHashMap<>();
        for (TrainingLog.WorkSet set : sets) {
            byMove.computeIfAbsent(set.exerciseId(), id -> new ArrayList<>()).add(set);
        }
        return byMove;
    }

    private static List<BigDecimal> weights(String... kg) {
        return java.util.Arrays.stream(kg).map(BigDecimal::new).toList();
    }
}
