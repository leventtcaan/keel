package app.keel.training;

import app.keel.engine.ActivityLevel;
import app.keel.engine.BodyRegion;
import app.keel.engine.CardioOrigin;
import app.keel.engine.CardioPlacement;
import app.keel.engine.CardioPrescription;
import app.keel.engine.CardioSession;
import app.keel.engine.LiftKind;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.RepRange;
import app.keel.engine.ReturnLoad;
import app.keel.engine.Sex;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.BiFunction;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.bind.annotation.DeleteMapping;
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

    /** Contract StartingWeights: a move's load the user knows, in kg. */
    record StartingWeight(String exerciseId, BigDecimal kg) {
    }

    record StartingWeights(List<StartingWeight> weights) {
    }

    /**
     * Contract PlannedExercise; {@code sets} is this week's (a deload lowers it, K-217), {@code baseSets} the program's;
     * {@code rackEnds} true only when the target shown stopped at the ceiling (K-534), absent otherwise. The in-session
     * table (K-960, ADR-075 #3) — {@code lighterLoadKg}, {@code heavierLoadKg}, {@code calibrationStepKg} (Ek 1),
     * {@code lastBestSet}, {@code nextLoadAtTopKg} — each absent where there is none (SessionTable).
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record PlannedExercise(String exerciseId, int baseSets, int sets, Reps reps, int targetRir, BigDecimal nextLoadKg, Integer nextReps,
            Boolean rackEnds, BigDecimal lighterLoadKg, BigDecimal heavierLoadKg, BigDecimal calibrationStepKg, BestSet lastBestSet,
            BigDecimal nextLoadAtTopKg, List<String> swapOptions) {
    }

    /** Contract PlannedExercise.lastBestSet: the best working set of the move's last session before today (K-960). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record BestSet(BigDecimal loadKg, int reps, Integer rir) {

        static BestSet of(TrainingLog.WorkSet set) {
            return new BestSet(set.loadKg(), set.reps(), set.rir());
        }
    }

    /** A move's in-session options (K-960); null where there is none. */
    private record Table(BigDecimal lighterKg, BigDecimal heavierKg, BigDecimal calibrationStepKg, BigDecimal nextAtTopKg) {

        static final Table NONE = new Table(null, null, null, null);
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
     * ({@code backAfterBreak}, absent otherwise); the program reviewed as it is now (K-956); this week's
     * cardio (K-959), absent where there is none; today on the user's calendar and its week's Monday (K-995), and this week's sessions on it (K-964).
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Program(UUID id, ProgramStore.Source source, List<ProgramDay> days, DeloadWeek deload, LocalDate restUntil,
            LocalDate loadHeldSince, Boolean backAfterBreak, ProgramReviews.Review review, ProgramCardio cardio, LocalDate today,
            LocalDate weekOf, List<WeekSession> week) {
    }

    /**
     * Contract WeekSession (K-964): a program day's session this week; the flags only when true. K-995: {@code movedFrom} its
     * own day when moved, {@code undoable} when today's move or skip of it can be undone, its workout of the week.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record WeekSession(UUID programDayId, LocalDate date, Boolean moved, LocalDate movedFrom, Boolean undoable, SessionWorkout workout,
            MovePreview movePreview, Boolean skipped, @JsonProperty("short") Boolean shortVersion, List<String> exerciseIds, List<TodaySwap> swaps) {

        static WeekSession of(TodaySessions.Shown shown, List<TodaySwap> swaps) {
            TodayChanges.Session session = shown.session();
            SessionWorkout workout = shown.workout() == null ? null : new SessionWorkout(shown.workout().workoutId(),
                    shown.workout().open() ? SessionWorkout.State.OPEN : SessionWorkout.State.DONE);
            return new WeekSession(session.programDayId(), session.date(), only(session.moved()), session.movedFrom(), only(shown.undoable()), workout,
                    shown.movePreview() == null ? null : MovePreview.of(shown.movePreview()), only(session.skipped()), only(session.shortVersion()), session.exerciseIds(), swaps.isEmpty() ? null : swaps);
        }

        private static Boolean only(boolean flag) {
            return flag ? Boolean.TRUE : null;
        }
    }

    /** Contract MovePreview (K-995, ADR-073 Ek 6): what a move of today's session would do now; {@code conflict} only when refused. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record MovePreview(List<MoveShift> shifts, TodayChanges.Conflict conflict) {

        static MovePreview of(TodayChanges.Preview preview) {
            return new MovePreview(preview.shifts().stream().map(shift -> new MoveShift(shift.programDayId(), shift.date())).toList(),
                    preview.conflict());
        }
    }

    /** Contract MoveShift. */
    record MoveShift(UUID programDayId, LocalDate date) {
    }

    /** Contract SessionWorkout (K-995): a session's latest workout of the week, under way or done. */
    record SessionWorkout(UUID id, State state) {

        enum State { OPEN, DONE }
    }

    /** Contract TodaySwap: a planned move swapped for today only, and the move in its place as a planned move of its own. */
    record TodaySwap(String insteadOf, PlannedExercise exercise) {
    }

    /** Contract TodayChange. */
    record TodayChange(UUID programDayId, TodaySessions.Kind change) {
    }

    /** Contract MoveSwap. */
    record MoveSwap(UUID programDayId, String exerciseId, String to, TodaySessions.Scope scope) {
    }

    /** Contract ReviewApply. */
    record ReviewApply(String reviewId, List<String> suggestionIds) {
    }

    /** Contract ReviewUndo: no change, every change in force. */
    record ReviewUndo(UUID changeId) {
    }

    /** Contract ReviewUndone. */
    record ReviewUndone(Program program, List<UUID> alsoUndone) {
    }

    /**
     * Contract ProgramCardio (K-959, ADR-074): this week's cardio, the days of this week with a session done, and whether a
     * session after the weights runs past cardio_after_lift_max_minutes (#4: an info line, never a block; G2 K-35).
     */
    record ProgramCardio(CardioOrigin source, int minutes, int sessionsPerWeek, List<PlannedCardio> sessions, int doneThisWeek,
            boolean afterLiftOverLine) {
    }

    /** Contract PlannedCardio: one session of the week, after the weights or on an off day. */
    record PlannedCardio(DayOfWeek weekday, CardioPlacement place) {

        static PlannedCardio of(CardioSession session) {
            return new PlannedCardio(session.day(), session.placement());
        }
    }

    /** Contract CardioPlan: the user's own cardio (ADR-074 #4); no sessions is cardio off. */
    record CardioPlan(Integer minutes, List<PlannedCardio> sessions) {
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
    private final StartingWeightReps startingWeightReps;
    private final ProgramReviews reviews;
    private final TodaySessions todays;
    private final CardioStore cardio;
    private final CardioController.CardioLimits cardioLimits;
    private final ObjectProvider<CurrentPhase> phases;
    private final CustomExerciseStore customs;

    ProgramController(ProgramStore store, ProgramTemplates templates, ExerciseCatalog catalog, ParameterSet parameters, Profiles profiles,
            WorkoutController.TrainingLimits limits, TrainingCalls calls, Clock clock, GymStore gyms, TrainingLog log,
            StartingWeightReps startingWeightReps, ProgramReviews reviews, CardioStore cardio, CardioController.CardioLimits cardioLimits,
            ObjectProvider<CurrentPhase> phases, CustomExerciseStore customs, TodaySessions todays) {
        this.todays = todays;
        this.reviews = reviews;
        this.customs = customs;
        this.startingWeightReps = startingWeightReps;
        this.cardio = cardio;
        this.cardioLimits = cardioLimits;
        this.phases = phases;
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

    /**
     * The user's own program: catalog moves, and the user's own moves (ADR-035 Ek 1, ADR-073 #1: an imported routine's move
     * the catalog does not have). The engine applies no rule to an own move: no target, no in-session table (each reads the
     * catalog and passes over what it does not hold).
     */
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
                require(exercise != null && exercise.exerciseId() != null
                        && (catalog.find(exercise.exerciseId()).isPresent() || customs.find(account, exercise.exerciseId()).isPresent())
                        && exercise.sets() != null
                        && exercise.sets() >= 1 && exercise.sets() <= limits.maxPlannedSets() && exercise.reps() != null
                        && exercise.reps().min() != null && exercise.reps().max() != null && exercise.reps().min() >= 1
                        && exercise.reps().max() >= exercise.reps().min() && exercise.reps().max() <= limits.maxReps());
                return new ProgramStore.PlannedExercise(exercise.exerciseId(), exercise.sets(), exercise.reps().min(), exercise.reps().max(),
                        targetRir);
            }).toList());
        }).toList();
        return view(account, store.replace(account, ProgramStore.Source.OWN, days));
    }

    /**
     * The loads an experienced user knows (ADR-072 #5): each is its move's first target on every day the move is planned
     * with a range starting at or under the reps the load was given for, as the gym in use makes it, replacing those given
     * before. Only a move of the program whose load the engine progresses (an isolation move has no target, Progression),
     * each once; a move or a day left out has no target, none is derived.
     */
    @PutMapping("/v1/program/starting-weights")
    Program startingWeights(AccountId account, @RequestBody StartingWeights request) {
        require(request.weights() != null && !request.weights().contains(null));
        ProgramStore.Program program = store.current(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        Parameters p = parametersFor(account);
        Optional<GymStore.Gym> gym = gyms.current(account);
        Set<String> given = new HashSet<>();
        Map<UUID, NextTargets.Target> targets = new HashMap<>();
        for (StartingWeight weight : request.weights()) {
            require(weight.exerciseId() != null && given.add(weight.exerciseId()) && weight.kg() != null && weight.kg().signum() > 0
                    && limits.load(weight.kg()));
            ExerciseCatalog.Exercise exercise = catalog.find(weight.exerciseId()).orElse(null);
            require(exercise != null
                    && !(exercise.kind() == ExerciseCatalog.Kind.ISOLATION && p.flag(ParameterKey.LOAD_PROGRESSION_COMPOUND_ONLY)));
            List<ProgramStore.PlannedExercise> planned = program.days().stream().flatMap(day -> day.exercises().stream())
                    .filter(move -> move.exerciseId().equals(exercise.id())).toList();
            require(!planned.isEmpty());
            planned.forEach(move -> NextTargets.starting(weight.kg(), startingWeightReps.reps(), new RepRange(move.repMin(), move.repMax()),
                    exercise.equipment(), exercise.id(), gym).ifPresent(target -> targets.put(move.id(), target)));
        }
        store.replaceStarting(account, targets);
        return view(account, store.current(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND)));
    }

    /** The program reviewed (K-956, ADR-073 #2): at most review_max_suggestions, and the review's changes in force. */
    @GetMapping("/v1/program/review")
    ProgramReviews.Review review(AccountId account) {
        ProgramStore.Program program = store.current(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        return reviews.review(account, program, parametersFor(account));
    }

    /** The suggestions the user picked from the review {@code reviewId} names (ADR-073 #3), each a change of its own. */
    @PostMapping("/v1/program/review/apply")
    Program applyReview(AccountId account, @RequestBody ReviewApply request) {
        List<String> picks = request.suggestionIds();
        require(request.reviewId() != null && picks != null && !picks.isEmpty() && !picks.contains(null) && Set.copyOf(picks).size() == picks.size());
        return view(account, reviews.apply(account, request.reviewId(), picks, parametersFor(account)));
    }

    /** "N changes applied · Undo" (ADR-073 #3): one change, or every change in force. */
    @PostMapping("/v1/program/review/undo")
    ReviewUndone undoReview(AccountId account, @RequestBody ReviewUndo request) {
        ProgramReviews.Undone undone = reviews.undo(account, Optional.ofNullable(request.changeId()), parametersFor(account));
        return new ReviewUndone(view(account, undone.program()), undone.alsoUndone());
    }

    /**
     * The user's own cardio (ADR-074 #4), in place of the engine's default; kept through a new program and a new phase. Each
     * session as the user puts it, one a weekday at most: the user's own rests on no engine rule.
     */
    @PutMapping("/v1/program/cardio")
    Program ownCardio(AccountId account, @RequestBody CardioPlan plan) {
        require(cardioLimits.minutes(plan.minutes()) && plan.sessions() != null
                && plan.sessions().stream().allMatch(session -> session != null && session.weekday() != null && session.place() != null)
                && plan.sessions().stream().map(PlannedCardio::weekday).distinct().count() == plan.sessions().size());
        ProgramStore.Program program = store.current(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        cardio.setUserPlan(account, CardioPrescription.user(plan.minutes(),
                plan.sessions().stream().map(session -> new CardioSession(session.weekday(), session.place())).toList()));
        return view(account, program);
    }

    /** Back to the coach's default (ADR-074 Ek 1): the user's own removed, the default follows the phase in force again. */
    @DeleteMapping("/v1/program/cardio")
    Program defaultCardio(AccountId account) {
        ProgramStore.Program program = store.current(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        cardio.removeUserPlan(account);
        return view(account, program);
    }

    /**
     * Today's session short, full again, moved to tomorrow or skipped, or today's move or skip undone (K-964, K-995, ADR-073 #5,
     * Ek 5): this week's, never the program.
     */
    @PostMapping("/v1/program/today")
    Program changeToday(AccountId account, @RequestBody TodayChange request) {
        require(request.programDayId() != null && request.change() != null);
        return view(account, todays.change(account, request.programDayId(), request.change(), today(account), zone(account), shortMoves(account)));
    }

    /** A move swapped for one of its options, today only or from now on (K-964, ADR-073 #6). */
    @PostMapping("/v1/program/swap")
    Program swap(AccountId account, @RequestBody MoveSwap request) {
        require(request.programDayId() != null && request.exerciseId() != null && request.to() != null && request.scope() != null);
        return view(account, todays.swap(account, request.programDayId(), request.exerciseId(), request.to(), request.scope(), today(account),
                zone(account), shortMoves(account)));
    }

    private int shortMoves(AccountId account) {
        return parametersFor(account).wholeNumber(ParameterKey.SHORT_SESSION_MOVES);
    }

    /** Today on the user's calendar. */
    private LocalDate today(AccountId account) {
        return LocalDate.now(clock.withZone(zone(account)));
    }

    private ZoneId zone(AccountId account) {
        return profiles.of(account).map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
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
        Optional<ProfileFacts> facts = profiles.of(account);
        ZoneId zone = facts.map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
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
        BiFunction<ProgramStore.PlannedExercise, List<String>, PlannedExercise> asShown = (planned, onTheDay) -> {
            Optional<NextTargets.Target> next = next(planned, held, back);
            int thisWeeksSets = TrainingChanges.sets(planned.sets(), lighter);
            Optional<TrainingLog.WorkSet> best = SessionTable.best(lastSessions.getOrDefault(planned.exerciseId(), List.of()));
            Table table = table(planned, next, best, held, thisWeeksSets, back);
            return new PlannedExercise(planned.exerciseId(), planned.sets(), thisWeeksSets,
                    new Reps(planned.repMin(), planned.repMax()), planned.targetRir(), next.map(NextTargets.Target::loadKg).orElse(null),
                    next.map(NextTargets.Target::reps).orElse(null), next.filter(NextTargets.Target::rackEnds).map(target -> Boolean.TRUE).orElse(null),
                    table.lighterKg(), table.heavierKg(), table.calibrationStepKg(), best.map(BestSet::of).orElse(null),
                    table.nextAtTopKg(), SwapOptions.of(planned.exerciseId(), onTheDay, catalog, back.gym()));
        };
        List<ProgramDay> days = program.days().stream().map(day -> {
            List<String> onTheDay = day.exercises().stream().map(ProgramStore.PlannedExercise::exerciseId).toList();
            return new ProgramDay(day.id(), day.nameKey(), day.name(), day.weekday(),
                    day.exercises().stream().map(planned -> asShown.apply(planned, onTheDay)).toList());
        }).toList();
        // Today's swaps (K-964, ADR-073 #6): the move in place of a planned one is shown as that planned move would be with
        // it from now on — the same sets and range, no target, its own last time and in-session table.
        List<WeekSession> week = todays.week(account, program, today, zone, back.parameters().wholeNumber(ParameterKey.SHORT_SESSION_MOVES)).stream()
                .map(shown -> WeekSession.of(shown, program.days().stream().filter(day -> day.id().equals(shown.session().programDayId())).findFirst()
                        .map(day -> day.exercises().stream().filter(planned -> shown.session().swaps().containsKey(planned.exerciseId()))
                                .map(planned -> new TodaySwap(planned.exerciseId(), asShown.apply(new ProgramStore.PlannedExercise(
                                        shown.session().swaps().get(planned.exerciseId()), planned.sets(), planned.repMin(), planned.repMax(),
                                        planned.targetRir()), day.exercises().stream()
                                        .map(move -> shown.session().swaps().getOrDefault(move.exerciseId(), move.exerciseId())).toList())))
                                .toList())
                        .orElse(List.of())))
                .toList();
        boolean backAfterBreak = program.days().stream().flatMap(day -> day.exercises().stream()).anyMatch(planned -> afterBreak(planned, back));
        // backAfterBreak: some target shown a step lighter today — the account's break, not one program day's.
        return new Program(program.id(), program.source(), days, lighter.map(change -> new DeloadWeek(change.setsFactor(), change.endsOn())).orElse(null),
                TrainingChanges.inForce(changes, TrainingChanges.Kind.REST_WEEK, today).map(TrainingChanges.Change::endsOn).orElse(null),
                TrainingChanges.inForce(changes, TrainingChanges.Kind.HOLD_LOAD, today).map(TrainingChanges.Change::startsOn).orElse(null),
                backAfterBreak ? Boolean.TRUE : null, reviews.review(account, program, back.parameters()),
                cardioThisWeek(account, program, facts, today, back.parameters()).orElse(null), today, TodayChanges.monday(today), week);
    }

    /**
     * This week's cardio (K-959, ADR-074): the user's own, else the engine's default for the phase in force (decision's,
     * through CurrentPhase) on the program's training days and the profile's activity; none without either. Done: the days
     * of this week with a cardio session.
     */
    private Optional<ProgramCardio> cardioThisWeek(AccountId account, ProgramStore.Program program, Optional<ProfileFacts> facts, LocalDate today,
            Parameters p) {
        Optional<CardioPrescription> own = cardio.userPlan(account);
        Optional<Phase> phase = own.isPresent() ? Optional.empty()
                : Optional.ofNullable(phases.getIfUnique()).flatMap(current -> current.of(account));
        LocalDate monday = CardioWeek.weekOf(today);
        return CardioWeek.prescription(own, phase, CardioWeek.trainingDays(program, facts.map(ProfileFacts::trainingDays).orElse(Set.of())),
                        facts.flatMap(ProfileFacts::activity).map(activity -> ActivityLevel.valueOf(activity.name())), p)
                .map(week -> new ProgramCardio(week.origin(), week.minutes(), week.sessions().size(),
                        week.sessions().stream().map(PlannedCardio::of).toList(), cardio.daysWithCardio(account, monday, monday.plusWeeks(1)),
                        week.afterLiftOverLine(p)));
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
     * gym in use makes it, the calibration step where there is no target (ADR-075 Ek 1), and the load once every set is
     * at the top (only from a target). None on a bodyweight move.
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
                    SessionTable.calibrationStep(next, region, p).orElse(null), atTop.orElse(null));
        }).orElse(Table.NONE);
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
