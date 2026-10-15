package app.keel.training;

import app.keel.engine.Parameters;
import app.keel.engine.ReturnLoad;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

/**
 * Back after a long break today (K-531, ADR-043 #75), read once for the program and for the call's held move (K-1009): the
 * account's last session before today a long break ago ({@link ReturnLoad#afterBreak}). A target written before today is then
 * shown a step lighter, before any hold of the load; a target the session back wrote today is that session's own.
 */
record BackAfterBreak(boolean longBreak, LocalDate today, ZoneId zone) {

    /** {@code lastSession}: the user's day of the last session before today, if any. */
    static BackAfterBreak of(Optional<LocalDate> lastSession, LocalDate today, ZoneId zone, Parameters parameters) {
        return new BackAfterBreak(lastSession.filter(day -> ReturnLoad.afterBreak(day, today, parameters)).isPresent(), today, zone);
    }

    /** Whether the target shown for this planned exercise today is stepped back: one from before today on a day back after a long break. */
    boolean steppedBack(ProgramStore.PlannedExercise planned) {
        return longBreak && planned.nextLoadKg() != null && planned.lastLoadKg() != null && planned.nextFrom() != null
                && planned.nextFrom().atZone(zone).toLocalDate().isBefore(today);
    }
}
