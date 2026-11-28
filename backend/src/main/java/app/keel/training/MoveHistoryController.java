package app.keel.training;

import app.keel.engine.ParameterSet;
import app.keel.engine.Sex;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.json.JsonMapper;

/**
 * A move's history (K-1259, ADR-096 › Geçmiş ve grafik; ADR-033): every session that has it, a page at a time with no limit in
 * time, and its records of all time. Free: the subscription is not read. The phone used to ask for a year of every workout and
 * work the records out itself, so a record older than the year fell out.
 */
@RestController
class MoveHistoryController {

    private static final String FILE = "data/parameters/workout.json";
    private static final String KEY = "move_history_page";

    /** Contract MoveHistory. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record MoveHistory(List<WorkoutController.Workout> sessions, String next, List<MoveRecord> records) {
    }

    /** Contract MoveRecord. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record MoveRecord(MoveRecords.Kind kind, BigDecimal loadKg, Integer reps, BigDecimal kg, Instant on) {
    }

    private final WorkoutStore store;
    private final ExerciseCatalog catalog;
    private final CustomExerciseStore own;
    private final ParameterSet parameters;
    private final Profiles profiles;
    private final int page = pageFromClasspath();

    MoveHistoryController(WorkoutStore store, ExerciseCatalog catalog, CustomExerciseStore own, ParameterSet parameters, Profiles profiles) {
        this.store = store;
        this.catalog = catalog;
        this.own = own;
        this.parameters = parameters;
        this.profiles = profiles;
    }

    @GetMapping("/v1/exercises/{exerciseId}/history")
    MoveHistory history(AccountId account, @PathVariable String exerciseId, @RequestParam(required = false) String before) {
        Move move = move(account, exerciseId);
        WorkoutStore.Workout cursor = before == null ? null : cursor(account, exerciseId, before);
        // One more than a page tells whether an older page exists.
        List<WorkoutStore.Workout> found = store.withMove(account, exerciseId, cursor, page + 1);
        List<WorkoutStore.Workout> shown = found.subList(0, Math.min(page, found.size()));
        Map<UUID, List<WorkoutStore.LoggedSet>> sets = store.setsOf(shown.stream().map(WorkoutStore.Workout::id).toList(), exerciseId);
        List<WorkoutController.Workout> sessions = shown.stream().map(workout -> new WorkoutController.Workout(workout.id(), workout.clientId(),
                workout.startedAt(), workout.endedAt(), workout.programDayId(), workout.note(), workout.pausedSeconds(),
                sets.getOrDefault(workout.id(), List.of()).stream().map(WorkoutController.LoggedSet::of).toList(), workout.importedFrom(), null))
                .toList();
        String next = found.size() > page ? shown.getLast().id().toString() : null;
        Sex sex = profiles.of(account).map(facts -> Sex.valueOf(facts.sex().name())).orElse(Sex.MALE);
        List<MoveRecord> records = MoveRecords.of(move.kind(), move.load(), store.workingSetsOf(account, exerciseId), parameters.forSex(sex))
                .stream().map(r -> new MoveRecord(r.kind(), r.loadKg(), r.reps(), r.kg(), r.on())).toList();
        return new MoveHistory(sessions, next, records);
    }

    private record Move(ExerciseCatalog.Kind kind, ExerciseCatalog.Load load) {
    }

    /** A catalog move or the account's own; anything else is not found. */
    private Move move(AccountId account, String exerciseId) {
        return catalog.find(exerciseId).map(found -> new Move(found.kind(), found.load()))
                .or(() -> own.find(account, exerciseId).map(found -> new Move(found.kind(), found.load())))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    /** The cursor is one of the account's sessions with the move; anything else is refused. */
    private WorkoutStore.Workout cursor(AccountId account, String exerciseId, String before) {
        UUID id;
        try {
            id = UUID.fromString(before);
        } catch (IllegalArgumentException notAnId) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        return store.find(account, id).filter(workout -> !store.setsOf(List.of(workout.id()), exerciseId).isEmpty())
                .orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED));
    }

    /** Sessions per page from the file; a value that is not a whole number of at least one stops the server from starting. */
    static int pageFromClasspath() {
        try (InputStream in = new ClassPathResource(FILE).getInputStream()) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> all = (List<Map<String, Object>>) JsonMapper.builder().build().readValue(in, Map.class).get("parameters");
            return all.stream().filter(parameter -> KEY.equals(parameter.get("key"))).map(parameter -> parameter.get("value"))
                    .filter(value -> value instanceof Integer sessions && sessions >= 1).map(Integer.class::cast).findFirst()
                    .orElseThrow(() -> new IllegalStateException("workout.json: " + KEY + " is missing or not a whole number of at least 1"));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
