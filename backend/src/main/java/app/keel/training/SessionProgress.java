package app.keel.training;

import app.keel.engine.BodyRegion;
import app.keel.engine.LiftKind;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Progression;
import app.keel.engine.RepRange;
import app.keel.engine.Sex;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * After a workout of a program day is finished, each planned exercise gets the next session's target (K-217): the
 * engine's double progression on the day's work sets (K-109), the technique answer (G6 K-31), and the deload ladder's
 * hold in force on the workout's day (K-110).
 */
@Component
class SessionProgress {

    private final ProgramStore programs;
    private final WorkoutStore workouts;
    private final TrainingCalls calls;
    private final ExerciseCatalog catalog;
    private final ParameterSet parameters;
    private final Profiles profiles;

    SessionProgress(ProgramStore programs, WorkoutStore workouts, TrainingCalls calls, ExerciseCatalog catalog, ParameterSet parameters,
            Profiles profiles) {
        this.programs = programs;
        this.workouts = workouts;
        this.calls = calls;
        this.catalog = catalog;
        this.parameters = parameters;
        this.profiles = profiles;
    }

    void after(AccountId account, WorkoutStore.Workout workout, Set<String> uncleanExerciseIds) {
        if (workout.programDayId() == null) {
            return;
        }
        programs.current(account).flatMap(program -> program.days().stream().filter(day -> workout.programDayId().equals(day.id())).findFirst())
                .ifPresent(day -> {
                    Optional<ProfileFacts> profile = profiles.of(account);
                    Parameters p = parameters.forSex(profile.map(facts -> Sex.valueOf(facts.sex().name())).orElse(Sex.MALE));
                    ZoneId zone = profile.map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
                    LocalDate on = workout.startedAt().atZone(zone).toLocalDate();
                    boolean held = TrainingChanges.inForce(calls.changes(account), TrainingChanges.Kind.HOLD_LOAD, on).isPresent();
                    Map<String, List<TrainingLog.WorkSet>> worked = workouts.sets(workout.id()).stream()
                            .filter(set -> set.setType() == SetType.WORKING)
                            .map(set -> new TrainingLog.WorkSet(set.exerciseId(), workout.startedAt(), null, set.loadKg(), set.reps(), set.rir(), set.side()))
                            .collect(Collectors.groupingBy(TrainingLog.WorkSet::exerciseId));
                    for (ProgramStore.PlannedExercise planned : day.exercises()) {
                        catalog.find(planned.exerciseId()).ifPresent(exercise -> NextTargets.session(LiftKind.valueOf(exercise.kind().name()),
                                        BodyRegion.valueOf(catalog.region(exercise.muscles().getFirst()).name()),
                                        new RepRange(planned.repMin(), planned.repMax()), worked.getOrDefault(planned.exerciseId(), List.of()),
                                        planned.targetRir(), !uncleanExerciseIds.contains(planned.exerciseId()))
                                .flatMap(session -> NextTargets.after(session, Progression.next(session, p), held))
                                .ifPresent(next -> programs.setNext(account, day.id(), planned.exerciseId(), next.loadKg(), next.reps())));
                    }
                });
    }
}
