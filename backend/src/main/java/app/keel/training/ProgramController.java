package app.keel.training;

import app.keel.engine.ParameterKey;
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
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
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

    /** Contract PlannedExercise; {@code sets} is this week's (a deload lowers it, K-217), {@code baseSets} the program's. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record PlannedExercise(String exerciseId, int baseSets, int sets, Reps reps, int targetRir, BigDecimal nextLoadKg, Integer nextReps) {
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
     * ({@code restUntil}), the load held ({@code loadHeldSince}).
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Program(UUID id, ProgramStore.Source source, List<ProgramDay> days, DeloadWeek deload, LocalDate restUntil,
            LocalDate loadHeldSince) {
    }

    private final ProgramStore store;
    private final ProgramTemplates templates;
    private final ExerciseCatalog catalog;
    private final ParameterSet parameters;
    private final Profiles profiles;
    private final WorkoutController.TrainingLimits limits;

    private final TrainingCalls calls;
    private final Clock clock;

    ProgramController(ProgramStore store, ProgramTemplates templates, ExerciseCatalog catalog, ParameterSet parameters, Profiles profiles,
            WorkoutController.TrainingLimits limits, TrainingCalls calls, Clock clock) {
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
        LocalDate today = LocalDate.now(clock.withZone(profiles.of(account).map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC)));
        List<TrainingChanges.Change> changes = calls.changes(account);
        Optional<TrainingChanges.Change> lighter = TrainingChanges.inForce(changes, TrainingChanges.Kind.LIGHTER_WEEK, today);
        return new Program(program.id(), program.source(), program.days().stream().map(day -> new ProgramDay(day.id(), day.nameKey(),
                day.name(), day.weekday(), day.exercises().stream().map(planned -> new PlannedExercise(planned.exerciseId(), planned.sets(),
                        TrainingChanges.sets(planned.sets(), lighter), new Reps(planned.repMin(), planned.repMax()), planned.targetRir(),
                        planned.nextLoadKg(), planned.nextReps())).toList()))
                .toList(),
                lighter.map(change -> new DeloadWeek(change.setsFactor(), change.endsOn())).orElse(null),
                TrainingChanges.inForce(changes, TrainingChanges.Kind.REST_WEEK, today).map(TrainingChanges.Change::endsOn).orElse(null),
                TrainingChanges.inForce(changes, TrainingChanges.Kind.HOLD_LOAD, today).map(TrainingChanges.Change::startsOn).orElse(null));
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
