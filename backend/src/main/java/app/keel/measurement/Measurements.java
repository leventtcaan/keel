package app.keel.measurement;

import app.keel.engine.CheckIn;
import app.keel.engine.WaistTrend;
import app.keel.engine.WeighIn;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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

    /**
     * One weigh-in per local day from {@code from} to {@code to}, both included: that day's first. What the engine and
     * the tallies read: an imported weigh-in (IMPORT) is not among them — imported history is seen, not decided on (K-615,
     * ADR-053).
     */
    public List<WeighIn> dailyWeights(AccountId account, LocalDate from, LocalDate to) {
        return daily(account, from, to, false);
    }

    /** The same days with the imported history too: for the trend the user sees (K-616). */
    List<WeighIn> dailyWeightsWithImported(AccountId account, LocalDate from, LocalDate to) {
        return daily(account, from, to, true);
    }

    private List<WeighIn> daily(AccountId account, LocalDate from, LocalDate to, boolean imported) {
        ZoneId zone = zoneOf(account);
        Map<LocalDate, WeighIn> firstOfDay = new LinkedHashMap<>();
        for (MeasurementStore.WeighIn weighIn : store.weighIns(account, from.atStartOfDay(zone).toInstant(),
                to.plusDays(1).atStartOfDay(zone).toInstant(), imported)) {
            LocalDate day = weighIn.measuredAt().atZone(zone).toLocalDate();
            firstOfDay.putIfAbsent(day, new WeighIn(day, weighIn.kg()));
        }
        return new ArrayList<>(firstOfDay.values());
    }

    /** The last weight the user gave, however long ago (the targets' macros, K-216); not an imported one (ADR-053). */
    public Optional<BigDecimal> latestWeightKg(AccountId account) {
        return store.latestKg(account);
    }

    /** The step count of each day that has one, from {@code from} to {@code to}, both included (K-220). */
    public Map<LocalDate, Integer> stepsByDay(AccountId account, LocalDate from, LocalDate to) {
        Map<LocalDate, Integer> steps = new LinkedHashMap<>();
        store.activityDays(account, from, to).stream().filter(day -> day.steps() != null).forEach(day -> steps.put(day.day(), day.steps()));
        return steps;
    }

    /**
     * The latest look picked from {@code from} to {@code to}, both included (K-224): its level. Two on the latest day (no
     * time to order them): the lower, the side the safety rules read most protectively (H8 C).
     */
    public Optional<Integer> latestLookLevel(AccountId account, LocalDate from, LocalDate to) {
        return latestLevel(store.bodyLooks(account), from, to);
    }

    static Optional<Integer> latestLevel(List<MeasurementStore.BodyLook> looks, LocalDate from, LocalDate to) {
        List<MeasurementStore.BodyLook> inDays = looks.stream().filter(look -> !look.takenOn().isBefore(from) && !look.takenOn().isAfter(to)).toList();
        return inDays.stream().map(MeasurementStore.BodyLook::takenOn).max(LocalDate::compareTo)
                .flatMap(latest -> inDays.stream().filter(look -> look.takenOn().equals(latest)).map(MeasurementStore.BodyLook::level)
                        .min(Integer::compareTo));
    }

    /** Waist measurements from {@code from} to {@code to}, both included, for the engine's WaistTrend (K-213). */
    public List<WaistTrend.Reading> waists(AccountId account, LocalDate from, LocalDate to) {
        return store.waists(account, from, to).stream().map(waist -> new WaistTrend.Reading(waist.measuredOn(), waist.cm())).toList();
    }

    /** The latest photo check's conclusion in the days given, as the phone compared it (V1: the photo stays on the phone). */
    public Optional<CheckIn.Look> photoLook(AccountId account, LocalDate from, LocalDate to) {
        return latestLook(store.photoChecks(account), from, to);
    }

    /** The latest day's verdict; two checks that disagree on that day say nothing (the day has no time to order them). */
    static Optional<CheckIn.Look> latestLook(List<MeasurementStore.PhotoCheck> checks, LocalDate from, LocalDate to) {
        List<MeasurementStore.PhotoCheck> inDays = checks.stream().filter(check -> !check.takenOn().isBefore(from) && !check.takenOn().isAfter(to))
                .toList();
        return inDays.stream().map(MeasurementStore.PhotoCheck::takenOn).max(LocalDate::compareTo)
                .map(latest -> inDays.stream().filter(check -> check.takenOn().equals(latest)).map(MeasurementStore.PhotoCheck::look).distinct().toList())
                .filter(looks -> looks.size() == 1)
                .map(looks -> CheckIn.Look.valueOf(looks.getFirst().name()));
    }
}
