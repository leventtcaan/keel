package app.keel.profile;

import java.time.DayOfWeek;
import java.time.ZoneId;
import java.util.Optional;
import java.util.Set;

/**
 * What other modules need of a profile: the engine's inputs, when and where the week turns (K-205, K-212), the days the
 * user said they train — what the plan goes by without a program (K-527: which days; K-530: how many) — and how long they
 * have trained, when asked (the first week's "add a day", ADR-077 #4).
 */
public record ProfileFacts(Sex sex, int heightCm, int birthYear, Optional<Activity> activity, Goal goal, DayOfWeek checkInDay,
        ZoneId timeZone, Set<DayOfWeek> trainingDays, Optional<Experience> experience) {

    public ProfileFacts {
        trainingDays = Set.copyOf(trainingDays);
        java.util.Objects.requireNonNull(experience, "experience");
    }

    /** A profile without the experience answer (made before it was asked). */
    public ProfileFacts(Sex sex, int heightCm, int birthYear, Optional<Activity> activity, Goal goal, DayOfWeek checkInDay, ZoneId timeZone,
            Set<DayOfWeek> trainingDays) {
        this(sex, heightCm, birthYear, activity, goal, checkInDay, timeZone, trainingDays, Optional.empty());
    }
}
