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
 * A training day added to the program (K-1012, ADR-073 Ek 9; generalized by K-1060, ADR-090 Ek 1), pure. The one place a day
 * is added from: the Train tab, the Edit program page and the first week's call all send the weekday, and the content is the
 * generator's, with no coaching rule of its own (U14): the split, the moves, the sets, the rep ranges (G1 K-21) and the RIR
 * target (G1 K-5) are the program templates'. The program can take a day while it has a template for one more day.
 *
 * <p>Two ways, by what the program is. A generated program as the generator made it (nobody changed its days or moves), except
 * the two-day one the first week's call adds to (add_day_balanced_days: that step was measured to balance), is
 * <b>replanned</b>: it becomes the template for one more day on its weekdays and the new one, because the day is picked by
 * its place in the week and not by what the program trains, and adding it to the old split alone leaves two lower days in a
 * row in a fifth of the weekday layouts and some muscle short of sets (ADR-073 Ek 9's measure). Each day stays on its weekday with its id, and a move the
 * new plan keeps keeps its row, target and starting weight. A program the user changed (an edit, a swap from now on, a review
 * change) or brought is <b>added to</b>: every day and move stays as it is, and the new day is the template for one more day
 * at the weekday's place in the week. The user's work is never undone by an add (an add is a change of the log an undo takes
 * back whole in either case).
 */
final class ProgramDayAdds {

    private ProgramDayAdds() {
    }

    /**
     * Whether the program can take an added day at all: each of its days on its own weekday (a day on no weekday has no place in
     * the week) and a template for one more day. The one rule {@link #added} and the contract's {@code Program.canAddDay} share,
     * so the phone never offers an add the server refuses for the program (it can still refuse a weekday the program trains: the
     * phone offers only free ones).
     */
    static boolean canAdd(ProgramStore.Program program, ProgramTemplates templates) {
        if (program.days().stream().anyMatch(day -> day.weekday() == null) || templates.forDays(program.days().size() + 1).isEmpty()) {
            return false;
        }
        return program.days().stream().map(ProgramStore.Day::weekday).distinct().count() == program.days().size();
    }

    /**
     * Whether the program is a generated one as the generator made it for its days: the same template, each day's moves, sets
     * and rep ranges (not its weekdays, ids or targets). An edit, a swap from now on or a review change ends it.
     */
    static boolean asGenerated(ProgramStore.Program program, ProgramTemplates templates, ExerciseCatalog catalog, Parameters parameters) {
        if (program.source() != ProgramStore.Source.GENERATED || templates.forDays(program.days().size()).isEmpty()) {
            return false;
        }
        List<DayOfWeek> weekdays = program.days().stream().map(ProgramStore.Day::weekday).toList();
        if (weekdays.contains(null) || weekdays.stream().distinct().count() != weekdays.size()) {
            return false;
        }
        List<ProgramGenerator.PlannedDay> made = ProgramGenerator.generate(EnumSet.copyOf(weekdays), templates, catalog, parameters);
        for (int i = 0; i < made.size(); i++) {
            ProgramStore.Day day = program.days().get(i);
            if (!made.get(i).nameKey().equals(day.nameKey()) || made.get(i).exercises().size() != day.exercises().size()) {
                return false;
            }
            for (int m = 0; m < day.exercises().size(); m++) {
                ProgramGenerator.Planned planned = made.get(i).exercises().get(m);
                ProgramStore.PlannedExercise move = day.exercises().get(m);
                if (!planned.exerciseId().equals(move.exerciseId()) || planned.sets() != move.sets() || planned.reps().min() != move.repMin()
                        || planned.reps().max() != move.repMax()) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * The program's days with the new day in week order (a day without an id: the store gives it one, and its moves). Empty
     * when the day can't be added: see {@link #canAdd}, or a weekday the program already trains.
     *
     * <p>{@code replan} (the caller says no when a workout was started today: its day must not change under it) lets a program
     * as the generator made it become the plan for one more day; see the class comment.
     *
     * <p>A move the program has a starting weight for (ADR-072 #5) has it in the new day too: the load the user gave, as the
     * starting weights call makes it for a range, with {@code askedReps} the reps it was asked for and {@code gym} the gym
     * in use. A move without one has no target: the first session finds the load.
     */
    static Optional<List<ProgramStore.Day>> added(ProgramStore.Program program, DayOfWeek weekday, ProgramTemplates templates, ExerciseCatalog catalog,
            Parameters parameters, int askedReps, Optional<GymStore.Gym> gym, boolean replan) {
        if (!canAdd(program, templates)) {
            return Optional.empty();
        }
        Set<DayOfWeek> weekdays = EnumSet.noneOf(DayOfWeek.class);
        program.days().forEach(day -> weekdays.add(day.weekday()));
        if (!weekdays.add(weekday)) {
            return Optional.empty();
        }
        Map<String, BigDecimal> known = startingWeights(program);
        List<ProgramGenerator.PlannedDay> plan = ProgramGenerator.generate(weekdays, templates, catalog, parameters);
        // The step measured to balance as an add to the old split (add_day_balanced_days: two to three, the first week's call) stays one.
        if (replan && program.days().size() != parameters.wholeNumber(ParameterKey.ADD_DAY_BALANCED_DAYS)
                && asGenerated(program, templates, catalog, parameters)) {
            return Optional.of(replanned(program, plan, known, askedReps, catalog, gym));
        }
        ProgramStore.Day added = plan.stream().filter(day -> day.weekday() == weekday).findFirst()
                .map(day -> fresh(day, known, askedReps, catalog, gym)).orElseThrow();
        List<ProgramStore.Day> days = new ArrayList<>(program.days());
        int at = 0;
        while (at < days.size() && days.get(at).weekday().compareTo(weekday) < 0) {
            at++;
        }
        days.add(at, added);
        return Optional.of(List.copyOf(days));
    }

    /**
     * The plan for one more day on the program's rows: a day on a weekday the program trained keeps that day's id, a move the
     * plan has again takes the row (and so the target and the starting weight) of one the program had of the same move, each
     * row once; every other day and move is new.
     */
    private static List<ProgramStore.Day> replanned(ProgramStore.Program program, List<ProgramGenerator.PlannedDay> plan, Map<String, BigDecimal> known,
            int askedReps, ExerciseCatalog catalog, Optional<GymStore.Gym> gym) {
        Map<DayOfWeek, java.util.UUID> dayIds = new HashMap<>();
        Map<String, java.util.Deque<ProgramStore.PlannedExercise>> rows = new HashMap<>();
        program.days().forEach(day -> {
            dayIds.put(day.weekday(), day.id());
            day.exercises().forEach(move -> rows.computeIfAbsent(move.exerciseId(), id -> new java.util.ArrayDeque<>()).add(move));
        });
        return plan.stream().map(day -> {
            ProgramStore.Day made = fresh(day, known, askedReps, catalog, gym);
            List<ProgramStore.PlannedExercise> moves = made.exercises().stream().map(move -> {
                java.util.Deque<ProgramStore.PlannedExercise> same = rows.get(move.exerciseId());
                ProgramStore.PlannedExercise row = same == null ? null : same.pollFirst();
                return row == null ? move : move.inRowOf(row);
            }).toList();
            return new ProgramStore.Day(dayIds.get(day.weekday()), made.nameKey(), null, day.weekday(), moves);
        }).toList();
    }

    private static ProgramStore.Day fresh(ProgramGenerator.PlannedDay day, Map<String, BigDecimal> known, int askedReps, ExerciseCatalog catalog,
            Optional<GymStore.Gym> gym) {
        return new ProgramStore.Day(null, day.nameKey(), null, day.weekday(), day.exercises().stream()
                .map(planned -> withStartingWeight(new ProgramStore.PlannedExercise(planned.exerciseId(), planned.sets(), planned.reps().min(),
                        planned.reps().max(), planned.targetRir()), known, askedReps, catalog, gym))
                .toList());
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
