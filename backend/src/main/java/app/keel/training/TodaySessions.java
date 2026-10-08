package app.keel.training;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Today's session changed and a move swapped (K-964, ADR-073 #5-#6, Ek 3), under the program's row lock as the review's
 * apply and undo (K-956). A change of today (short, moved, skipped, a swap for today) is this week's, kept beside the
 * program; a swap from now on changes the program in place and clears the review's change log.
 */
@Service
class TodaySessions {

    enum Kind { SHORT, MOVE, SKIP }

    enum Scope { TODAY, FROM_NOW_ON }

    private final ProgramStore programs;
    private final SessionChangeStore changes;
    private final ReviewChangeStore reviewChanges;
    private final ExerciseCatalog catalog;
    private final GymStore gyms;
    private final WorkoutStore workouts;

    TodaySessions(ProgramStore programs, SessionChangeStore changes, ReviewChangeStore reviewChanges, ExerciseCatalog catalog, GymStore gyms,
            WorkoutStore workouts) {
        this.workouts = workouts;
        this.programs = programs;
        this.changes = changes;
        this.reviewChanges = reviewChanges;
        this.catalog = catalog;
        this.gyms = gyms;
    }

    /** The week of {@code today} as the program and its changes lay it out. */
    List<TodayChanges.Session> week(AccountId account, ProgramStore.Program program, LocalDate today, int shortMoves) {
        LocalDate monday = TodayChanges.monday(today);
        return TodayChanges.week(program.days(), monday, changes.week(account, monday), shortMoves);
    }

    /**
     * Today's session {@code programDayId} short, moved or skipped. CONFLICT when it is not on today, a move passes Sunday, or
     * (a move, a skip) a workout of that day was started today. A moved session is a fresh one on its new day: neither the
     * short version nor today's swaps go with it, nor with one the move pushes on.
     */
    @Transactional
    ProgramStore.Program change(AccountId account, UUID programDayId, Kind kind, LocalDate today, ZoneId zone, int shortMoves) {
        ProgramStore.Program program = programs.locked(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        LocalDate monday = TodayChanges.monday(today);
        Map<UUID, TodayChanges.Change> kept = changes.week(account, monday);
        List<TodayChanges.Session> week = TodayChanges.week(program.days(), monday, kept, shortMoves);
        requireToday(week, programDayId, today);
        if (kind != Kind.SHORT) {
            requireNotStarted(account, programDayId, today, zone);
        }
        TodayChanges.Change change = kept.getOrDefault(programDayId, TodayChanges.Change.NONE);
        switch (kind) {
            case SHORT -> changes.put(account, programDayId, monday, change.shortened());
            case SKIP -> changes.put(account, programDayId, monday, change.skip());
            case MOVE -> TodayChanges.moveToTomorrow(week, programDayId, today).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT))
                    .forEach((day, on) -> changes.put(account, day, monday, TodayChanges.Change.NONE.on(on)));
        }
        return program;
    }

    /**
     * The move {@code exerciseId} of the day swapped for {@code to}, one of its swap options. Today only: the day's session must
     * be on today and not started, {@code to} not in it already after today's earlier swaps; the planned move again undoes it.
     * From now on: the move's row gets the new move, without a target; this week's swap for today of that move, or to the new
     * move, ends (the plan is the swap now); the review's change log no longer matches the program and is cleared.
     */
    @Transactional
    ProgramStore.Program swap(AccountId account, UUID programDayId, String exerciseId, String to, Scope scope, LocalDate today, ZoneId zone,
            int shortMoves) {
        ProgramStore.Program program = programs.locked(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        ProgramStore.Day day = program.days().stream().filter(candidate -> candidate.id().equals(programDayId)).findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        List<String> planned = day.exercises().stream().map(ProgramStore.PlannedExercise::exerciseId).toList();
        if (!planned.contains(exerciseId)) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        LocalDate monday = TodayChanges.monday(today);
        Map<UUID, TodayChanges.Change> kept = changes.week(account, monday);
        TodayChanges.Change change = kept.getOrDefault(programDayId, TodayChanges.Change.NONE);
        if (scope == Scope.TODAY) {
            // The session as it is today: each planned move, or the one swapped in for it earlier today.
            List<String> inSession = planned.stream().map(move -> change.swaps().getOrDefault(move, move)).toList();
            if (!to.equals(exerciseId) && !SwapOptions.of(exerciseId, inSession, catalog, gyms.current(account)).contains(to)) {
                throw new ApiException(ErrorCode.VALIDATION_FAILED);
            }
            requireToday(TodayChanges.week(program.days(), monday, kept, shortMoves), programDayId, today);
            requireNotStarted(account, programDayId, today, zone);
            changes.put(account, programDayId, monday, change.swapped(exerciseId, to));
            return program;
        }
        if (!SwapOptions.of(exerciseId, planned, catalog, gyms.current(account)).contains(to)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        List<ProgramStore.Day> days = program.days().stream().map(other -> !other.id().equals(programDayId) ? other
                : new ProgramStore.Day(other.id(), other.nameKey(), other.name(), other.weekday(), other.exercises().stream()
                        .map(move -> move.exerciseId().equals(exerciseId)
                                ? new ProgramStore.PlannedExercise(to, move.sets(), move.repMin(), move.repMax(), move.targetRir())
                                : move)
                        .toList()))
                .toList();
        ProgramStore.Program edited = programs.rewrite(account, days);
        if (kept.containsKey(programDayId)) {
            changes.put(account, programDayId, monday, change.withoutSwapsOf(exerciseId, to));
        }
        reviewChanges.clear(account);
        return edited;
    }

    private static void requireToday(List<TodayChanges.Session> week, UUID programDayId, LocalDate today) {
        if (TodayChanges.on(week, today).stream().noneMatch(session -> session.programDayId().equals(programDayId))) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
    }

    /** CONFLICT when a workout of the day was started today on the user's calendar, under way or finished: it was done. */
    private void requireNotStarted(AccountId account, UUID programDayId, LocalDate today, ZoneId zone) {
        if (workouts.between(account, today.atStartOfDay(zone).toInstant(), today.plusDays(1).atStartOfDay(zone).toInstant()).stream()
                .anyMatch(workout -> programDayId.equals(workout.programDayId()))) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
    }
}
