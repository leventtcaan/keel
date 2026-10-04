package app.keel.training;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ApiLimits;
import app.keel.shared.ErrorCode;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/workout-imports (K-615, ADR-053): past sessions from another app's export, read on the phone. Stored
 * finished and marked with their app; listed like any session and never read by the engine (TrainingLog leaves them out).
 * No program target moves and nothing reaches Apple Health: those follow a finish in the app, which an import is not.
 */
@RestController
@EnableConfigurationProperties(WorkoutImportController.ImportLimits.class)
class WorkoutImportController {

    /**
     * How much one request carries (keel.training.import): the contract's maxItems, and the phone's
     * import_workouts_per_request (data/parameters/import.json) — ImportLimitsMirrorTests keeps the three equal.
     */
    @ConfigurationProperties("keel.training.import")
    record ImportLimits(int maxWorkouts, int maxSets) {
    }

    record WorkoutImport(ImportSource source, List<ImportedWorkout> workouts) {
    }

    record ImportedWorkout(UUID clientId, Instant startedAt, Instant endedAt, List<ImportedSet> sets) {
    }

    record ImportedSet(String exerciseId, SetType setType, BigDecimal loadKg, Integer reps) {
    }

    record WorkoutImportResult(int imported, int alreadyThere) {
    }

    private final ConsentGate consent;
    private final ExerciseCatalog catalog;
    private final CustomExerciseStore customs;
    private final WorkoutStore store;
    private final WorkoutController.TrainingLimits limits;
    private final ImportLimits importLimits;
    private final ApiLimits api;

    WorkoutImportController(ConsentGate consent, ExerciseCatalog catalog, CustomExerciseStore customs, WorkoutStore store,
            WorkoutController.TrainingLimits limits, ImportLimits importLimits, ApiLimits api) {
        this.consent = consent;
        this.catalog = catalog;
        this.customs = customs;
        this.store = store;
        this.limits = limits;
        this.importLimits = importLimits;
        this.api = api;
    }

    /** All or nothing: every session and set is checked before the first is written, in one transaction. */
    @PostMapping("/v1/workout-imports")
    @Transactional
    WorkoutImportResult importWorkouts(AccountId account, @RequestBody WorkoutImport request) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(request.source() != null && request.workouts() != null && !request.workouts().isEmpty()
                && request.workouts().size() <= importLimits.maxWorkouts() && !request.workouts().contains(null));
        require(request.workouts().stream().map(ImportedWorkout::clientId).filter(Objects::nonNull).distinct().count() == request.workouts().size());
        // A user's own move is looked up once per request, not once per set (a year of sessions repeats the same few).
        Map<String, Optional<ExerciseCatalog.Exercise>> moves = new HashMap<>();
        request.workouts().forEach(workout -> require(valid(account, workout, moves)));
        int imported = 0;
        for (ImportedWorkout workout : request.workouts()) {
            List<WorkoutStore.ImportedSet> sets = workout.sets().stream()
                    .map(set -> new WorkoutStore.ImportedSet(set.exerciseId(), set.setType(), set.loadKg(), set.reps())).toList();
            if (store.importSession(account, workout.clientId(), workout.startedAt(), workout.endedAt(), request.source(), sets)) {
                imported++;
            }
        }
        return new WorkoutImportResult(imported, request.workouts().size() - imported);
    }

    private boolean valid(AccountId account, ImportedWorkout workout, Map<String, Optional<ExerciseCatalog.Exercise>> moves) {
        if (workout.clientId() == null || !api.moment(workout.startedAt()) || !api.moment(workout.endedAt())
                || workout.endedAt().isBefore(workout.startedAt()) || workout.sets() == null || workout.sets().isEmpty()
                || workout.sets().size() > importLimits.maxSets() || workout.sets().contains(null)) {
            return false;
        }
        return workout.sets().stream().allMatch(set -> valid(account, set, moves));
    }

    /**
     * A set the file can say: a warm-up or a working set, at least one rep, a load within the column, a move of the
     * catalog or the user's own with its load model. The side is not known (H13 B5), so a unilateral move is taken
     * without one — the only place a set may lack it; reps in reserve likewise.
     */
    private boolean valid(AccountId account, ImportedSet set, Map<String, Optional<ExerciseCatalog.Exercise>> moves) {
        if (set.exerciseId() == null || (set.setType() != SetType.WARM_UP && set.setType() != SetType.WORKING)
                || set.reps() == null || set.reps() < 1 || !limits.reps(set.reps()) || !limits.load(set.loadKg())) {
            return false;
        }
        Optional<ExerciseCatalog.Exercise> move = moves.computeIfAbsent(set.exerciseId(), id -> catalog.find(id)
                .or(() -> customs.find(account, id).map(CustomExerciseStore.CustomExercise::asExercise)));
        return move.filter(found -> found.load() != ExerciseCatalog.Load.BODYWEIGHT || set.loadKg().signum() == 0).isPresent();
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
