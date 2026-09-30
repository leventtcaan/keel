package app.keel.profile;

import java.time.DayOfWeek;
import java.time.ZoneId;
import java.util.Optional;
import java.util.Set;

/**
 * What other modules need of a profile: the engine's inputs, when and where the week turns (K-205, K-212), and the days
 * the user trains (the targets' sessions per week, K-216).
 */
public record ProfileFacts(Sex sex, int heightCm, int birthYear, Optional<Activity> activity, Goal goal, DayOfWeek checkInDay,
        ZoneId timeZone, Set<DayOfWeek> trainingDays) {

    public ProfileFacts {
        trainingDays = Set.copyOf(trainingDays);
    }
}
