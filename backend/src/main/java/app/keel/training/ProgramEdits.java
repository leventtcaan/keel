package app.keel.training;

import java.time.DayOfWeek;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * The program edited by its day and move ids (K-995, ADR-073 #4, Ek 7), pure: the program as the user wants it, each day and
 * move named by the row it was, or new. A move keeps its row and next target while it is the same move with the same rep
 * range (other sets or not, on its day or another); another range keeps the row without its target (it was for the old
 * range); another move in its place is a new row without one (the new move has its own history, as "From now on"). A day
 * keeps its id and name unless the edit names it; one left out goes.
 */
final class ProgramEdits {

    /** A move as edited: {@code id} the program's row it was (PlannedExercise.id), null for a new one. */
    record Move(UUID id, String exerciseId, int sets, int repMin, int repMax) {
    }

    /** A day as edited: {@code id} the program's day, null for a new one; {@code name} null keeps the day's own. */
    record Day(UUID id, String name, DayOfWeek weekday, List<Move> moves) {
    }

    private ProgramEdits() {
    }

    /**
     * The program's days as edited, a new day or move without an id (it is stored with a new one); {@code targetRir} a new
     * move's. Empty, a conflict, when a day or move id is not the program's or is named twice: the program changed since the
     * edit was made.
     */
    static Optional<List<ProgramStore.Day>> edited(ProgramStore.Program program, List<Day> days, int targetRir) {
        Map<UUID, ProgramStore.Day> dayRows = new HashMap<>();
        Map<UUID, ProgramStore.PlannedExercise> moveRows = new HashMap<>();
        program.days().forEach(day -> {
            dayRows.put(day.id(), day);
            day.exercises().forEach(move -> moveRows.put(move.id(), move));
        });
        Set<UUID> named = new HashSet<>();
        boolean known = days.stream().allMatch(day -> day.id() == null || dayRows.containsKey(day.id()) && named.add(day.id()))
                && days.stream().flatMap(day -> day.moves().stream()).allMatch(move -> move.id() == null || moveRows.containsKey(move.id()) && named.add(move.id()));
        if (!known) {
            return Optional.empty();
        }
        return Optional.of(days.stream().map(day -> {
            ProgramStore.Day row = day.id() == null ? null : dayRows.get(day.id());
            String nameKey = day.name() != null || row == null ? null : row.nameKey();
            String name = day.name() != null ? day.name() : row == null ? null : row.name();
            return new ProgramStore.Day(day.id(), nameKey, name, day.weekday(),
                    day.moves().stream().map(move -> move(move, move.id() == null ? null : moveRows.get(move.id()), targetRir)).toList());
        }).toList());
    }

    /** The days of {@code before} that {@code after} puts on another weekday, or has no more: their week re-lays itself. */
    static Set<UUID> relaid(ProgramStore.Program before, ProgramStore.Program after) {
        Map<UUID, DayOfWeek> weekdays = new HashMap<>();
        after.days().forEach(day -> weekdays.put(day.id(), day.weekday()));
        Set<UUID> relaid = new HashSet<>();
        before.days().stream().filter(day -> !weekdays.containsKey(day.id()) || weekdays.get(day.id()) != day.weekday())
                .forEach(day -> relaid.add(day.id()));
        return Set.copyOf(relaid);
    }

    /**
     * Whether a day the change re-lays (another weekday, or gone) has a workout started today: a session done is done, so
     * the change is refused (Ek 7). A workout of no program day (a free or imported session) is no day's.
     */
    static boolean startedAndReLaid(Set<UUID> relaid, List<WorkoutStore.Workout> startedToday) {
        return startedToday.stream().map(WorkoutStore.Workout::programDayId).anyMatch(day -> day != null && relaid.contains(day));
    }

    private static ProgramStore.PlannedExercise move(Move move, ProgramStore.PlannedExercise row, int targetRir) {
        if (row == null) {
            return new ProgramStore.PlannedExercise(move.exerciseId(), move.sets(), move.repMin(), move.repMax(), targetRir);
        }
        if (!row.exerciseId().equals(move.exerciseId())) {
            return new ProgramStore.PlannedExercise(move.exerciseId(), move.sets(), move.repMin(), move.repMax(), row.targetRir());
        }
        ProgramStore.PlannedExercise sets = row.sets() == move.sets() ? row : row.withSets(move.sets());
        return row.repMin() == move.repMin() && row.repMax() == move.repMax() ? sets : sets.withReps(move.repMin(), move.repMax());
    }
}
