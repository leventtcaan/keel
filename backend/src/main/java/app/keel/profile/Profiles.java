package app.keel.profile;

import app.keel.shared.AccountId;
import java.time.ZoneId;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;

/** The profile module's API for other modules (K-205): the engine's inputs and the user's week, never the whole row. */
@Service
public class Profiles {

    private final ProfileStore store;

    Profiles(ProfileStore store) {
        this.store = store;
    }

    public Optional<ProfileFacts> of(AccountId account) {
        return store.find(account).map(profile -> new ProfileFacts(profile.sex(), profile.heightCm(), profile.birthYear(),
                Optional.ofNullable(profile.activityLevel()), profile.goal(), profile.schedule().checkInDay(),
                ZoneId.of(profile.schedule().timeZone()), Set.copyOf(profile.schedule().trainingDays())));
    }
}
