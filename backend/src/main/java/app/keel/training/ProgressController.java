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
    record WorkoutSummary(UUID workoutId, BigDecimal liftedKg, Integer liftedChangePercent, int workingSets, List<SetMark> marks, LocalDate weekOf,
            List<ProgressSummary.MuscleSets> muscles) {
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

    ProgressController(ProgressReads reads, WorkoutStore workouts, ProgramStore programs, TrainingCalls calls, ExerciseCatalog catalog,
            ParameterSet parameters, Profiles profiles, Clock clock) {
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
        // The last earlier session of the same program day (it has a working set: the rows are working sets).
        Optional<BigDecimal> previous = before.stream().filter(row -> row.programDayId() != null && row.programDayId().equals(workout.programDayId()))
                .max(Comparator.comparing(row -> row.set().at())).map(ProgressReads.Row::workoutId)
                .map(last -> ProgressSummary.lifted(before.stream().filter(row -> row.workoutId().equals(last)).map(ProgressReads.Row::set).toList()));
        List<SetMark> marks = sets.stream().collect(Collectors.groupingBy(TrainingLog.WorkSet::exerciseId, LinkedHashMap::new, Collectors.toList()))
                .entrySet().stream()
                .flatMap(move -> PersonalRecords.of(before.stream().map(ProgressReads.Row::set).filter(set -> set.exerciseId().equals(move.getKey())).toList(),
                        move.getValue()).stream())
                .map(mark -> new SetMark(mark.set().exerciseId(), mark.kind(), mark.set().loadKg(), mark.set().reps(), mark.set().rir(),
                        mark.set().side() == Side.BOTH ? null : mark.set().side()))
                .toList();
        LocalDate day = workout.startedAt().atZone(zone).toLocalDate();
        Set<String> trained = sets.stream().flatMap(set -> primary(set.exerciseId()).stream()).collect(Collectors.toSet());
        BigDecimal lifted = ProgressSummary.lifted(sets);
        List<ProgressSummary.MuscleSets> week = muscles(programs.current(account), calls.changes(account), rows, day, zone, parameters(account));
        return new WorkoutSummary(id, lifted, ProgressSummary.changePercent(lifted, previous).orElse(null), sets.size(), marks,
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
        List<LiftProgress> lifts = program.stream().flatMap(current -> current.days().stream())
                .flatMap(programDay -> programDay.exercises().stream()).map(ProgramStore.PlannedExercise::exerciseId).distinct()
                .flatMap(exerciseId -> catalog.find(exerciseId).stream())
                .flatMap(move -> lift(move, rows.stream().map(ProgressReads.Row::set).filter(set -> set.exerciseId().equals(move.id()))
                        .filter(set -> set.reps() >= 1).toList(), held, changes, zone, p).stream())
                .toList();
        return new TrainingProgress(ProgressSummary.monday(today), muscles(program, changes, rows, today, zone, p), lifts,
                (int) lifts.stream().filter(LiftProgress::stronger).count(), lifts.size());
    }

    /** A move with a working set; the load held only where the engine adds load (a compound move, G6 K-33). */
    private static Optional<LiftProgress> lift(ExerciseCatalog.Exercise move, List<TrainingLog.WorkSet> history, boolean held,
            List<TrainingChanges.Change> changes, ZoneId zone, Parameters parameters) {
        List<ProgressSummary.Session> sessions = ProgressSummary.sessions(history, zone);
        return PersonalRecords.best(history).map(best -> {
            ProgressSummary.Session baseline = sessions.getFirst();
            return new LiftProgress(move.id(), dated(baseline.top(), zone), dated(best.set(), zone), best.kind() == PersonalRecords.Kind.RECORD,
                    ProgressSummary.weeks(sessions, changes),
                    ProgressSummary.effort(sessions, held && move.kind() == ExerciseCatalog.Kind.COMPOUND, parameters).orElse(null));
        });
    }

    /** The week of {@code day}: the program's sets this week (a lighter week's fewer, K-217) and the working sets done, by primary muscle. */
    private List<ProgressSummary.MuscleSets> muscles(Optional<ProgramStore.Program> program, List<TrainingChanges.Change> changes,
            List<ProgressReads.Row> rows, LocalDate day, ZoneId zone, Parameters parameters) {
        LocalDate monday = ProgressSummary.monday(day);
        Optional<TrainingChanges.Change> lighter = TrainingChanges.inForce(changes, TrainingChanges.Kind.LIGHTER_WEEK, day);
        Map<String, Integer> planned = new HashMap<>();
        program.stream().flatMap(current -> current.days().stream()).flatMap(programDay -> programDay.exercises().stream())
                .forEach(move -> primary(move.exerciseId()).ifPresent(muscle -> planned.merge(muscle, TrainingChanges.sets(move.sets(), lighter), Integer::sum)));
        Predicate<LocalDate> thisWeek = date -> !date.isBefore(monday) && date.isBefore(monday.plusDays(DAYS_PER_WEEK));
        Map<String, Integer> done = new HashMap<>();
        rows.stream().map(ProgressReads.Row::set).filter(set -> set.reps() >= 1 && thisWeek.test(set.at().atZone(zone).toLocalDate()))
                .forEach(set -> primary(set.exerciseId()).ifPresent(muscle -> done.merge(muscle, 1, Integer::sum)));
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
