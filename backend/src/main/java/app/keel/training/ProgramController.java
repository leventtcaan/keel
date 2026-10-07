package app.keel.training;

import app.keel.engine.BodyRegion;
import app.keel.engine.LiftKind;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.RepRange;
import app.keel.engine.ReturnLoad;
import app.keel.engine.Sex;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/program (K-211): built for the user who has none (ProgramGenerator on the template for their days),
 * or brought by the user who has one — the engine coaches on either. One current program; a new one replaces it.
 */
@RestController
class ProgramController {

    record ProgramRequest(List<DayOfWeek> trainingDays) {
    }

    record Reps(Integer min, Integer max) {
    }

    record OwnExercise(String exerciseId, Integer sets, Reps reps) {
    }

    record OwnDay(String name, DayOfWeek weekday, List<OwnExercise> exercises) {
    }

    record OwnProgram(List<OwnDay> days) {
    }

    /**
     * Contract PlannedExercise; {@code sets} is this week's (a deload lowers it, K-217), {@code baseSets} the program's;
     * {@code rackEnds} true only when the target shown stopped at the ceiling (K-534), absent otherwise. The in-session
     * table (K-960, ADR-075 #3) — {@code lighterLoadKg}, {@code heavierLoadKg}, {@code lastBestSet},
     * {@code nextLoadAtTopKg} — each absent where there is none (SessionTable).
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record PlannedExercise(String exerciseId, int baseSets, int sets, Reps reps, int targetRir, BigDecimal nextLoadKg, Integer nextReps,
            Boolean rackEnds, BigDecimal lighterLoadKg, BigDecimal heavierLoadKg, BestSet lastBestSet, BigDecimal nextLoadAtTopKg) {
    }

    /** Contract PlannedExercise.lastBestSet: the best working set of the move's last session before today (K-960). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record BestSet(BigDecimal loadKg, int reps, Integer rir) {

        static BestSet of(TrainingLog.WorkSet set) {
            return new BestSet(set.loadKg(), set.reps(), set.rir());
        }
    }

    /** A move's in-session options (K-960); null where there is none. */
    private record Table(BigDecimal lighterKg, BigDecimal heavierKg, BigDecimal nextAtTopKg) {

        static final Table NONE = new Table(null, null, null);
    }

    /** Contract ProgramDay: {@code nameKey} for a generated day, {@code name} for the user's own. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record ProgramDay(UUID id, String nameKey, String name, DayOfWeek weekday, List<PlannedExercise> exercises) {
    }

    /** Contract DeloadWeek: a lighter week in force (K-217). */
    record DeloadWeek(BigDecimal setsFactor, LocalDate until) {
    }

    /**
     * Contract Program, with the deload ladder's calls in force today (K-217): a lighter week, a week off
     * ({@code restUntil}), the load held ({@code loadHeldSince}); back after a long break (K-531), a target a step lighter
     * ({@code backAfterBreak}, absent otherwise).
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Program(UUID id, ProgramStore.Source source, List<ProgramDay> days, DeloadWeek deload, LocalDate restUntil,
            LocalDate loadHeldSince, Boolean backAfterBreak) {
    }

    private final ProgramStore store;
    private final ProgramTemplates templates;
    private final ExerciseCatalog catalog;
    private final ParameterSet parameters;
    private final Profiles profiles;
    private final WorkoutController.TrainingLimits limits;

    private final TrainingCalls calls;
    private final Clock clock;
    private final GymStore gyms;
    private final TrainingLog log;

    ProgramController(ProgramStore store, ProgramTemplates templates, ExerciseCatalog catalog, ParameterSet parameters, Profiles profiles,
            WorkoutController.TrainingLimits limits, TrainingCalls calls, Clock clock, GymStore gyms, TrainingLog log) {
        this.gyms = gyms;
        this.log = log;
        this.calls = calls;
        this.clock = clock;
        this.store = store;
        this.templates = templates;
        this.catalog = catalog;
        this.parameters = parameters;
        this.profiles = profiles;
        this.limits = limits;
    }

    @GetMapping("/v1/program")
    Program current(AccountId account) {
        return store.current(account).map(program -> view(account, program)).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    @PostMapping("/v1/program/generate")
    Program generate(AccountId account, @RequestBody ProgramRequest request) {
        List<DayOfWeek> days = request.trainingDays();
        require(days != null && !days.contains(null) && Set.copyOf(days).size() == days.size());
        Set<DayOfWeek> trainingDays = days.isEmpty() ? EnumSet.noneOf(DayOfWeek.class) : EnumSet.copyOf(days);
        require(templates.forDays(trainingDays.size()).isPresent());
        List<ProgramStore.Day> program = ProgramGenerator.generate(trainingDays, templates, catalog, parametersFor(account)).stream()
                .map(day -> new ProgramStore.Day(null, day.nameKey(), null, day.weekday(), day.exercises().stream()
                        .map(planned -> new ProgramStore.PlannedExercise(planned.exerciseId(), planned.sets(), planned.reps().min(),
                                planned.reps().max(), planned.targetRir()))
                        .toList()))
                .toList();
        return view(account, store.replace(account, ProgramStore.Source.GENERATED, program));
    }

    @PutMapping("/v1/program")
    Program own(AccountId account, @RequestBody OwnProgram own) {
        require(own.days() != null && !own.days().isEmpty() && own.days().size() <= DayOfWeek.values().length);
        Set<DayOfWeek> weekdays = new HashSet<>();
        int targetRir = parametersFor(account).wholeNumber(ParameterKey.TARGET_RIR_MAX);
        List<ProgramStore.Day> days = own.days().stream().map(day -> {
            require(day != null && day.name() != null && !day.name().isBlank() && day.name().length() <= limits.maxDayName());
            // Two days on one weekday would be two workouts the app cannot tell apart.
            require(day.weekday() == null || weekdays.add(day.weekday()));
            require(day.exercises() != null && !day.exercises().isEmpty() && day.exercises().size() <= limits.maxDayExercises());
            return new ProgramStore.Day(null, null, day.name().strip(), day.weekday(), day.exercises().stream().map(exercise -> {
                require(exercise != null && catalog.find(exercise.exerciseId()).isPresent() && exercise.sets() != null
                        && exercise.sets() >= 1 && exercise.sets() <= limits.maxPlannedSets() && exercise.reps() != null
                        && exercise.reps().min() != null && exercise.reps().max() != null && exercise.reps().min() >= 1
                        && exercise.reps().max() > exercise.reps().min() && exercise.reps().max() <= limits.maxReps());
                return new ProgramStore.PlannedExercise(exercise.exerciseId(), exercise.sets(), exercise.reps().min(), exercise.reps().max(),
                        targetRir);
            }).toList());
        }).toList();
        return view(account, store.replace(account, ProgramStore.Source.OWN, days));
    }

    /**
     * The engine's parameters for this user. The training ones have one value for both sexes; the profile's sex is used
     * when there is one, so a sex-specific parameter added later reads the right value.
     */
    private Parameters parametersFor(AccountId account) {
        return parameters.forSex(profiles.of(account).map(facts -> Sex.valueOf(facts.sex().name())).orElse(Sex.MALE));
    }

    /** The program as it is this week: the calls in force today on the user's calendar (K-217). */
    private Program view(AccountId account, ProgramStore.Program program) {
        ZoneId zone = profiles.of(account).map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
        LocalDate today = LocalDate.now(clock.withZone(zone));
        List<TrainingChanges.Change> changes = calls.changes(account);
        Optional<TrainingChanges.Change> lighter = TrainingChanges.inForce(changes, TrainingChanges.Kind.LIGHTER_WEEK, today);
        boolean held = TrainingChanges.inForce(changes, TrainingChanges.Kind.HOLD_LOAD, today).isPresent();
        // The break is the account's, from its training log (ADR-043 #75): the last session done before today, any day of the
        // program or none. Before today, so the session back itself — and a program read during it — stays a step lighter.
        Optional<LocalDate> lastSession = log.lastSessionBefore(account, today.atStartOfDay(zone).toInstant())
                .map(started -> started.atZone(zone).toLocalDate());
        Back back = new Back(today, zone, parametersFor(account), gyms.current(account), lastSession);
        // "Beat last time" is the last session before today's, as the break is (a session under way is not its own last time).
        Map<String, List<TrainingLog.WorkSet>> lastSessions = log.lastSessions(account, today.atStartOfDay(zone).toInstant());
        List<ProgramDay> days = program.days().stream().map(day -> new ProgramDay(day.id(), day.nameKey(), day.name(), day.weekday(),
                day.exercises().stream().map(planned -> {
                    Optional<NextTargets.Target> next = next(planned, held, back);
                    int thisWeeksSets = TrainingChanges.sets(planned.sets(), lighter);
                    Optional<TrainingLog.WorkSet> best = SessionTable.best(lastSessions.getOrDefault(planned.exerciseId(), List.of()));
                    Table table = table(planned, next, best, held, thisWeeksSets, back);
                    return new PlannedExercise(planned.exerciseId(), planned.sets(), thisWeeksSets,
                            new Reps(planned.repMin(), planned.repMax()), planned.targetRir(), next.map(NextTargets.Target::loadKg).orElse(null),
                            next.map(NextTargets.Target::reps).orElse(null), next.filter(NextTargets.Target::rackEnds).map(target -> Boolean.TRUE).orElse(null),
                            table.lighterKg(), table.heavierKg(), best.map(BestSet::of).orElse(null), table.nextAtTopKg());
                }).toList())).toList();
        boolean backAfterBreak = program.days().stream().flatMap(day -> day.exercises().stream()).anyMatch(planned -> afterBreak(planned, back));
        // backAfterBreak: some target shown a step lighter today — the account's break, not one program day's.
        return new Program(program.id(), program.source(), days, lighter.map(change -> new DeloadWeek(change.setsFactor(), change.endsOn())).orElse(null),
                TrainingChanges.inForce(changes, TrainingChanges.Kind.REST_WEEK, today).map(TrainingChanges.Change::endsOn).orElse(null),
                TrainingChanges.inForce(changes, TrainingChanges.Kind.HOLD_LOAD, today).map(TrainingChanges.Change::startsOn).orElse(null),
                backAfterBreak ? Boolean.TRUE : null);
    }

    /**
     * What a target back after a break is read with: the user's day, the engine's parameters, the gym in use, and the day
     * of the account's last session before today.
     */
    private record Back(LocalDate today, ZoneId zone, Parameters parameters, Optional<GymStore.Gym> gym, Optional<LocalDate> lastSession) {

        /** Back after a long break today (K-531): the account's last session before today a long break ago. */
        boolean afterBreak() {
            return lastSession.filter(day -> ReturnLoad.afterBreak(day, today, parameters)).isPresent();
        }
    }

    /**
     * A target stepped back: on a day back after a long break, one from before today — a target the session back wrote
     * today is that session's own, not stepped back again.
     */
    private static boolean afterBreak(ProgramStore.PlannedExercise planned, Back back) {
        return back.afterBreak() && planned.nextLoadKg() != null && planned.lastLoadKg() != null && planned.nextFrom() != null
                && planned.nextFrom().atZone(back.zone()).toLocalDate().isBefore(back.today());
    }

    /**
     * The next session's target as shown today. Back after a long break (K-531, ADR-043 #75): the last load one engine step
     * lighter, as the gym can make it (where it makes none so light, the last load; where it says nothing, the engine's
     * number), from the bottom of the range — before anything else. Otherwise a hold of the deload ladder in force keeps
     * the last load (K-217).
     */
    private Optional<NextTargets.Target> next(ProgramStore.PlannedExercise planned, boolean held, Back back) {
        if (planned.nextLoadKg() == null) {
            return Optional.empty();
        }
        if (afterBreak(planned, back)) {
            return catalog.find(planned.exerciseId()).map(exercise -> {
                BodyRegion region = BodyRegion.valueOf(catalog.region(exercise.muscles().getFirst()).name());
                BigDecimal stepped = ReturnLoad.stepBack(planned.lastLoadKg(), region, back.parameters());
                BigDecimal load = back.gym().filter(gym -> LoadSteps.knows(exercise.equipment(), exercise.id(), gym))
                        .map(gym -> LoadSteps.lighter(exercise.equipment(), exercise.id(), gym, planned.lastLoadKg(), stepped)
                                .orElse(planned.lastLoadKg()))
                        .orElse(stepped);
                return new NextTargets.Target(load, planned.repMin());
            });
        }
        return Optional.of(NextTargets.shown(new NextTargets.Target(planned.nextLoadKg(), planned.nextReps(), planned.nextRackEnds()), planned.lastLoadKg(),
                new RepRange(planned.repMin(), planned.repMax()), held));
    }

    /**
     * The in-session table of a planned move (K-960, ADR-075 #3), worked out here so the phone only picks in the gym:
     * a step either way from the load the session starts at — the target shown, else the last session's best set — as the
     * gym in use makes it, and the load once every set is at the top (only from a target). None on a bodyweight move.
     */
    private Table table(ProgramStore.PlannedExercise planned, Optional<NextTargets.Target> next, Optional<TrainingLog.WorkSet> best, boolean held,
            int thisWeeksSets, Back back) {
        return catalog.find(planned.exerciseId()).filter(exercise -> exercise.load() != ExerciseCatalog.Load.BODYWEIGHT).map(exercise -> {
            Parameters p = back.parameters();
            LiftKind kind = LiftKind.valueOf(exercise.kind().name());
            BodyRegion region = BodyRegion.valueOf(catalog.region(exercise.muscles().getFirst()).name());
            BigDecimal step = SessionTable.stepKg(region, p);
            Optional<BigDecimal> from = next.map(NextTargets.Target::loadKg).or(() -> best.map(TrainingLog.WorkSet::loadKg)).filter(kg -> kg.signum() > 0);
            // A jump limit only where the set's load is all the load moved (K-430), as a finished session's target has.
            BigDecimal maxJump = LoadSteps.wholeLoad(exercise.equipment()) ? BigDecimal.valueOf(p.number(ParameterKey.LOAD_JUMP_MAX_STEPS)) : null;
            Optional<BigDecimal> atTop = next.flatMap(target -> SessionTable.nextAtTop(kind, region, new RepRange(planned.repMin(), planned.repMax()),
                    target, thisWeeksSets, planned.targetRir(), held, load -> back.gym()
                            .map(gym -> LoadSteps.round(exercise.equipment(), exercise.id(), gym, target.loadKg(), load, maxJump))
                            .orElse(new LoadSteps.Rounding.Unknown()), p));
            return new Table(from.flatMap(kg -> SessionTable.lighter(exercise.equipment(), exercise.id(), back.gym(), kg, step)).orElse(null),
                    from.flatMap(kg -> SessionTable.heavier(exercise.equipment(), exercise.id(), back.gym(), kg, step)).orElse(null),
                    atTop.orElse(null));
        }).orElse(Table.NONE);
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
