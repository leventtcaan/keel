package app.keel.measurement;

import app.keel.engine.WeighIn;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * The measurement module's API for other modules (K-206, K-212): the weight series as the engine reads it — one
 * weigh-in per local day, the day's first (H1: the morning weigh-in is the comparable one), in the user's time zone.
 */
@Service
public class Measurements {

    private final MeasurementStore store;
    private final Profiles profiles;

    Measurements(MeasurementStore store, Profiles profiles) {
        this.store = store;
        this.profiles = profiles;
    }

    /** The user's time zone: the profile's, UTC until there is one. */
    ZoneId zoneOf(AccountId account) {
        return profiles.of(account).map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
    }

    /** One weigh-in per local day from {@code from} to {@code to}, both included: that day's first. */
    public List<WeighIn> dailyWeights(AccountId account, LocalDate from, LocalDate to) {
        ZoneId zone = zoneOf(account);
        Map<LocalDate, WeighIn> firstOfDay = new LinkedHashMap<>();
        for (MeasurementStore.WeighIn weighIn : store.weighIns(account, from.atStartOfDay(zone).toInstant(),
                to.plusDays(1).atStartOfDay(zone).toInstant())) {
            LocalDate day = weighIn.measuredAt().atZone(zone).toLocalDate();
            firstOfDay.putIfAbsent(day, new WeighIn(day, weighIn.kg()));
        }
        return new ArrayList<>(firstOfDay.values());
    }
}
