package app.keel.training;

import app.keel.engine.TrainingStatus;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
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

    /** The days the ladder set the work down on purpose (K-512, ADR-039): a week off, a lighter week. */
    public record Breaks(Set<LocalDate> rest, Set<LocalDate> lighter) {
    }

    /** The ladder's weeks off and lighter weeks on the days from {@code from} to {@code to} (both included). */
    public Breaks breaks(AccountId account, LocalDate from, LocalDate to) {
        Set<LocalDate> rest = new HashSet<>();
        Set<LocalDate> lighter = new HashSet<>();
        for (TrainingChanges.Change change : calls.changes(account)) {
            if (change.kind() == TrainingChanges.Kind.HOLD_LOAD) {
                continue;
            }
            LocalDate first = change.startsOn().isBefore(from) ? from : change.startsOn();
            LocalDate last = change.endsOn() == null || change.endsOn().isAfter(to) ? to : change.endsOn();
            if (!first.isAfter(last)) {
                first.datesUntil(last.plusDays(1)).forEach(change.kind() == TrainingChanges.Kind.REST_WEEK ? rest::add : lighter::add);
            }
        }
        return new Breaks(Set.copyOf(rest), Set.copyOf(lighter));
    }

    /** The weekdays the account's program puts its days on (K-527); empty without a program or a day with a weekday. */
    public Set<DayOfWeek> programDays(AccountId account) {
        return programs.current(account).map(program -> program.days().stream().map(ProgramStore.Day::weekday)
                .filter(Objects::nonNull).collect(Collectors.toUnmodifiableSet())).orElse(Set.of());
    }

    /**
     * The sessions a week the account's program asks for (K-530): one a program day, put on a weekday or not — the
     * number its missed weeks are counted against too ({@link #status}). Empty without a program.
     */
    public Optional<Integer> programSessionsPerWeek(AccountId account) {
        return programs.current(account).map(program -> program.days().size()).filter(days -> days > 0);
    }

    /** The day the account's program was made (or last replaced), on the user's calendar. */
    public Optional<LocalDate> programSince(AccountId account, ZoneId zone) {
        return programs.createdAt(account).map(made -> made.atZone(zone).toLocalDate());
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
