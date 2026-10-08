package app.keel.training;

import app.keel.engine.ActivityLevel;
import app.keel.engine.CardioPrescription;
import app.keel.engine.Consistency;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
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
}
