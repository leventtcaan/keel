package app.keel.training;

import app.keel.engine.Consistency;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Today's session changed (K-964, ADR-073 #5, Ek 2), pure: one week's sessions on the calendar, Monday to Sunday (the
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
    }

    /** A program day's session this week; {@code exerciseIds} its moves that day (today's swaps and the short version applied). */
    record Session(UUID programDayId, LocalDate date, boolean moved, boolean skipped, boolean shortVersion, List<String> exerciseIds) {
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
            LocalDate planned = day.weekday() == null ? null : monday.plusDays(day.weekday().getValue() - (long) Consistency.WEEK_STARTS_ON.getValue());
            LocalDate date = change.onDate() != null ? change.onDate() : planned;
            if (date == null) {
                continue;
            }
            List<String> moves = day.exercises().stream().map(move -> change.swaps().getOrDefault(move.exerciseId(), move.exerciseId())).toList();
            if (change.shortVersion() && moves.size() > shortMoves) {
                moves = moves.subList(0, shortMoves);
            }
            placed.add(new Placed(d, new Session(day.id(), date, !date.equals(planned), change.skipped(), change.shortVersion(), List.copyOf(moves))));
        }
        return placed.stream().sorted(Comparator.comparing((Placed p) -> p.session().date()).thenComparingInt(Placed::order)).map(Placed::session)
                .toList();
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
