package app.keel.decision;

import app.keel.profile.ProfileFacts;
import app.keel.shared.AccountId;
import app.keel.training.ProgramPeriod;
import app.keel.training.TrainingStatusReader;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.function.Function;
import org.springframework.stereotype.Component;

/**
 * The sessions a week the plan asks for (K-530, ADR-043 #74), in consistency's weeks, the first eight weeks and the
 * targets alike. The plan is the program: one session a program day, on a weekday or not — the count its missed weeks
 * are judged against too (TrainingStatusReader.status). The profile's training days only without a program. Which days
 * a missed session is asked about stays K-527's rule (PromptController.today).
 *
 * <p>A week gone by keeps the program it had (K-535, ADR-045 #79): consistency, adherence and the first eight weeks read
 * {@link #byWeek}; the first eight weeks' risk asks whether the week just over asked training ({@link #askedSince}); the
 * targets and this week's words read today's ({@link #perWeek}). The missed plan weeks are counted only from a week the
 * program in force was in force from the start of (TrainingStatuses.judgedFrom), so they too are the program's own.
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
        return fewestBetween(history, profileDays, monday.atStartOfDay(zone).toInstant(), monday.plusWeeks(1).atStartOfDay(zone).toInstant());
    }

    /** The fewest sessions any program asked from {@code start} on (K-535: the first eight weeks' week just over, to now). */
    static int fewestSince(List<ProgramPeriod> history, int profileDays, Instant start) {
        return fewestBetween(history, profileDays, start, Instant.MAX);
    }

    private static int fewestBetween(List<ProgramPeriod> history, int profileDays, Instant start, Instant end) {
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

    /**
     * The sessions each week asks, by its Monday (K-535): what consistency, adherence and the first eight weeks judge a
     * week by. The history is read once, here.
     */
    Function<LocalDate, Integer> byWeek(AccountId account, ProfileFacts profile) {
        List<ProgramPeriod> history = statuses.programHistory(account);
        int profileDays = profile.trainingDays().size();
        return monday -> inWeek(history, profileDays, monday, profile.timeZone());
    }

    /** Whether training was asked all along from {@code day} (home zone) to now: by every program since, or the profile. */
    boolean askedSince(AccountId account, ProfileFacts profile, LocalDate day) {
        return fewestSince(statuses.programHistory(account), profile.trainingDays().size(), day.atStartOfDay(profile.timeZone()).toInstant()) > 0;
    }

    /** The sessions a week the plan asks from now on: the targets (PlanTargets) and whether training is asked at all. */
    int perWeek(AccountId account, ProfileFacts profile) {
        return statuses.programSessionsPerWeek(account).orElse(profile.trainingDays().size());
    }
}
