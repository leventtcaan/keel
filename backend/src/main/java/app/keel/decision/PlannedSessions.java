package app.keel.decision;

import app.keel.profile.ProfileFacts;
import app.keel.shared.AccountId;
import app.keel.training.TrainingStatusReader;
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

    int perWeek(AccountId account, ProfileFacts profile) {
        return statuses.programSessionsPerWeek(account).orElse(profile.trainingDays().size());
    }
}
