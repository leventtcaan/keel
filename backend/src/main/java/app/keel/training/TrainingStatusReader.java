package app.keel.training;

import app.keel.engine.TrainingStatus;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Where training stands, for decision's Snapshot (K-221): the set log of the program's compound lifts since the program
 * was made, its workout days and the deload ladder's changes, read on the user's calendar. None without a program.
 */
@Service
public class TrainingStatusReader {

    private final ProgramStore programs;
    private final TrainingLog log;
    private final TrainingCalls calls;
    private final ExerciseCatalog catalog;

    TrainingStatusReader(ProgramStore programs, TrainingLog log, TrainingCalls calls, ExerciseCatalog catalog) {
        this.programs = programs;
        this.log = log;
        this.calls = calls;
        this.catalog = catalog;
    }

    public Optional<TrainingStatus> status(AccountId account, LocalDate today, ZoneId zone) {
        Optional<ProgramStore.Program> program = programs.current(account);
        Optional<Instant> made = programs.createdAt(account);
        if (program.isEmpty() || made.isEmpty()) {
            return Optional.empty();
        }
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();
        Map<String, List<TrainingStatuses.Session>> compound = new LinkedHashMap<>();
        program.get().days().stream().flatMap(day -> day.exercises().stream()).map(ProgramStore.PlannedExercise::exerciseId).distinct()
                .filter(id -> catalog.find(id).filter(move -> move.kind() == ExerciseCatalog.Kind.COMPOUND).isPresent())
                .forEach(id -> compound.put(id, sessions(log.workingSets(account, id, made.get(), to), zone)));
        List<LocalDate> workoutDays = log.workoutStarts(account, made.get(), to).stream().map(at -> at.atZone(zone).toLocalDate()).toList();
        return Optional.of(TrainingStatuses.of(compound, calls.changes(account), workoutDays, program.get().days().size(), today,
                made.get().atZone(zone).toLocalDate()));
    }

    /** One session per workout, oldest first: its top load and the most reps done at it. */
    private static List<TrainingStatuses.Session> sessions(List<TrainingLog.WorkSet> sets, ZoneId zone) {
        return sets.stream().collect(Collectors.groupingBy(TrainingLog.WorkSet::at, TreeMap::new, Collectors.toList())).entrySet().stream()
                .map(workout -> {
                    BigDecimal top = workout.getValue().stream().map(TrainingLog.WorkSet::loadKg).max(Comparator.naturalOrder()).orElseThrow();
                    int reps = workout.getValue().stream().filter(set -> set.loadKg().compareTo(top) == 0).mapToInt(TrainingLog.WorkSet::reps).max()
                            .orElseThrow();
                    return new TrainingStatuses.Session(workout.getKey().atZone(zone).toLocalDate(), top, reps);
                }).toList();
    }
}
