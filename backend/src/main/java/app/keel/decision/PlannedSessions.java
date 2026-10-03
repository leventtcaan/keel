package app.keel.decision;

import app.keel.profile.ProfileFacts;
import app.keel.shared.AccountId;
import app.keel.training.TrainingStatusReader;
import org.springframework.stereotype.Component;

/**
 * The sessions a week the plan asks for (K-530, ADR-043 #74): the plan is the program, so its days — in consistency's
 * weeks, the first eight weeks and the targets alike, the number its missed weeks are counted against too. Without a
 * program, the profile's training days (as K-527's missed session).
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
