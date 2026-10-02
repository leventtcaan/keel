package app.keel.training;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/custom-exercises (K-424, ADR-035): a move the catalog does not have, with what the engine needs of a
 * move asked of the user (L3 §1 #10). Training data: no consent gate (ADR-026).
 */
@RestController
@EnableConfigurationProperties(CustomExerciseController.Limits.class)
class CustomExerciseController {

    /** keel.training.custom-exercise: a name's length in code points, and how many a user keeps. */
    @ConfigurationProperties("keel.training.custom-exercise")
    record Limits(int maxName, int maxCount) {
    }

    record NewCustomExercise(UUID clientId, String name, ExerciseCatalog.Kind kind, ExerciseCatalog.Load load, ExerciseCatalog.Equipment equipment,
            Boolean unilateral) {
    }

    /** Contract CustomExercise. */
    record CustomExercise(String id, UUID clientId, String name, ExerciseCatalog.Kind kind, ExerciseCatalog.Load load,
            ExerciseCatalog.Equipment equipment, boolean unilateral) {

        static CustomExercise of(CustomExerciseStore.CustomExercise move) {
            return new CustomExercise(move.exerciseId(), move.clientId(), move.name(), move.kind(), move.load(), move.equipment(), move.unilateral());
        }
    }

    private final CustomExerciseStore store;
    private final Limits limits;

    CustomExerciseController(CustomExerciseStore store, Limits limits) {
        this.store = store;
        this.limits = limits;
    }

    @PostMapping("/v1/custom-exercises")
    ResponseEntity<CustomExercise> save(AccountId account, @RequestBody NewCustomExercise move) {
        String name = move.name() == null ? "" : move.name().strip();
        int length = name.codePointCount(0, name.length());
        require(move.clientId() != null && length >= 1 && length <= limits.maxName() && name.indexOf('\u0000') < 0 && move.kind() != null
                && move.load() != null && move.equipment() != null && move.unilateral() != null
                // As in the catalog: bodyweight equipment goes with a bodyweight load, and only with one.
                && (move.equipment() == ExerciseCatalog.Equipment.BODYWEIGHT) == (move.load() != ExerciseCatalog.Load.EXTERNAL));
        // A replay answers with what was stored (ADR-024), whatever the limit says now.
        Optional<CustomExerciseStore.CustomExercise> replayed = store.findByClient(account, move.clientId());
        if (replayed.isPresent()) {
            return ResponseEntity.ok(CustomExercise.of(replayed.get()));
        }
        require(store.count(account) < limits.maxCount());
        CustomExerciseStore.Stored stored = store.save(account, move.clientId(), name, move.kind(), move.load(), move.equipment(), move.unilateral());
        return ResponseEntity.status(stored.created() ? HttpStatus.CREATED : HttpStatus.OK).body(CustomExercise.of(stored.move()));
    }

    @GetMapping("/v1/custom-exercises")
    List<CustomExercise> all(AccountId account) {
        return store.all(account).stream().map(CustomExercise::of).toList();
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
