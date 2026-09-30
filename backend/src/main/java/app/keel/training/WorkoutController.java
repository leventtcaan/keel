package app.keel.training;

import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiLimits;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/exercises and /v1/workouts (K-210). A set names any move in the catalog — a swap needs nothing
 * else. Training logs are not on V3's health-data list, so no consent gate here (ADR-026).
 */
@RestController
@EnableConfigurationProperties(WorkoutController.TrainingLimits.class)
class WorkoutController {

    /** What a set and a program can be (K-210, K-211, K-218, keel.training); load to 2 decimals, the column's. */
    @ConfigurationProperties("keel.training")
    record TrainingLimits(BigDecimal maxLoadKg, int maxReps, int maxRir, int maxPlannedSets, int maxDayExercises, int maxDayName) {

        boolean reps(Integer reps) {
            return reps != null && reps >= 0 && reps <= maxReps;
        }

        boolean rir(Integer rir) {
            return rir == null || rir >= 0 && rir <= maxRir;
        }

        static final int LOAD_DECIMALS = 2;

        boolean load(BigDecimal kg) {
            return kg != null && kg.signum() >= 0 && kg.compareTo(maxLoadKg) <= 0 && kg.stripTrailingZeros().scale() <= LOAD_DECIMALS;
        }
    }

    /** Contract Exercise; the clips only once they passed the filming checklist (ADR-017, K-219). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Exercise(String id, String nameKey, ExerciseCatalog.Kind kind, List<String> muscles, List<String> alternatives,
            ExerciseCatalog.Load load, boolean unilateral, List<String> setupFields, Clips clips) {
    }

    /** Contract ExerciseClips: paths in the app's assets. */
    record Clips(String firstRep, String lastRep) {
    }

    record NewWorkout(UUID clientId, Instant startedAt, UUID programDayId) {
    }

    /** {@code uncleanExerciseIds}: the moves whose form was not clean (G6 K-31) — their load and reps are held (K-217). */
    record Finish(Instant endedAt, List<String> uncleanExerciseIds) {
    }

    record NewSet(UUID clientId, String exerciseId, SetType setType, BigDecimal loadKg, Integer reps, Integer rir,
            Side side) {
    }

    /** Contract Workout. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Workout(UUID id, UUID clientId, Instant startedAt, Instant endedAt, UUID programDayId, List<LoggedSet> sets) {
    }

    /** Contract LoggedSet. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record LoggedSet(UUID id, UUID clientId, String exerciseId, SetType setType, BigDecimal loadKg, int reps,
            Integer rir, Side side) {

        static LoggedSet of(WorkoutStore.LoggedSet set) {
            return new LoggedSet(set.id(), set.clientId(), set.exerciseId(), set.setType(), set.loadKg(), set.reps(), set.rir(), set.side());
        }
    }

    private final ExerciseCatalog catalog;
    private final WorkoutStore store;
    private final Profiles profiles;
    private final TrainingLimits limits;
    private final ApiLimits api;
    private final SessionProgress progress;

    WorkoutController(ExerciseCatalog catalog, WorkoutStore store, Profiles profiles, TrainingLimits limits, ApiLimits api,
            SessionProgress progress) {
        this.progress = progress;
        this.catalog = catalog;
        this.store = store;
        this.profiles = profiles;
        this.limits = limits;
        this.api = api;
    }

    @GetMapping("/v1/exercises")
    List<Exercise> exercises() {
        return catalog.all().stream().map(move -> new Exercise(move.id(), move.nameKey(), move.kind(), move.muscles(),
                move.alternatives(), move.load(), move.unilateral(), move.setup(),
                move.reviewed() ? new Clips(move.clips().firstRep(), move.clips().lastRep()) : null)).toList();
    }

    @PostMapping("/v1/workouts")
    ResponseEntity<Workout> start(AccountId account, @RequestBody NewWorkout workout) {
        require(workout.clientId() != null && api.moment(workout.startedAt()));
        WorkoutStore.Stored<WorkoutStore.Workout> stored = store.start(account, workout.clientId(), workout.startedAt(), workout.programDayId());
        return ResponseEntity.status(stored.created() ? HttpStatus.CREATED : HttpStatus.OK).body(read(stored.record()));
    }

    @GetMapping("/v1/workouts")
    List<Workout> list(AccountId account, @RequestParam LocalDate from, @RequestParam LocalDate to) {
        require(api.range(from, to));
        ZoneId zone = profiles.of(account).map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
        return store.between(account, from.atStartOfDay(zone).toInstant(), to.plusDays(1).atStartOfDay(zone).toInstant())
                .stream().map(this::read).toList();
    }

    @GetMapping("/v1/workouts/{id}")
    Workout get(AccountId account, @PathVariable UUID id) {
        return read(owned(account, id));
    }

    @PostMapping("/v1/workouts/{id}/finish")
    Workout finish(AccountId account, @PathVariable UUID id, @RequestBody Finish finish) {
        WorkoutStore.Workout workout = owned(account, id);
        require(api.moment(finish.endedAt()) && !finish.endedAt().isBefore(workout.startedAt()));
        List<String> unclean = finish.uncleanExerciseIds() == null ? List.of() : finish.uncleanExerciseIds();
        require(!unclean.contains(null) && unclean.stream().allMatch(exercise -> catalog.find(exercise).isPresent())
                && Set.copyOf(unclean).size() == unclean.size());
        store.finish(account, id, finish.endedAt());
        // The day's planned moves get the next session's load and reps (K-217).
        progress.after(account, workout, Set.copyOf(unclean));
        return read(owned(account, id));
    }

    @PostMapping("/v1/workouts/{id}/sets")
    ResponseEntity<LoggedSet> log(AccountId account, @PathVariable UUID id, @RequestBody NewSet set) {
        owned(account, id);
        require(set.clientId() != null && catalog.find(set.exerciseId()).isPresent() && set.setType() != null
                && limits.load(set.loadKg()) && limits.reps(set.reps()) && limits.rir(set.rir()));
        require(SetRules.accepts(catalog.find(set.exerciseId()).orElseThrow(), set.setType(), set.loadKg(), set.rir(), set.side()));
        WorkoutStore.Stored<WorkoutStore.LoggedSet> stored = store.log(account, id, new WorkoutStore.LoggedSet(null, set.clientId(),
                set.exerciseId(), set.setType(), set.loadKg(), set.reps(), set.rir(), set.side(), id));
        if (!stored.record().workoutId().equals(id)) {
            // The clientId is already a set of another workout: not a replay of this one (ADR-024 §11).
            throw new ApiException(ErrorCode.CONFLICT);
        }
        return ResponseEntity.status(stored.created() ? HttpStatus.CREATED : HttpStatus.OK).body(LoggedSet.of(stored.record()));
    }

    @DeleteMapping("/v1/workouts/{id}/sets/{setId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteSet(AccountId account, @PathVariable UUID id, @PathVariable UUID setId) {
        owned(account, id);
        if (!store.deleteSet(account, id, setId)) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
    }

    private WorkoutStore.Workout owned(AccountId account, UUID id) {
        return store.find(account, id).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    private Workout read(WorkoutStore.Workout workout) {
        return new Workout(workout.id(), workout.clientId(), workout.startedAt(), workout.endedAt(), workout.programDayId(),
                store.sets(workout.id()).stream().map(LoggedSet::of).toList());
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
