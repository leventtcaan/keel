package app.keel.profile;

import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
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
                ZoneId.of(profile.schedule().timeZone()), Set.copyOf(profile.schedule().trainingDays()), Optional.ofNullable(profile.experience())));
    }

    /**
     * The foods the user said they cannot eat (K-507: never offered). May be health data — an allergy, coeliac disease
     * (ADR-027 #14): read only behind the HEALTH_DATA consent, as the profile keeps it.
     */
    public List<String> foodsAvoided(AccountId account) {
        return store.find(account).map(ProfileController.Profile::food).map(ProfileController.Food::avoid).map(List::copyOf).orElse(List.of());
    }

    /**
     * When onboarding finished (K-990, ADR-077 Ek 2): the profile's first save. Empty without a profile, and for a profile
     * saved before this was kept — the first week of those counts from the account's first sign-in.
     */
    public Optional<Instant> onboardedAt(AccountId account) {
        return store.onboardedAt(account);
    }

    /** When the training days were last set: they are asked for from then on, at the earliest (K-512). */
    public Optional<Instant> trainingDaysSince(AccountId account) {
        return store.trainingDaysSince(account);
    }
}
