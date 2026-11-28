package app.keel.training;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.TrainingStatus;
import app.keel.engine.TrainingTrend;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.Stream;
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
    private final SessionChangeStore sessionChanges;

    TrainingStatusReader(ProgramStore programs, TrainingLog log, TrainingCalls calls, ExerciseCatalog catalog, SessionChangeStore sessionChanges) {
        this.sessionChanges = sessionChanges;
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
     * The days the account's program plans a session on from {@code from} to {@code to} (K-964): its weekdays, a session
     * moved in its week on the day it was moved to instead (a skipped one stays planned). Empty without a program.
     */
    public Optional<PlannedDays> plannedDays(AccountId account, LocalDate from, LocalDate to) {
        return programs.current(account).map(program -> PlannedDays.of(program.days(),
                sessionChanges.between(account, TodayChanges.monday(from), TodayChanges.monday(to))));
    }

    /**
     * The sessions a week the account's program asks for (K-530): one a program day, put on a weekday or not — the
     * number its missed weeks are counted against too ({@link #status}). Empty without a program.
     */
    public Optional<Integer> programSessionsPerWeek(AccountId account) {
        return programs.current(account).map(program -> program.days().size()).filter(days -> days > 0);
    }

    /** Every program the account has had, oldest first (K-535); empty without one. */
    public List<ProgramPeriod> programHistory(AccountId account) {
        return programs.history(account);
    }

    /**
     * The day the account's program began asking for the days it asks for now, on the user's calendar: when it was made (or
     * last replaced), or when it last gained or lost a day (K-535: another number of days is asked from then; a day added
     * today was not asked for on the days before, ADR-073 Ek 9).
     */
    public Optional<LocalDate> programSince(AccountId account, ZoneId zone) {
        return programs.createdAt(account).map(made -> Stream.concat(Stream.of(made), programs.history(account).stream().map(ProgramPeriod::from))
                .max(Comparator.naturalOrder()).orElseThrow().atZone(zone).toLocalDate());
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
        Map<String, List<TrainingStatuses.Session>> compound = sessions(account, program.get(), made.get(), to, zone, TrainingStatusReader::compound);
        List<LocalDate> workoutDays = log.workoutStarts(account, made.get(), to).stream().map(at -> at.atZone(zone).toLocalDate()).toList();
        // Missed plan weeks only from a week this program was in force from the start of (K-535, ADR-049).
        return Optional.of(TrainingStatuses.of(compound, calls.changes(account), workoutDays, pausedDays, program.get().days().size(), today,
                checkInDay, TrainingStatuses.judgedFrom(made.get(), zone)));
    }

    /**
     * The program's catalog compound lifts with their sessions, as {@link #status} reads them to find the most stalled one
     * (K-1009: the call's held move is chosen in the same order). The user's own moves are not among them. Empty without a program.
     */
    Map<String, List<TrainingStatuses.Session>> compoundLifts(AccountId account, LocalDate today, ZoneId zone) {
        Optional<ProgramStore.Program> program = programs.current(account);
        Optional<Instant> made = programs.createdAt(account);
        if (program.isEmpty() || made.isEmpty()) {
            return Map.of();
        }
        return sessions(account, program.get(), made.get(), today.plusDays(1).atStartOfDay(zone).toInstant(), zone, TrainingStatusReader::compound);
    }

    /**
     * What the set log says about training and recovery (K-1218): the program's compound lifts' working sets logged in the app
     * (not imported) since the program was made, within the trend window, read by {@link TrainingTrend}. A bodyweight move
     * counts its bodyweight plus the added load, and is left out without a bodyweight. Excluded: the days of the ladder's rest
     * and lighter weeks and the week after each (G7 K-72: the return is gradual) and {@code declaredDays} (K-516). Nothing
     * without a program.
     */
    public TrainingTrend.Reading trend(AccountId account, LocalDate today, ZoneId zone, Optional<BigDecimal> bodyWeightKg, Set<LocalDate> declaredDays,
            Parameters parameters) {
        Optional<ProgramStore.Program> program = programs.current(account);
        Optional<Instant> made = programs.createdAt(account);
        if (program.isEmpty() || made.isEmpty()) {
            return TrainingTrend.Reading.UNKNOWN;
        }
        TrendLog read = trendLog(account, program.get(), made.get(), today, zone, bodyWeightKg, declaredDays, parameters);
        return TrainingTrend.read(read.lifts(), today, read.excluded(), parameters);
    }

    /**
     * A move of the program as the coach may tell why it felt heavy (K-1265, ADR-096 #4): its effort over the trend window as the
     * recovery reads it (compound lifts only, where it can be read) and the workouts in that window it went lighter in ("Too
     * heavy?", K-1262). Nothing the log does not hold — no sleep, no food.
     */
    public record MoveEffort(String exerciseId, Optional<TrainingTrend.Effort> effort, int wentLighterWorkouts) {
    }

    /**
     * Each move of the program with an effort read or a workout gone lighter, in the program's order, read as {@link #trend}
     * reads the log. Nothing without a program.
     */
    public List<MoveEffort> efforts(AccountId account, LocalDate today, ZoneId zone, Optional<BigDecimal> bodyWeightKg, Set<LocalDate> declaredDays,
            Parameters parameters) {
        Optional<ProgramStore.Program> program = programs.current(account);
        Optional<Instant> made = programs.createdAt(account);
        if (program.isEmpty() || made.isEmpty()) {
            return List.of();
        }
        TrendLog read = trendLog(account, program.get(), made.get(), today, zone, bodyWeightKg, declaredDays, parameters);
        Map<String, TrainingTrend.Effort> efforts = new LinkedHashMap<>();
        TrainingTrend.efforts(read.lifts(), today, read.excluded(), parameters).forEach(lift -> efforts.put(lift.exerciseId(), lift.effort()));
        Map<String, Integer> lighter = log.wentLighterWorkouts(account, read.since(), read.to());
        return program.get().days().stream().flatMap(day -> day.exercises().stream()).map(ProgramStore.PlannedExercise::exerciseId).distinct()
                .filter(id -> efforts.containsKey(id) || lighter.containsKey(id))
                .map(id -> new MoveEffort(id, Optional.ofNullable(efforts.get(id)), lighter.getOrDefault(id, 0))).toList();
    }

    /** The compound lifts' sessions in the trend window since the program was made, and the days not read (see {@link #trend}). */
    private record TrendLog(List<TrainingTrend.Lift> lifts, Set<LocalDate> excluded, Instant since, Instant to) {
    }

    private TrendLog trendLog(AccountId account, ProgramStore.Program program, Instant made, LocalDate today, ZoneId zone,
            Optional<BigDecimal> bodyWeightKg, Set<LocalDate> declaredDays, Parameters parameters) {
        LocalDate first = today.minusDays(parameters.wholeNumber(ParameterKey.TREND_WINDOW_DAYS) - 1L);
        Instant from = first.atStartOfDay(zone).toInstant();
        Instant since = made.isAfter(from) ? made : from;
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();
        List<TrainingTrend.Lift> lifts = program.days().stream().flatMap(day -> day.exercises().stream()).map(ProgramStore.PlannedExercise::exerciseId)
                .distinct().filter(id -> catalog.find(id).filter(TrainingStatusReader::compound).isPresent())
                .map(id -> new TrainingTrend.Lift(id, trendSessions(log.workingSets(account, id, since, to), zone, bodyWeightKg))).toList();
        Set<LocalDate> excluded = new HashSet<>(declaredDays);
        Breaks breaks = breaks(account, first.minusDays(DAYS_AFTER_A_BREAK), today);
        Stream.concat(breaks.rest().stream(), breaks.lighter().stream())
                .forEach(day -> day.datesUntil(day.plusDays(DAYS_AFTER_A_BREAK + 1L)).forEach(excluded::add));
        return new TrendLog(lifts, excluded, since, to);
    }

    /** The week after a rest or lighter week is not read either (G7 K-72). */
    private static final int DAYS_AFTER_A_BREAK = 7;

    /** One session per workout, oldest first, as {@link TrainingTrend} reads it: the working sets with a load. */
    private static List<TrainingTrend.Session> trendSessions(List<TrainingLog.WorkSet> sets, ZoneId zone, Optional<BigDecimal> bodyWeightKg) {
        Map<Instant, List<TrainingTrend.LoggedSet>> workouts = new java.util.TreeMap<>();
        for (TrainingLog.WorkSet set : sets) {
            set.effectiveLoadKg(bodyWeightKg).ifPresent(load -> workouts.computeIfAbsent(set.at(), at -> new java.util.ArrayList<>())
                    .add(new TrainingTrend.LoggedSet(load, set.reps(), set.rir())));
        }
        return workouts.entrySet().stream().map(workout -> new TrainingTrend.Session(workout.getKey().atZone(zone).toLocalDate(), workout.getValue())).toList();
    }

    private static boolean compound(ExerciseCatalog.Exercise move) {
        return move.kind() == ExerciseCatalog.Kind.COMPOUND;
    }

    /**
     * Each catalog move of the program's stalled sessions, read as {@link #status} reads the compound lifts — the working
     * sets logged in the app (not imported) since the program was made, on the user's calendar — so the progress screen's
     * "stuck" (K-965) agrees with the weekly call. Empty without a program.
     */
    Map<String, Integer> stalledSessions(AccountId account, LocalDate today, ZoneId zone) {
        Optional<ProgramStore.Program> program = programs.current(account);
        Optional<Instant> made = programs.createdAt(account);
        if (program.isEmpty() || made.isEmpty()) {
            return Map.of();
        }
        Map<String, Integer> stalled = new LinkedHashMap<>();
        sessions(account, program.get(), made.get(), today.plusDays(1).atStartOfDay(zone).toInstant(), zone, move -> true)
                .forEach((move, sessions) -> stalled.put(move, TrainingStatuses.stalledSessions(sessions)));
        return stalled;
    }

    /** The program's catalog moves {@code which} takes, each with its sessions in [made, to); the user's own moves have none. */
    private Map<String, List<TrainingStatuses.Session>> sessions(AccountId account, ProgramStore.Program program, Instant made, Instant to,
            ZoneId zone, Predicate<ExerciseCatalog.Exercise> which) {
        Map<String, List<TrainingStatuses.Session>> sessions = new LinkedHashMap<>();
        program.days().stream().flatMap(day -> day.exercises().stream()).map(ProgramStore.PlannedExercise::exerciseId).distinct()
                .filter(id -> catalog.find(id).filter(which).isPresent())
                .forEach(id -> sessions.put(id, TrainingStatuses.sessions(log.workingSets(account, id, made, to), zone)));
        return sessions;
    }
}
