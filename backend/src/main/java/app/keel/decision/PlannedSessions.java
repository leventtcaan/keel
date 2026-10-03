package app.keel.decision;

import app.keel.profile.ProfileFacts;
import app.keel.shared.AccountId;
import app.keel.training.ProgramPeriod;
import app.keel.training.TrainingStatusReader;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * The sessions a week the plan asks for (K-530, ADR-043 #74), in consistency's weeks, the first eight weeks and the
 * targets alike. The plan is the program: one session a program day, on a weekday or not — the count its missed weeks
 * are judged against too (TrainingStatusReader.status). The profile's training days only without a program. Which days
 * a missed session is asked about stays K-527's rule (PromptController.today).
 */
@Component
class PlannedSessions {

    private final TrainingStatusReader statuses;

    PlannedSessions(TrainingStatusReader statuses) {
        this.statuses = statuses;
    }

    /**
     * The sessions the week of {@code monday} asks (K-535, ADR-045 #79): the program in force when it began — the profile's
     * days before the first — or, if the program changed during it, the fewest any of them asked (U7: a change mid-week
     * never asks more of that week than was planned). {@code history} oldest first; of two at one instant, the later.
     */
    static int inWeek(List<ProgramPeriod> history, int profileDays, LocalDate monday, ZoneId zone) {
        Instant start = monday.atStartOfDay(zone).toInstant();
        Instant end = monday.plusWeeks(1).atStartOfDay(zone).toInstant();
        int fewest = profileDays;
        for (ProgramPeriod period : history) {
            if (!period.from().isAfter(start)) {
                fewest = period.sessionsPerWeek(); // in force when the week began, until a later one
            } else if (period.from().isBefore(end)) {
                fewest = Math.min(fewest, period.sessionsPerWeek());
            }
        }
        return fewest;
    }

    int perWeek(AccountId account, ProfileFacts profile) {
        return statuses.programSessionsPerWeek(account).orElse(profile.trainingDays().size());
    }
}
