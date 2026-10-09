package app.keel.training;

import app.keel.engine.Consistency;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Today's session changed (K-964, ADR-073 #5, Ek 3), pure: one week's sessions on the calendar, Monday to Sunday (the
 * consistency week), each program day on its weekday unless moved; the short version, today's swaps, a skip; a move to
 * tomorrow that never passes Sunday. The program is never changed here: a skip adds no catch-up and plans nothing again
 * (U7, ADR-071 #3).
 */
final class TodayChanges {

    /**
     * One week's change to a program day's session: the day it is on ({@code onDate}; null on its weekday), skipped, the short
     * version, today's swaps (planned move → the one in its place).
     */
    record Change(LocalDate onDate, boolean skipped, boolean shortVersion, Map<String, String> swaps) {

        static final Change NONE = new Change(null, false, false, Map.of());

        Change {
            swaps = Map.copyOf(swaps);
        }

        Change shortened() {
            return new Change(onDate, skipped, true, swaps);
        }

        /** The short version off again (K-995). */
        Change full() {
            return new Change(onDate, skipped, false, swaps);
        }

        Change skip() {
            return new Change(onDate, true, shortVersion, swaps);
        }

        Change on(LocalDate day) {
            return new Change(day, skipped, shortVersion, swaps);
        }

        /** {@code planned} swapped for {@code to} today; for itself, the swap undone. */
        Change swapped(String planned, String to) {
            Map<String, String> next = new LinkedHashMap<>(swaps);
            if (planned.equals(to)) {
                next.remove(planned);
            } else {
                next.put(planned, to);
            }
            return new Change(onDate, skipped, shortVersion, next);
        }

        /**
         * Today's swaps once {@code planned} is swapped for {@code to} from now on: the one of {@code planned} is the plan now,
         * and one to {@code to} would put that move in the session twice.
         */
        Change withoutSwapsOf(String planned, String to) {
            Map<String, String> next = new LinkedHashMap<>(swaps);
            next.remove(planned);
            next.values().removeIf(to::equals);
            return new Change(onDate, skipped, shortVersion, next);
        }
    }

    /**
     * A program day's session this week; {@code exerciseIds} its moves that day (today's swaps and the short version applied),
     * {@code swaps} today's swaps in force (planned move → the one in its place); {@code movedFrom} its own day in the program
     * when moved (K-995), null otherwise.
     */
    record Session(UUID programDayId, LocalDate date, boolean moved, LocalDate movedFrom, boolean skipped, boolean shortVersion,
            List<String> exerciseIds, Map<String, String> swaps) {
    }

    /**
     * What undoes a row a move or a skip wrote (K-995, ADR-073 Ek 5): the day whose session was moved or skipped ({@code of}),
     * the day it was done on ({@code on}, the user's today then), and the row's change before it.
     */
    record Undo(UUID of, LocalDate on, Change before) {

        /** The change before without the swaps a swap from now on ends (Change#withoutSwapsOf): an undo does not revive them. */
        Undo withoutSwapsOf(String planned, String to) {
            return new Undo(of, on, before.withoutSwapsOf(planned, to));
        }
    }

    /** A row to keep: the change, and what undoes it. */
    record Kept(Change change, Undo undo) {
    }

    /** A session's workout this week: the latest started, under way ({@code open}) or done. */
    record Started(UUID workoutId, boolean open) {
    }

    /** Why a move of today's session would be refused (K-995): a session would pass Sunday, or it was started today. */
    enum Conflict { PAST_SUNDAY, STARTED }

    /** A session a move puts on a new day. */
    record Shift(UUID programDayId, LocalDate date) {
    }

    /** What a move of today's session would do now (K-995, ADR-073 Ek 6): its shifts by date, or why it would be refused. */
    record Preview(List<Shift> shifts, Conflict conflict) {
    }

    /**
     * The move of {@code programDayId} to tomorrow as it would go now, checked as the move checks it: refused when a
     * workout of the day was started today, then when a session would pass Sunday. Empty when it is not today's session.
     */
    static Optional<Preview> preview(List<Session> week, UUID programDayId, LocalDate today, boolean startedToday) {
        if (on(week, today).stream().noneMatch(session -> session.programDayId().equals(programDayId))) {
            return Optional.empty();
        }
        if (startedToday) {
            return Optional.of(new Preview(List.of(), Conflict.STARTED));
        }
        // Shifts onto one day are in the week's order there, as the moved week lays them out (by date, then the program's
        // order): each moved on a day from one day, where the week has them in the program's order.
        List<UUID> order = week.stream().map(Session::programDayId).toList();
        return Optional.of(moveToTomorrow(week, programDayId, today)
                .map(moves -> new Preview(moves.entrySet().stream().map(move -> new Shift(move.getKey(), move.getValue()))
                        .sorted(Comparator.comparing(Shift::date).thenComparingInt(shift -> order.indexOf(shift.programDayId()))).toList(), null))
                .orElse(new Preview(List.of(), Conflict.PAST_SUNDAY)));
    }

    private static final int DAYS_PER_WEEK = 7;

    private TodayChanges() {
    }

    /** The Monday of {@code day}'s week, the consistency week's start. */
    static LocalDate monday(LocalDate day) {
        return day.with(TemporalAdjusters.previousOrSame(Consistency.WEEK_STARTS_ON));
    }

    /** The week of {@code monday}: each day on a weekday, or moved to a date, by date then the program's order. */
    static List<Session> week(List<ProgramStore.Day> days, LocalDate monday, Map<UUID, Change> changes, int shortMoves) {
        record Placed(int order, Session session) {
        }
        List<Placed> placed = new ArrayList<>();
        for (int d = 0; d < days.size(); d++) {
            ProgramStore.Day day = days.get(d);
            Change change = changes.getOrDefault(day.id(), Change.NONE);
            LocalDate planned = plannedDate(day, monday);
            LocalDate date = change.onDate() != null ? change.onDate() : planned;
            if (date == null) {
                continue;
            }
            List<String> moves = day.exercises().stream().map(move -> change.swaps().getOrDefault(move.exerciseId(), move.exerciseId())).toList();
            if (change.shortVersion() && moves.size() > shortMoves) {
                moves = moves.subList(0, shortMoves);
            }
            Map<String, String> swaps = new LinkedHashMap<>(change.swaps());
            swaps.keySet().retainAll(day.exercises().stream().map(ProgramStore.PlannedExercise::exerciseId).toList());
            placed.add(new Placed(d, new Session(day.id(), date, !date.equals(planned), date.equals(planned) ? null : planned, change.skipped(), change.shortVersion(), List.copyOf(moves),
                    Map.copyOf(swaps))));
        }
        return placed.stream().sorted(Comparator.comparing((Placed p) -> p.session().date()).thenComparingInt(Placed::order)).map(Placed::session)
                .toList();
    }

    /**
     * The rows today's move of {@code of} writes (K-995): each session the move puts on a new day, a fresh one there (Ek 3),
     * with its change before the move, so an undo puts back the moved session as it was today and each one it pushed on.
     */
    static Map<UUID, Kept> moved(Map<UUID, Change> kept, Map<UUID, LocalDate> moves, UUID of, LocalDate today) {
        Map<UUID, Kept> rows = new LinkedHashMap<>();
        moves.forEach((id, on) -> rows.put(id, new Kept(Change.NONE.on(on), new Undo(of, today, kept.getOrDefault(id, Change.NONE)))));
        return Map.copyOf(rows);
    }

    /** The row today's skip of {@code of} writes: skipped, with its change before the skip. */
    static Kept skipped(Change change, UUID of, LocalDate today) {
        return new Kept(change.skip(), new Undo(of, today, change));
    }

    /**
     * Today's move or skip of {@code of} undone: each row it wrote back to its change before it, by program day. Empty when
     * nothing of {@code of} was moved or skipped today: an undo of another day's, or one done already.
     */
    static Map<UUID, Change> undo(Map<UUID, Undo> undos, UUID of, LocalDate today) {
        Map<UUID, Change> back = new LinkedHashMap<>();
        undos.forEach((id, undo) -> {
            if (undo.of().equals(of) && undo.on().equals(today)) {
                back.put(id, undo.before());
            }
        });
        return Map.copyOf(back);
    }

    /**
     * Each program day's session as its workouts of the week leave it (K-995): the latest started, under way while it has
     * no end. A workout of no program day (one imported, one started outside the program) is no session's.
     */
    static Map<UUID, Started> started(List<WorkoutStore.Workout> workouts) {
        Map<UUID, WorkoutStore.Workout> latest = new LinkedHashMap<>();
        workouts.stream().filter(workout -> workout.programDayId() != null)
                .sorted(Comparator.comparing(WorkoutStore.Workout::startedAt).thenComparing(WorkoutStore.Workout::id))
                .forEach(workout -> latest.put(workout.programDayId(), workout));
        Map<UUID, Started> started = new LinkedHashMap<>();
        latest.forEach((day, workout) -> started.put(day, new Started(workout.id(), workout.endedAt() == null)));
        return Map.copyOf(started);
    }

    /**
     * The sessions an undo would change back today: moved or skipped today, and no workout of the day started today on the
     * user's calendar ({@code zone}) — a session done is done (Ek 3).
     */
    static Set<UUID> undoable(Map<UUID, Undo> undos, List<WorkoutStore.Workout> workouts, LocalDate today, ZoneId zone) {
        Set<UUID> startedToday = startedOn(workouts, today, zone);
        return undos.entrySet().stream().filter(entry -> entry.getKey().equals(entry.getValue().of()) && entry.getValue().on().equals(today))
                .map(Map.Entry::getKey).filter(day -> !startedToday.contains(day)).collect(Collectors.toUnmodifiableSet());
    }

    /** The program days with a workout started on {@code day} on the user's calendar ({@code zone}). */
    static Set<UUID> startedOn(List<WorkoutStore.Workout> workouts, LocalDate day, ZoneId zone) {
        return workouts.stream().filter(workout -> workout.programDayId() != null)
                .filter(workout -> workout.startedAt().atZone(zone).toLocalDate().equals(day)).map(WorkoutStore.Workout::programDayId)
                .collect(Collectors.toUnmodifiableSet());
    }

    /** The day {@code day} is on in the week of {@code monday} by its weekday; null on no weekday. */
    static LocalDate plannedDate(ProgramStore.Day day, LocalDate monday) {
        return day.weekday() == null ? null : monday.plusDays(day.weekday().getValue() - (long) Consistency.WEEK_STARTS_ON.getValue());
    }

    /** The sessions on {@code day} not skipped: the ones to train that day. */
    static List<Session> on(List<Session> week, LocalDate day) {
        return week.stream().filter(session -> session.date().equals(day) && !session.skipped()).toList();
    }

    /**
     * Today's session {@code programDayId} moved to tomorrow, a session on that day moved on a day with it, and so on: the
     * new day of each session moved. Empty when it is not today's session or a session would pass Sunday.
     */
    static Optional<Map<UUID, LocalDate>> moveToTomorrow(List<Session> week, UUID programDayId, LocalDate today) {
        if (on(week, today).stream().noneMatch(session -> session.programDayId().equals(programDayId))) {
            return Optional.empty();
        }
        LocalDate sunday = monday(today).plusDays(DAYS_PER_WEEK - 1L);
        Map<UUID, LocalDate> moved = new LinkedHashMap<>();
        List<UUID> moving = List.of(programDayId);
        LocalDate to = today;
        while (!moving.isEmpty()) {
            to = to.plusDays(1);
            if (to.isAfter(sunday)) {
                return Optional.empty();
            }
            LocalDate day = to;
            moving.forEach(id -> moved.put(id, day));
            moving = on(week, day).stream().map(Session::programDayId).filter(id -> !moved.containsKey(id)).toList();
        }
        return Optional.of(Map.copyOf(moved));
    }
}
