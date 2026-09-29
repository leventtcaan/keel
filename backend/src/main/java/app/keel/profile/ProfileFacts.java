package app.keel.profile;

import java.time.DayOfWeek;
import java.time.ZoneId;
import java.util.Optional;

/** What other modules need of a profile: the engine's inputs and when and where the week turns (K-205, K-212). */
public record ProfileFacts(Sex sex, int heightCm, int birthYear, Optional<Activity> activity, Goal goal, DayOfWeek checkInDay,
        ZoneId timeZone) {
}
