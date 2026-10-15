package app.keel.training;

import app.keel.engine.ActivityLevel;
import app.keel.engine.CardioPrescription;
import app.keel.engine.Consistency;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * This week's cardio (K-959, ADR-074): which prescription the program carries, on which training days, and the week its
 * sessions are counted in.
 */
final class CardioWeek {

    private CardioWeek() {
    }

    /** The days the weights are on: the program's weekdays, the profile's when it puts none on a weekday (K-527). */
    static Set<DayOfWeek> trainingDays(ProgramStore.Program program, Set<DayOfWeek> profileDays) {
        Set<DayOfWeek> weekdays = program.days().stream().map(ProgramStore.Day::weekday).filter(Objects::nonNull).collect(Collectors.toUnmodifiableSet());
        return weekdays.isEmpty() ? Set.copyOf(profileDays) : weekdays;
    }

    /**
     * The user's own if they set one, whatever the phase and the days (ADR-074 #4: the engine never overwrites it), else
     * the engine's default for the phase in force (#1); none without a phase.
     */
    static Optional<CardioPrescription> prescription(Optional<CardioPrescription> userSet, Optional<Phase> phase, Set<DayOfWeek> trainingDays,
            Optional<ActivityLevel> activity, Parameters parameters) {
        return userSet.or(() -> phase.flatMap(inForce -> CardioPrescription.forWeek(inForce, trainingDays, activity, Optional.empty(), parameters)));
    }

    /** The Monday the week of {@code today} begins on: the weeks the weekly consistency counts (Consistency.WEEK_STARTS_ON). */
    static LocalDate weekOf(LocalDate today) {
        return today.with(TemporalAdjusters.previousOrSame(Consistency.WEEK_STARTS_ON));
    }

    /**
     * The days of one week with a cardio session logged, and the record of today (K-1019). {@code doneThisWeek} is the
     * length of {@code days} and nothing else, so the "1 of 3 this week" and the days the app marks cannot part.
     */
    record LoggedWeek(List<LocalDate> days, Optional<CardioStore.Logged> today) {

        int doneThisWeek() {
            return days.size();
        }
    }

    /**
     * The week of {@code monday} (Monday to Sunday) in the sessions given, walked once: two sessions on one day, a typed one
     * and the watch's, are that day (a day, as the engine's "at most one a day"); a session of another week is not counted.
     * Today's record is the typed session if there is one, because that is the one the user can take back (an Apple Health
     * session is not taken back); of several typed ones, always the same, the lowest id, so taking them back goes one by one.
     */
    static LoggedWeek logged(List<CardioStore.Logged> sessions, LocalDate monday, LocalDate today) {
        LocalDate nextMonday = monday.plusWeeks(1);
        List<CardioStore.Logged> inWeek = sessions.stream().filter(session -> !session.day().isBefore(monday) && session.day().isBefore(nextMonday)).toList();
        List<LocalDate> days = inWeek.stream().map(CardioStore.Logged::day).distinct().sorted().toList();
        Optional<CardioStore.Logged> record = inWeek.stream().filter(session -> session.day().equals(today))
                .min(Comparator.comparing((CardioStore.Logged session) -> session.source() != CardioStore.Source.MANUAL)
                        .thenComparing(CardioStore.Logged::id));
        return new LoggedWeek(days, record);
    }
}
