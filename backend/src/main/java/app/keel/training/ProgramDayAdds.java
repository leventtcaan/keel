package app.keel.training;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepRange;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * A training day added to a generated program (K-1012, ADR-073 Ek 9), pure. The new day is what {@link ProgramGenerator}
 * gives that weekday for the program's weekdays plus the new one: the template for one more day, the day at the new
 * weekday's place in the week. It has no rule of its own (U14): the split, the moves, the sets, the rep ranges (G1 K-21)
 * and the RIR target (G1 K-5) are the generator's. Every day the program has stays as it is, its id, rows and targets.
 *
 * <p>Only from add_day_from_days days (the first week's call, two to three): the day is picked by its place in the week, not
 * by what the program already trains, so only that step was checked to come out balanced (ADR-073 Ek 9); from other numbers of
 * days the user edits the days themselves.
 */
final class ProgramDayAdds {

    private ProgramDayAdds() {
    }

    /**
     * The program's days with the new day in week order (a day without an id: the store gives it one, and its moves). Empty
     * when the day can't be added: the user's own program (the generator has no split of theirs), a program of another number
     * of days than add_day_from_days, a weekday the program already trains, or a day on no weekday (its place in the week is
     * not known).
     *
     * <p>A move the program has a starting weight for (ADR-072 #5) has it in the new day too: the load the user gave, as the
     * starting weights call makes it for a range, with {@code askedReps} the reps it was asked for and {@code gym} the gym
     * in use. A move without one has no target: the first session finds the load.
     */
    static Optional<List<ProgramStore.Day>> added(ProgramStore.Program program, DayOfWeek weekday, ProgramTemplates templates, ExerciseCatalog catalog,
            Parameters parameters, int askedReps, Optional<GymStore.Gym> gym) {
        if (program.source() != ProgramStore.Source.GENERATED || program.days().size() != parameters.wholeNumber(ParameterKey.ADD_DAY_FROM_DAYS)
                || program.days().stream().anyMatch(day -> day.weekday() == null)) {
            return Optional.empty();
        }
        Set<DayOfWeek> weekdays = EnumSet.noneOf(DayOfWeek.class);
        program.days().forEach(day -> weekdays.add(day.weekday()));
        if (weekdays.size() != program.days().size() || !weekdays.add(weekday)) {
            return Optional.empty();
        }
        Map<String, BigDecimal> known = startingWeights(program);
        ProgramStore.Day added = ProgramGenerator.generate(weekdays, templates, catalog, parameters).stream().filter(day -> day.weekday() == weekday)
                .findFirst().map(day -> new ProgramStore.Day(null, day.nameKey(), null, day.weekday(), day.exercises().stream()
                        .map(planned -> withStartingWeight(new ProgramStore.PlannedExercise(planned.exerciseId(), planned.sets(), planned.reps().min(),
                                planned.reps().max(), planned.targetRir()), known, askedReps, catalog, gym))
                        .toList()))
                .orElseThrow();
        List<ProgramStore.Day> days = new ArrayList<>(program.days());
        int at = 0;
        while (at < days.size() && days.get(at).weekday().compareTo(weekday) < 0) {
            at++;
        }
        days.add(at, added);
        return Optional.of(List.copyOf(days));
    }

    /** The load kept as the starting weight of each move of the program (the same on every day it is planned in). */
    private static Map<String, BigDecimal> startingWeights(ProgramStore.Program program) {
        Map<String, BigDecimal> known = new HashMap<>();
        program.days().forEach(day -> day.exercises().stream().filter(move -> move.startLoadKg() != null)
                .forEach(move -> known.putIfAbsent(move.exerciseId(), move.startLoadKg())));
        return known;
    }

    private static ProgramStore.PlannedExercise withStartingWeight(ProgramStore.PlannedExercise move, Map<String, BigDecimal> known, int askedReps,
            ExerciseCatalog catalog, Optional<GymStore.Gym> gym) {
        BigDecimal kg = known.get(move.exerciseId());
        ExerciseCatalog.Exercise exercise = catalog.find(move.exerciseId()).orElseThrow();
        return Optional.ofNullable(kg)
                .flatMap(load -> NextTargets.starting(load, askedReps, new RepRange(move.repMin(), move.repMax()), exercise.equipment(), exercise.id(), gym))
                .map(target -> new ProgramStore.PlannedExercise(move.exerciseId(), move.sets(), move.repMin(), move.repMax(), move.targetRir(),
                        target.loadKg(), target.reps(), null, null, null, false, target.loadKg(), target.reps()))
                .orElse(move);
    }
}
