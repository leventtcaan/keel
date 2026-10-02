package app.keel.training;

import app.keel.engine.TrainingStatus;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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

    /** {@code checkInDay} counts the weeks the load has been held in check-in weeks. */
    public Optional<TrainingStatus> status(AccountId account, LocalDate today, ZoneId zone, DayOfWeek checkInDay) {
        return status(account, today, zone, checkInDay, Set.of());
    }

    /** {@code pausedDays}: days the user declared a state on (K-516) — their weeks are neither kept nor missed. */
    public Optional<TrainingStatus> status(AccountId account, LocalDate today, ZoneId zone, DayOfWeek checkInDay, Set<LocalDate> pausedDays) {
        Optional<ProgramStore.Program> program = programs.current(account);
        Optional<Instant> made = programs.createdAt(account);
        if (program.isEmpty() || made.isEmpty()) {
            return Optional.empty();
        }
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();
        Map<String, List<TrainingStatuses.Session>> compound = new LinkedHashMap<>();
        program.get().days().stream().flatMap(day -> day.exercises().stream()).map(ProgramStore.PlannedExercise::exerciseId).distinct()
                .filter(id -> catalog.find(id).filter(move -> move.kind() == ExerciseCatalog.Kind.COMPOUND).isPresent())
                .forEach(id -> compound.put(id, TrainingStatuses.sessions(log.workingSets(account, id, made.get(), to), zone)));
        List<LocalDate> workoutDays = log.workoutStarts(account, made.get(), to).stream().map(at -> at.atZone(zone).toLocalDate()).toList();
        return Optional.of(TrainingStatuses.of(compound, calls.changes(account), workoutDays, pausedDays, program.get().days().size(), today,
                checkInDay, made.get().atZone(zone).toLocalDate()));
    }
}
