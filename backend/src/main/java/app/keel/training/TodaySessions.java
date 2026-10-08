package app.keel.training;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Today's session changed and a move swapped (K-964, ADR-073 #5-#6, Ek 2), under the program's row lock as the review's
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

    TodaySessions(ProgramStore programs, SessionChangeStore changes, ReviewChangeStore reviewChanges, ExerciseCatalog catalog, GymStore gyms) {
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

    /** Today's session {@code programDayId} short, moved or skipped. CONFLICT when it is not on today or a move passes Sunday. */
    @Transactional
    ProgramStore.Program change(AccountId account, UUID programDayId, Kind kind, LocalDate today, int shortMoves) {
        ProgramStore.Program program = programs.locked(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        LocalDate monday = TodayChanges.monday(today);
        Map<UUID, TodayChanges.Change> kept = changes.week(account, monday);
        List<TodayChanges.Session> week = TodayChanges.week(program.days(), monday, kept, shortMoves);
        if (TodayChanges.on(week, today).stream().noneMatch(session -> session.programDayId().equals(programDayId))) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        TodayChanges.Change change = kept.getOrDefault(programDayId, TodayChanges.Change.NONE);
        switch (kind) {
            case SHORT -> changes.put(account, programDayId, monday, change.shortened());
            case SKIP -> changes.put(account, programDayId, monday, change.skip());
            case MOVE -> TodayChanges.moveToTomorrow(week, programDayId, today).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT))
                    .forEach((day, on) -> changes.put(account, day, monday, kept.getOrDefault(day, TodayChanges.Change.NONE).on(on)));
        }
        return program;
    }

    /**
     * The move {@code exerciseId} of the day swapped for {@code to}, one of its swap options: today only (the day's session must
     * be on today; the planned move again undoes it), or from now on (the move's row gets the new move, without a target; the
     * review's change log no longer matches the program and is cleared).
     */
    @Transactional
    ProgramStore.Program swap(AccountId account, UUID programDayId, String exerciseId, String to, Scope scope, LocalDate today, int shortMoves) {
        ProgramStore.Program program = programs.locked(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        ProgramStore.Day day = program.days().stream().filter(candidate -> candidate.id().equals(programDayId)).findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        List<String> onTheDay = day.exercises().stream().map(ProgramStore.PlannedExercise::exerciseId).toList();
        if (!onTheDay.contains(exerciseId)) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        boolean swapBack = scope == Scope.TODAY && to.equals(exerciseId);
        if (!swapBack && !SwapOptions.of(exerciseId, onTheDay, catalog, gyms.current(account)).contains(to)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        if (scope == Scope.TODAY) {
            LocalDate monday = TodayChanges.monday(today);
            Map<UUID, TodayChanges.Change> kept = changes.week(account, monday);
            if (TodayChanges.on(TodayChanges.week(program.days(), monday, kept, shortMoves), today).stream()
                    .noneMatch(session -> session.programDayId().equals(programDayId))) {
                throw new ApiException(ErrorCode.CONFLICT);
            }
            changes.put(account, programDayId, monday, kept.getOrDefault(programDayId, TodayChanges.Change.NONE).swapped(exerciseId, to));
            return program;
        }
        List<ProgramStore.Day> days = program.days().stream().map(other -> !other.id().equals(programDayId) ? other
                : new ProgramStore.Day(other.id(), other.nameKey(), other.name(), other.weekday(), other.exercises().stream()
                        .map(move -> move.exerciseId().equals(exerciseId)
                                ? new ProgramStore.PlannedExercise(to, move.sets(), move.repMin(), move.repMax(), move.targetRir())
                                : move)
                        .toList()))
                .toList();
        ProgramStore.Program edited = programs.rewrite(account, days);
        reviewChanges.clear(account);
        return edited;
    }
}
