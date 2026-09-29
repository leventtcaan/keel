package app.keel.training;

import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
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
class WorkoutController {

    /** Contract Exercise (K-219 adds aliases, setup fields and clips). */
    record Exercise(String id, String nameKey, ExerciseCatalog.Kind kind, List<String> muscles, List<String> alternatives,
            ExerciseCatalog.Load load, boolean unilateral) {
    }

    record NewWorkout(UUID clientId, Instant startedAt, UUID programDayId) {
    }

    record Finish(Instant endedAt) {
    }

    record NewSet(UUID clientId, String exerciseId, WorkoutStore.SetType setType, BigDecimal loadKg, Integer reps, Integer rir,
            WorkoutStore.Side side) {
    }

    /** Contract Workout. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Workout(UUID id, UUID clientId, Instant startedAt, Instant endedAt, UUID programDayId, List<LoggedSet> sets) {
    }

    /** Contract LoggedSet. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record LoggedSet(UUID id, UUID clientId, String exerciseId, WorkoutStore.SetType setType, BigDecimal loadKg, int reps,
            Integer rir, WorkoutStore.Side side) {

        static LoggedSet of(WorkoutStore.LoggedSet set) {
            return new LoggedSet(set.id(), set.clientId(), set.exerciseId(), set.setType(), set.loadKg(), set.reps(), set.rir(), set.side());
        }
    }

    private final ExerciseCatalog catalog;
    private final WorkoutStore store;
    private final Profiles profiles;

    WorkoutController(ExerciseCatalog catalog, WorkoutStore store, Profiles profiles) {
        this.catalog = catalog;
        this.store = store;
        this.profiles = profiles;
    }

    @GetMapping("/v1/exercises")
    List<Exercise> exercises() {
        return catalog.all().stream().map(move -> new Exercise(move.id(), move.nameKey(), move.kind(), move.muscles(),
                move.alternatives(), move.load(), move.unilateral())).toList();
    }

    @PostMapping("/v1/workouts")
    ResponseEntity<Workout> start(AccountId account, @RequestBody NewWorkout workout) {
        require(workout.clientId() != null && workout.startedAt() != null);
        WorkoutStore.Stored<WorkoutStore.Workout> stored = store.start(account, workout.clientId(), workout.startedAt(), workout.programDayId());
        return ResponseEntity.status(stored.created() ? HttpStatus.CREATED : HttpStatus.OK).body(read(stored.record()));
    }

    @GetMapping("/v1/workouts")
    List<Workout> list(AccountId account, @RequestParam LocalDate from, @RequestParam LocalDate to) {
        require(!to.isBefore(from));
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
        require(finish.endedAt() != null && !finish.endedAt().isBefore(workout.startedAt()));
        store.finish(account, id, finish.endedAt());
        return read(owned(account, id));
    }

    @PostMapping("/v1/workouts/{id}/sets")
    ResponseEntity<LoggedSet> log(AccountId account, @PathVariable UUID id, @RequestBody NewSet set) {
        owned(account, id);
        require(set.clientId() != null && catalog.find(set.exerciseId()).isPresent() && set.setType() != null
                && set.loadKg() != null && set.loadKg().signum() >= 0 && set.reps() != null && set.reps() >= 0
                && (set.rir() == null || set.rir() >= 0));
        WorkoutStore.Stored<WorkoutStore.LoggedSet> stored = store.log(account, id, new WorkoutStore.LoggedSet(null, set.clientId(),
                set.exerciseId(), set.setType(), set.loadKg(), set.reps(), set.rir(), set.side()));
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
