package app.keel.measurement;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Sex;
import app.keel.engine.WeightSeries;
import app.keel.engine.WeightTrend;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's measurement routes (K-206): weigh-ins, waist, photo checks, activity days and the weight trend. Every
 * one is health data (V3): the health-data consent is checked on each request, so a withdrawal stops them at once
 * (ADR-026). A record sent twice with its clientId answers 201, then 200 with the stored record.
 */
@RestController
class MeasurementController {

    record NewWeighIn(UUID clientId, Instant measuredAt, BigDecimal kg, MeasurementStore.Source source) {
    }

    record NewWaist(UUID clientId, LocalDate measuredOn, BigDecimal cm) {
    }

    record NewPhotoCheck(UUID clientId, LocalDate takenOn, MeasurementStore.Look look) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record ActivityDay(LocalDate day, Integer steps, Integer sleepMinutes, Integer activeEnergyKcal) {
    }

    record TrendPoint(LocalDate day, BigDecimal kg) {
    }

    private static final int TREND_DECIMALS = 2;

    private final MeasurementStore store;
    private final Measurements measurements;
    private final Profiles profiles;
    private final ConsentGate consent;
    private final ParameterSet parameters;

    MeasurementController(MeasurementStore store, Measurements measurements, Profiles profiles, ConsentGate consent,
            ParameterSet parameters) {
        this.store = store;
        this.measurements = measurements;
        this.profiles = profiles;
        this.consent = consent;
        this.parameters = parameters;
    }

    @PostMapping("/v1/weigh-ins")
    ResponseEntity<MeasurementStore.WeighIn> addWeighIn(AccountId account, @RequestBody NewWeighIn weighIn) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(weighIn.clientId() != null && weighIn.measuredAt() != null && weighIn.source() != null && positive(weighIn.kg()));
        return created(store.add(account, weighIn.clientId(), weighIn.measuredAt(), weighIn.kg(), weighIn.source()));
    }

    @GetMapping("/v1/weigh-ins")
    List<MeasurementStore.WeighIn> weighIns(AccountId account, @RequestParam LocalDate from, @RequestParam LocalDate to) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(!to.isBefore(from));
        ZoneId zone = measurements.zoneOf(account);
        return store.weighIns(account, from.atStartOfDay(zone).toInstant(), to.plusDays(1).atStartOfDay(zone).toInstant());
    }

    @DeleteMapping("/v1/weigh-ins/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteWeighIn(AccountId account, @PathVariable UUID id) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        if (!store.deleteWeighIn(account, id)) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
    }

    @PostMapping("/v1/waist-measurements")
    ResponseEntity<MeasurementStore.Waist> addWaist(AccountId account, @RequestBody NewWaist waist) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(waist.clientId() != null && waist.measuredOn() != null && positive(waist.cm()));
        return created(store.add(account, waist.clientId(), waist.measuredOn(), waist.cm()));
    }

    @GetMapping("/v1/waist-measurements")
    List<MeasurementStore.Waist> waists(AccountId account, @RequestParam LocalDate from, @RequestParam LocalDate to) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(!to.isBefore(from));
        return store.waists(account, from, to);
    }

    @PostMapping("/v1/photo-checks")
    ResponseEntity<MeasurementStore.PhotoCheck> addPhotoCheck(AccountId account, @RequestBody NewPhotoCheck check) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(check.clientId() != null && check.takenOn() != null && check.look() != null);
        return created(store.add(account, check.clientId(), check.takenOn(), check.look()));
    }

    @PutMapping("/v1/activity-days")
    ActivityDay putActivityDay(AccountId account, @RequestBody ActivityDay day) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(day.day() != null && notNegative(day.steps()) && notNegative(day.sleepMinutes()) && notNegative(day.activeEnergyKcal()));
        store.put(account, new MeasurementStore.ActivityDay(day.day(), day.steps(), day.sleepMinutes(), day.activeEnergyKcal()));
        // What was stored, so the answer is what a later read returns.
        MeasurementStore.ActivityDay stored = store.activityDay(account, day.day()).orElseThrow();
        return new ActivityDay(stored.day(), stored.steps(), stored.sleepMinutes(), stored.activeEnergyKcal());
    }

    /** The engine's trend (WeightTrend, trend_display_days) on the daily weights, for each day that has one. */
    @GetMapping("/v1/weight-trend")
    List<TrendPoint> trend(AccountId account, @RequestParam LocalDate from, @RequestParam LocalDate to) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        require(!to.isBefore(from));
        ProfileFacts profile = profiles.of(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        int days = parameters.forSex(Sex.valueOf(profile.sex().name())).wholeNumber(ParameterKey.TREND_DISPLAY_DAYS);
        WeightSeries series = new WeightSeries(measurements.dailyWeights(account, from.minusDays(days - 1L), to));
        List<TrendPoint> points = new ArrayList<>();
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            LocalDate on = day;
            WeightTrend.at(series, on, days)
                    .ifPresent(kg -> points.add(new TrendPoint(on, kg.setScale(TREND_DECIMALS, RoundingMode.HALF_UP).stripTrailingZeros())));
        }
        return points;
    }

    private static <T> ResponseEntity<T> created(MeasurementStore.Stored<T> stored) {
        return ResponseEntity.status(stored.created() ? HttpStatus.CREATED : HttpStatus.OK).body(stored.record());
    }

    private static boolean positive(BigDecimal value) {
        return value != null && value.signum() > 0;
    }

    private static boolean notNegative(Integer value) {
        return value == null || value >= 0;
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
