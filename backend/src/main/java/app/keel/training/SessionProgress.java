package app.keel.training;

import app.keel.engine.BodyRegion;
import app.keel.engine.LiftKind;
import app.keel.engine.LiftSession;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Progression;
import app.keel.engine.RepRange;
import app.keel.engine.Sex;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * After a workout of a program day is finished, each planned exercise gets the next session's target (K-217): the
 * engine's double progression on the day's work sets (K-109) and the technique answer (G6 K-31); an added load as the gym
 * in use when the workout is finished can make it (K-414, ADR-032). Load is added only when
 * this week's planned sets (fewer in a lighter week) were all done at the top; a one-sided move follows its weaker side.
 * The target keeps the load it came from, so a hold of the deload ladder (K-110) is applied when the program is read,
 * whenever the hold began.
 */
@Component
class SessionProgress {

    /** A side's target and the load it came from. */
    private record Next(NextTargets.Target target, BigDecimal fromKg) {
    }

    private final ProgramStore programs;
    private final WorkoutStore workouts;
    private final TrainingCalls calls;
    private final ExerciseCatalog catalog;
    private final ParameterSet parameters;
    private final Profiles profiles;
    private final GymStore gyms;

    SessionProgress(ProgramStore programs, WorkoutStore workouts, TrainingCalls calls, ExerciseCatalog catalog, ParameterSet parameters,
            Profiles profiles, GymStore gyms) {
        this.gyms = gyms;
        this.programs = programs;
        this.workouts = workouts;
        this.calls = calls;
        this.catalog = catalog;
        this.parameters = parameters;
        this.profiles = profiles;
    }

    /** Finishes the workout and sets the targets it gives, together: a finish is kept with its targets or not at all. */
    @Transactional
    void finish(AccountId account, WorkoutStore.Workout workout, Instant endedAt, String note, Set<String> uncleanExerciseIds) {
        workouts.finish(account, workout.id(), endedAt, note, uncleanExerciseIds);
        retarget(account, workout, Set.copyOf(uncleanExerciseIds));
    }

    /**
     * A finished session's sets were edited (K-432, ADR-037 #48: data corrected, U2): its targets are derived again from
     * what it holds now, with the finish's answer on form. A target a newer session set stays (setNext keeps the newest);
     * one this session set for a move none of whose sets are left is gone. A session under way waits for its finish.
     */
    void edited(AccountId account, WorkoutStore.Workout workout) {
        if (workout.endedAt() != null) {
            retarget(account, workout, Set.copyOf(workout.uncleanExerciseIds()));
        }
    }

    private void retarget(AccountId account, WorkoutStore.Workout workout, Set<String> uncleanExerciseIds) {
        if (workout.programDayId() == null) {
            return;
        }
        programs.current(account).flatMap(program -> program.days().stream().filter(day -> workout.programDayId().equals(day.id())).findFirst())
                .ifPresent(day -> {
                    Optional<ProfileFacts> profile = profiles.of(account);
                    Parameters p = parameters.forSex(profile.map(facts -> Sex.valueOf(facts.sex().name())).orElse(Sex.MALE));
                    ZoneId zone = profile.map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
                    LocalDate on = workout.startedAt().atZone(zone).toLocalDate();
                    Optional<GymStore.Gym> gym = gyms.current(account);
                    Optional<TrainingChanges.Change> lighter = TrainingChanges.inForce(calls.changes(account), TrainingChanges.Kind.LIGHTER_WEEK, on);
                    Map<String, List<TrainingLog.WorkSet>> worked = workouts.sets(workout.id()).stream()
                            .filter(set -> set.setType() == SetType.WORKING)
                            .map(set -> new TrainingLog.WorkSet(set.exerciseId(), workout.startedAt(), null, set.loadKg(), set.reps(), set.rir(), set.side()))
                            .collect(Collectors.groupingBy(TrainingLog.WorkSet::exerciseId));
                    for (ProgramStore.PlannedExercise planned : day.exercises()) {
                        catalog.find(planned.exerciseId()).ifPresent(exercise -> {
                            LiftKind kind = LiftKind.valueOf(exercise.kind().name());
                            BodyRegion region = BodyRegion.valueOf(catalog.region(exercise.muscles().getFirst()).name());
                            RepRange range = new RepRange(planned.repMin(), planned.repMax());
                            int thisWeeksSets = TrainingChanges.sets(planned.sets(), lighter);
                            // Each side is its own set (SetRules): one session per side; both sides of a two-sided move are one.
                            List<Next> sides = worked.getOrDefault(planned.exerciseId(), List.of()).stream()
                                    .collect(Collectors.groupingBy(set -> String.valueOf(set.side()))).values().stream()
                                    .flatMap(sets -> NextTargets.session(kind, region, range, sets, planned.targetRir(),
                                                    !uncleanExerciseIds.contains(planned.exerciseId())).stream())
                                    .flatMap(session -> next(session, p, thisWeeksSets, load -> gym
                                            .map(inUse -> LoadSteps.round(exercise.equipment(), exercise.id(), inUse, session.loadKg(), load))
                                            .orElse(new LoadSteps.Rounding.Unknown())).stream())
                                    .toList();
                            NextTargets.weaker(sides.stream().map(Next::target).toList())
                                    .flatMap(target -> sides.stream().filter(side -> side.target().equals(target)).findFirst())
                                    .ifPresentOrElse(side -> programs.setNext(account, planned.id(), side.target().loadKg(), side.target().reps(),
                                            side.fromKg(), workout.startedAt()), () -> programs.clearNext(account, planned.id(), workout.startedAt()));
                        });
                    }
                });
    }

    private static Optional<Next> next(LiftSession session, Parameters parameters, int thisWeeksSets,
            Function<BigDecimal, LoadSteps.Rounding> rounding) {
        return NextTargets.after(session, Progression.next(session, parameters), false, thisWeeksSets, rounding)
                .map(target -> new Next(target, session.loadKg()));
    }
}
