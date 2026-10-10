package app.keel.training;

import app.keel.engine.Parameters;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * A training day added to a generated program (K-1012, ADR-073 Ek 9), pure. The new day is what {@link ProgramGenerator}
 * gives that weekday for the program's weekdays plus the new one: the template for one more day, the day at the new
 * weekday's place in the week. It has no rule of its own (U14): the split, the moves, the sets, the rep ranges (G1 K-21)
 * and the RIR target (G1 K-5) are the generator's. Every day the program has stays as it is, its id, rows and targets.
 */
final class ProgramDayAdds {

    private ProgramDayAdds() {
    }

    /**
     * The program's days with the new day in week order (a day without an id: the store gives it one, and its moves). Empty
     * when the day can't be added: the user's own program (the generator has no split of theirs), a weekday the program
     * already trains, a day on no weekday (its place in the week is not known), or no template for the number of days.
     */
    static Optional<List<ProgramStore.Day>> added(ProgramStore.Program program, DayOfWeek weekday, ProgramTemplates templates, ExerciseCatalog catalog,
            Parameters parameters) {
        if (program.source() != ProgramStore.Source.GENERATED || program.days().stream().anyMatch(day -> day.weekday() == null)) {
            return Optional.empty();
        }
        Set<DayOfWeek> weekdays = EnumSet.noneOf(DayOfWeek.class);
        program.days().forEach(day -> weekdays.add(day.weekday()));
        if (weekdays.size() != program.days().size() || !weekdays.add(weekday) || templates.forDays(weekdays.size()).isEmpty()) {
            return Optional.empty();
        }
        ProgramStore.Day added = ProgramGenerator.generate(weekdays, templates, catalog, parameters).stream().filter(day -> day.weekday() == weekday)
                .findFirst().map(day -> new ProgramStore.Day(null, day.nameKey(), null, day.weekday(), day.exercises().stream()
                        .map(planned -> new ProgramStore.PlannedExercise(planned.exerciseId(), planned.sets(), planned.reps().min(), planned.reps().max(),
                                planned.targetRir()))
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
}
