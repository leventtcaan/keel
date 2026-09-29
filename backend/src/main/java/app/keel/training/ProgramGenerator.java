package app.keel.training;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepRange;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

/**
 * A program for the user who has none (K-211, H3 B8, G1 K-22): the template for the number of days they train, its
 * days laid on their weekdays in week order (Monday first), each move with the rep range of its kind (G1 K-21:
 * compound 6-10, isolation 8-12) and the work-set RIR target (G1 K-5). The same days always give the same program.
 */
final class ProgramGenerator {

    record Planned(String exerciseId, int sets, RepRange reps, int targetRir) {
    }

    record PlannedDay(String nameKey, DayOfWeek weekday, List<Planned> exercises) {
    }

    private ProgramGenerator() {
    }

    /** IllegalArgumentException for a number of days no template has (none, or all seven: G1 K-70 wants rest days). */
    static List<PlannedDay> generate(Set<DayOfWeek> trainingDays, ProgramTemplates templates, ExerciseCatalog catalog, Parameters parameters) {
        List<ProgramTemplates.Day> template = templates.forDays(trainingDays.size())
                .orElseThrow(() -> new IllegalArgumentException("No program for " + trainingDays.size() + " training days"));
        RepRange compound = new RepRange(parameters.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MIN),
                parameters.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MAX));
        RepRange isolation = new RepRange(parameters.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MIN),
                parameters.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MAX));
        int targetRir = parameters.wholeNumber(ParameterKey.TARGET_RIR_MAX);
        List<DayOfWeek> weekdays = new ArrayList<>(new TreeSet<>(trainingDays));
        List<PlannedDay> program = new ArrayList<>();
        for (int i = 0; i < template.size(); i++) {
            ProgramTemplates.Day day = template.get(i);
            program.add(new PlannedDay(day.nameKey(), weekdays.get(i), day.exercises().stream().map(slot -> new Planned(slot.exerciseId(),
                    slot.sets(), catalog.find(slot.exerciseId()).orElseThrow().kind() == ExerciseCatalog.Kind.COMPOUND ? compound : isolation,
                    targetRir)).toList()));
        }
        return List.copyOf(program);
    }
}
