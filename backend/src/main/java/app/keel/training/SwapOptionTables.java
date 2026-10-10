package app.keel.training;

import app.keel.engine.Parameters;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The in-session table of each swap option of a planned move (K-1011, ADR-073 Ek 8): what the server shows for the option when
 * it is swapped in for today (WeekSession.swaps) — the planned move's sets and range, no target, its own last best set and the
 * table from it — so the phone, swapping in the session offline, only picks (U1). The table is {@link SessionTable#table}, the
 * one the swap row and the program's moves come through; the last sessions are the account's one scan (TrainingLog), so an
 * option costs no query.
 */
final class SwapOptionTables {

    private SwapOptionTables() {
    }

    /** One entry for each of {@code options} (SwapOptions.of), in their order. */
    static List<ProgramController.SwapOptionTable> of(List<String> options, ProgramStore.PlannedExercise planned, ExerciseCatalog catalog,
            Map<String, List<TrainingLog.WorkSet>> lastSessions, Parameters parameters, Optional<GymStore.Gym> gym) {
        return options.stream().map(option -> {
            Optional<TrainingLog.WorkSet> best = SessionTable.best(lastSessions.getOrDefault(option, List.of()));
            ProgramStore.PlannedExercise swappedIn = new ProgramStore.PlannedExercise(option, planned.sets(), planned.repMin(), planned.repMax(),
                    planned.targetRir());
            SessionTable.Table table = SessionTable.table(catalog, swappedIn, Optional.empty(), best, false, planned.sets(), parameters, gym);
            return new ProgramController.SwapOptionTable(option, best.map(ProgramController.BestSet::of).orElse(null), table.lighterKg(),
                    table.heavierKg(), table.calibrationStepKg());
        }).toList();
    }
}
