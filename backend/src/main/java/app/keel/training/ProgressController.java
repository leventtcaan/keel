package app.keel.training;

import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Sex;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/workouts/{id}/summary and /v1/training-progress (K-965): read models over the set log, facts the
 * phone fills its templates with (ProgressSummary, PersonalRecords). Training logs are not health data: no consent gate
 * (ADR-026).
 */
@RestController
class ProgressController {

    /** Contract SetMark; {@code side} only for a one-sided move's set. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record SetMark(String exerciseId, PersonalRecords.Kind kind, BigDecimal loadKg, int reps, Integer rir, Side side) {
    }

    /** Contract WorkoutSummary. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record WorkoutSummary(UUID workoutId, Integer minutes, BigDecimal liftedKg, Integer liftedChangePercent, int workingSets, List<SetMark> marks,
            List<ProgressSummary.MoveChange> moves, LocalDate weekOf, List<ProgressSummary.MuscleSets> muscles) {
    }

    /** Contract DatedSet. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record DatedSet(BigDecimal loadKg, int reps, Integer rir, LocalDate day) {
    }

    /** Contract LiftProgress. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record LiftProgress(String exerciseId, DatedSet baseline, DatedSet best, boolean stronger, List<ProgressSummary.WeekBest> weeks,
            ProgressSummary.EffortLine effort) {
    }

    /** Contract TrainingProgress. */
    record TrainingProgress(LocalDate weekOf, List<ProgressSummary.MuscleSets> muscles, List<LiftProgress> lifts, int strongerLifts, int trackedLifts) {
    }

    private static final int DAYS_PER_WEEK = 7;

    private final ProgressReads reads;
    private final WorkoutStore workouts;
    private final ProgramStore programs;
    private final TrainingCalls calls;
    private final ExerciseCatalog catalog;
    private final ParameterSet parameters;
    private final Profiles profiles;
    private final Clock clock;
    private final TrainingStatusReader statuses;

    ProgressController(ProgressReads reads, WorkoutStore workouts, ProgramStore programs, TrainingCalls calls, ExerciseCatalog catalog,
            ParameterSet parameters, Profiles profiles, Clock clock, TrainingStatusReader statuses) {
        this.statuses = statuses;
        this.reads = reads;
        this.workouts = workouts;
        this.programs = programs;
        this.calls = calls;
        this.catalog = catalog;
        this.parameters = parameters;
        this.profiles = profiles;
        this.clock = clock;
    }

    @GetMapping("/v1/workouts/{id}/summary")
    WorkoutSummary summary(AccountId account, @PathVariable UUID id) {
        WorkoutStore.Workout workout = workouts.find(account, id).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        ZoneId zone = zone(account);
        List<ProgressReads.Row> rows = reads.workingSets(account);
        List<TrainingLog.WorkSet> sets = rows.stream().filter(row -> row.workoutId().equals(id)).map(ProgressReads.Row::set)
                .filter(set -> set.reps() >= 1).toList();
        List<ProgressReads.Row> before = rows.stream().filter(row -> row.set().at().isBefore(workout.startedAt())).toList();
        // The last earlier session of the same program day (it has a working set: the rows are working sets). A program
        // replaced has new days: none, a new basis (ADR-075 Ek 2); the review's changes keep the days (K-956).
        Optional<List<TrainingLog.WorkSet>> lastOfDay = before.stream()
                .filter(row -> row.programDayId() != null && row.programDayId().equals(workout.programDayId()))
                .max(Comparator.comparing(row -> row.set().at())).map(ProgressReads.Row::workoutId)
                .map(last -> before.stream().filter(row -> row.workoutId().equals(last)).map(ProgressReads.Row::set).toList());
        Optional<BigDecimal> previous = lastOfDay.map(ProgressSummary::lifted);
        List<SetMark> marks = sets.stream().collect(Collectors.groupingBy(TrainingLog.WorkSet::exerciseId, LinkedHashMap::new, Collectors.toList()))
                .entrySet().stream()
                .flatMap(move -> PersonalRecords.of(before.stream().map(ProgressReads.Row::set).filter(set -> set.exerciseId().equals(move.getKey())).toList(),
                        move.getValue()).stream())
                .map(mark -> new SetMark(mark.set().exerciseId(), mark.kind(), mark.set().loadKg(), mark.set().reps(), mark.set().rir(),
                        mark.set().side() == Side.BOTH ? null : mark.set().side()))
                .toList();
        LocalDate day = workout.startedAt().atZone(zone).toLocalDate();
        // "What moved" against that same session (K-1008); a load the call held that day is held, on the moves whose load
        // the engine adds (compound, G6 K-33), as the progress weeks read it.
        List<TrainingChanges.Change> changes = calls.changes(account);
        boolean holding = TrainingChanges.inForce(changes, TrainingChanges.Kind.HOLD_LOAD, day).isPresent();
        Set<String> held = !holding ? Set.of() : sets.stream().map(TrainingLog.WorkSet::exerciseId).distinct()
                .filter(move -> catalog.find(move).map(found -> found.kind() == ExerciseCatalog.Kind.COMPOUND).orElse(false))
                .collect(Collectors.toSet());
        List<ProgressSummary.MoveChange> moves = ProgressSummary.moves(sets, lastOfDay.orElse(List.of()), held);
        Set<String> trained = sets.stream().flatMap(set -> primary(set.exerciseId()).stream()).collect(Collectors.toSet());
        BigDecimal lifted = ProgressSummary.lifted(sets);
        // The week as it stood when this workout started: the sets of later sessions are not this summary's.
        List<ProgressReads.Row> upToThis = rows.stream().filter(row -> !row.set().at().isAfter(workout.startedAt())).toList();
        List<ProgressSummary.MuscleSets> week = muscles(programs.current(account), changes, upToThis, day, zone, parameters(account));
        int workingSets = ProgressSummary.counted(sets).values().stream().mapToInt(Integer::intValue).sum();
        // The session's active time (K-998); none while it is open, nor once closed by itself (endedAt = startedAt, K-961):
        // how long it lasted is not known.
        Integer minutes = workout.endedAt() == null || workout.endedAt().equals(workout.startedAt()) ? null
                : ProgressSummary.activeMinutes(workout.startedAt(), workout.endedAt(), workout.pausedSeconds());
        return new WorkoutSummary(id, minutes, lifted, ProgressSummary.changePercent(lifted, previous).orElse(null), workingSets, marks, moves,
                ProgressSummary.monday(day), week.stream().filter(muscle -> trained.contains(muscle.muscle())).toList());
    }

    @GetMapping("/v1/training-progress")
    TrainingProgress progress(AccountId account) {
        ZoneId zone = zone(account);
        LocalDate today = LocalDate.now(clock.withZone(zone));
        List<ProgressReads.Row> rows = reads.workingSets(account);
        List<TrainingChanges.Change> changes = calls.changes(account);
        Optional<ProgramStore.Program> program = programs.current(account);
        Parameters p = parameters(account);
        boolean held = TrainingChanges.inForce(changes, TrainingChanges.Kind.HOLD_LOAD, today).isPresent();
        Map<String, Integer> stalled = statuses.stalledSessions(account, today, zone);
        List<LiftProgress> lifts = program.stream().flatMap(current -> current.days().stream())
                .flatMap(programDay -> programDay.exercises().stream()).map(ProgramStore.PlannedExercise::exerciseId).distinct()
                .flatMap(exerciseId -> catalog.find(exerciseId).stream())
                .flatMap(move -> lift(move, rows.stream().map(ProgressReads.Row::set).filter(set -> set.exerciseId().equals(move.id()))
                        .filter(set -> set.reps() >= 1).toList(), stalled.getOrDefault(move.id(), 0), held, changes, zone, p).stream())
                .toList();
        return new TrainingProgress(ProgressSummary.monday(today), muscles(program, changes, rows, today, zone, p), lifts,
                (int) lifts.stream().filter(LiftProgress::stronger).count(), lifts.size());
    }

    /**
     * A move with a working set (imported ones too: records, baseline, chart); {@code stalled} as the weekly call counts it;
     * the load held only where the engine adds load (a compound move, G6 K-33).
     */
    private static Optional<LiftProgress> lift(ExerciseCatalog.Exercise move, List<TrainingLog.WorkSet> history, int stalled, boolean held,
            List<TrainingChanges.Change> changes, ZoneId zone, Parameters parameters) {
        boolean compound = move.kind() == ExerciseCatalog.Kind.COMPOUND;
        List<ProgressSummary.Session> sessions = ProgressSummary.sessions(history, zone);
        return PersonalRecords.best(history).map(best -> {
            ProgressSummary.Session baseline = sessions.getFirst();
            return new LiftProgress(move.id(), dated(baseline.top(), zone), dated(best.set(), zone), best.kind() == PersonalRecords.Kind.RECORD,
                    ProgressSummary.weeks(sessions, changes, compound),
                    ProgressSummary.effort(sessions, stalled, held && compound, parameters).orElse(null));
        });
    }

    /**
     * The week of {@code day}: the program's sets this week (a lighter week's fewer, a week off's none, K-217) and the
     * working sets done (ProgressSummary.counted, per workout), by primary muscle.
     */
    private List<ProgressSummary.MuscleSets> muscles(Optional<ProgramStore.Program> program, List<TrainingChanges.Change> changes,
            List<ProgressReads.Row> rows, LocalDate day, ZoneId zone, Parameters parameters) {
        LocalDate monday = ProgressSummary.monday(day);
        Optional<TrainingChanges.Change> lighter = TrainingChanges.inForce(changes, TrainingChanges.Kind.LIGHTER_WEEK, day);
        boolean resting = TrainingChanges.inForce(changes, TrainingChanges.Kind.REST_WEEK, day).isPresent();
        Map<String, Integer> planned = new HashMap<>();
        program.stream().flatMap(current -> current.days().stream()).flatMap(programDay -> programDay.exercises().stream())
                .forEach(move -> primary(move.exerciseId()).ifPresent(muscle -> planned.merge(muscle, resting ? 0 : TrainingChanges.sets(move.sets(), lighter), Integer::sum)));
        Predicate<LocalDate> thisWeek = date -> !date.isBefore(monday) && date.isBefore(monday.plusDays(DAYS_PER_WEEK));
        Map<String, Integer> done = new HashMap<>();
        rows.stream().filter(row -> thisWeek.test(row.set().at().atZone(zone).toLocalDate()))
                .collect(Collectors.groupingBy(ProgressReads.Row::workoutId, Collectors.mapping(ProgressReads.Row::set, Collectors.toList())))
                .values().forEach(workout -> ProgressSummary.counted(workout)
                        .forEach((move, sets) -> primary(move).ifPresent(muscle -> done.merge(muscle, sets, Integer::sum))));
        return ProgressSummary.muscles(planned, done, catalog.armMuscles(), parameters);
    }

    /** The catalog's first muscle (K-211); none for the user's own move. */
    private Optional<String> primary(String exerciseId) {
        return catalog.find(exerciseId).map(move -> move.muscles().getFirst());
    }

    private static DatedSet dated(TrainingLog.WorkSet set, ZoneId zone) {
        return new DatedSet(set.loadKg(), set.reps(), set.rir(), set.at().atZone(zone).toLocalDate());
    }

    private ZoneId zone(AccountId account) {
        return profiles.of(account).map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
    }

    private Parameters parameters(AccountId account) {
        return parameters.forSex(profiles.of(account).map(facts -> Sex.valueOf(facts.sex().name())).orElse(Sex.MALE));
    }
}
