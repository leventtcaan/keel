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
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
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
    record TrainingLimits(BigDecimal maxLoadKg, int maxReps, int maxRir, int maxPlannedSets, int maxDayExercises, int maxDayName,
            int maxNote) {

        /** A note as kept: the user's words without their outer spaces; none when there are no words (K-422). */
        static String note(String text) {
            return text == null || text.isBlank() ? null : text.strip();
        }

        /**
         * A note within the limit, in characters as the user counts them (an emoji is one), and one the database can keep:
         * PostgreSQL text holds no NUL, which stored would be a 500 the phone's queue sends again forever.
         */
        boolean fits(String text) {
            String kept = note(text);
            return kept == null || kept.codePointCount(0, kept.length()) <= maxNote && kept.indexOf('\u0000') < 0;
        }

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
            ExerciseCatalog.Load load, ExerciseCatalog.Equipment equipment, boolean unilateral, List<String> setupFields, Clips clips) {
    }

    /** Contract ExerciseClips: paths in the app's assets. */
    record Clips(String firstRep, String lastRep) {
    }

    record NewWorkout(UUID clientId, Instant startedAt, UUID programDayId) {
    }

    /** {@code uncleanExerciseIds}: the moves whose form was not clean (G6 K-31) — their load and reps are held (K-217). */
    record Finish(Instant endedAt, List<String> uncleanExerciseIds, String note) {
    }

    /** {@code supersetId}: the superset the set belongs to, made by the phone (K-424, ADR-035). */
    record NewSet(UUID clientId, String exerciseId, SetType setType, BigDecimal loadKg, Integer reps, Integer rir,
            Side side, String note, UUID supersetId) {
    }

    /**
     * Contract Workout. {@code importedFrom}: only on a session imported from another app's export (K-615). {@code setsNextTargets}, on a finished session of the program: whether an edit of its sets can
     * move a target of its day — one that came from it or an older session, or a move with none yet (K-432).
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Workout(UUID id, UUID clientId, Instant startedAt, Instant endedAt, UUID programDayId, String note, List<LoggedSet> sets,
            ImportSource importedFrom, Boolean setsNextTargets) {
    }

    /** Contract LoggedSet. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record LoggedSet(UUID id, UUID clientId, String exerciseId, SetType setType, BigDecimal loadKg, int reps,
            Integer rir, Side side, String note, UUID supersetId) {

        static LoggedSet of(WorkoutStore.LoggedSet set) {
            return new LoggedSet(set.id(), set.clientId(), set.exerciseId(), set.setType(), set.loadKg(), set.reps(), set.rir(), set.side(),
                    set.note(), set.supersetId());
        }
    }

    private final ExerciseCatalog catalog;
    private final WorkoutStore store;
    private final Profiles profiles;
    private final TrainingLimits limits;
    private final ApiLimits api;
    private final SessionProgress progress;
    private final CustomExerciseStore customs;
    private final ProgramStore programs;

    WorkoutController(ExerciseCatalog catalog, WorkoutStore store, Profiles profiles, TrainingLimits limits, ApiLimits api,
            SessionProgress progress, CustomExerciseStore customs, ProgramStore programs) {
        this.programs = programs;
        this.progress = progress;
        this.customs = customs;
        this.catalog = catalog;
        this.store = store;
        this.profiles = profiles;
        this.limits = limits;
        this.api = api;
    }

    @GetMapping("/v1/exercises")
    List<Exercise> exercises() {
        return catalog.all().stream().map(move -> new Exercise(move.id(), move.nameKey(), move.kind(), move.muscles(),
                move.alternatives(), move.load(), move.equipment(), move.unilateral(), move.setup(),
                move.reviewed() ? new Clips(move.clips().firstRep(), move.clips().lastRep()) : null)).toList();
    }

    @PostMapping("/v1/workouts")
    ResponseEntity<Workout> start(AccountId account, @RequestBody NewWorkout workout) {
        require(workout.clientId() != null && api.moment(workout.startedAt()));
        WorkoutStore.Stored<WorkoutStore.Workout> stored = store.start(account, workout.clientId(), workout.startedAt(), workout.programDayId());
        return ResponseEntity.status(stored.created() ? HttpStatus.CREATED : HttpStatus.OK).body(read(account, stored.record()));
    }

    @GetMapping("/v1/workouts")
    List<Workout> list(AccountId account, @RequestParam LocalDate from, @RequestParam LocalDate to) {
        require(api.range(from, to));
        ZoneId zone = profiles.of(account).map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
        Map<UUID, List<Optional<Instant>>> targetSources = programs.targetSources(account);
        return store.between(account, from.atStartOfDay(zone).toInstant(), to.plusDays(1).atStartOfDay(zone).toInstant())
                .stream().map(workout -> read(workout, targetSources)).toList();
    }

    @GetMapping("/v1/workouts/{id}")
    Workout get(AccountId account, @PathVariable UUID id) {
        return read(account, owned(account, id));
    }

    @PostMapping("/v1/workouts/{id}/finish")
    Workout finish(AccountId account, @PathVariable UUID id, @RequestBody Finish finish) {
        WorkoutStore.Workout workout = owned(account, id);
        require(api.moment(finish.endedAt()) && !finish.endedAt().isBefore(workout.startedAt()) && limits.fits(finish.note()));
        List<String> unclean = finish.uncleanExerciseIds() == null ? List.of() : finish.uncleanExerciseIds();
        // No contains(null): an immutable list (the default here) throws on it.
        // A catalog move, or one of the user's own (K-424): an off-program move is accepted and has no target to hold.
        require(unclean.stream().allMatch(exercise -> exercise != null && (catalog.find(exercise).isPresent() || customs.find(account, exercise).isPresent()))
                && Set.copyOf(unclean).size() == unclean.size());
        // Kept with the next session's load and reps of the day's planned moves (K-217).
        progress.finish(account, workout, finish.endedAt(), TrainingLimits.note(finish.note()), Set.copyOf(unclean));
        return read(account, owned(account, id));
    }

    /** A set of a finished session (one forgotten, K-416) derives its targets again, in the same transaction (K-432). */
    @PostMapping("/v1/workouts/{id}/sets")
    @Transactional
    ResponseEntity<LoggedSet> log(AccountId account, @PathVariable UUID id, @RequestBody NewSet set) {
        WorkoutStore.Workout workout = owned(account, id);
        // A catalog move, or one of the user's own (K-424): the same set rules either way.
        Optional<ExerciseCatalog.Exercise> move = set.exerciseId() == null ? Optional.empty()
                : catalog.find(set.exerciseId()).or(() -> customs.find(account, set.exerciseId()).map(CustomExerciseStore.CustomExercise::asExercise));
        require(set.clientId() != null && move.isPresent() && set.setType() != null
                && limits.load(set.loadKg()) && limits.reps(set.reps()) && limits.rir(set.rir()) && limits.fits(set.note()));
        require(SetRules.accepts(move.orElseThrow(), set.setType(), set.loadKg(), set.rir(), set.side()));
        WorkoutStore.Stored<WorkoutStore.LoggedSet> stored = store.log(account, id, new WorkoutStore.LoggedSet(null, set.clientId(),
                set.exerciseId(), set.setType(), set.loadKg(), set.reps(), set.rir(), set.side(), TrainingLimits.note(set.note()), id,
                set.supersetId()));
        if (!stored.record().workoutId().equals(id)) {
            // The clientId is already a set of another workout: not a replay of this one (ADR-024 §11).
            throw new ApiException(ErrorCode.CONFLICT);
        }
        if (stored.created()) {
            progress.edited(account, workout);
        }
        return ResponseEntity.status(stored.created() ? HttpStatus.CREATED : HttpStatus.OK).body(LoggedSet.of(stored.record()));
    }

    /** A set deleted from a finished session derives its targets again, in the same transaction (K-432). */
    @DeleteMapping("/v1/workouts/{id}/sets/{setId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    void deleteSet(AccountId account, @PathVariable UUID id, @PathVariable UUID setId) {
        WorkoutStore.Workout workout = owned(account, id);
        if (!store.deleteSet(account, id, setId)) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        progress.edited(account, workout);
    }

    private WorkoutStore.Workout owned(AccountId account, UUID id) {
        return store.find(account, id).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    private Workout read(AccountId account, WorkoutStore.Workout workout) {
        return read(workout, programs.targetSources(account));
    }

    private Workout read(WorkoutStore.Workout workout, Map<UUID, List<Optional<Instant>>> targetSources) {
        Boolean setsNextTargets = workout.endedAt() == null || workout.programDayId() == null ? null
                : ProgramStore.movesATarget(targetSources.getOrDefault(workout.programDayId(), List.of()), workout.startedAt());
        return new Workout(workout.id(), workout.clientId(), workout.startedAt(), workout.endedAt(), workout.programDayId(), workout.note(),
                store.sets(workout.id()).stream().map(LoggedSet::of).toList(), workout.importedFrom(), setsNextTargets);
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
