package app.keel.profile;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Year;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The contract's /v1/profile (K-205): read it, or replace it whole. */
@RestController
@EnableConfigurationProperties(ProfileLimits.class)
@RequestMapping("/v1/profile")
class ProfileController {

    enum ProgramChoice { BUILD_ONE_FOR_ME, BRING_MY_OWN }

    enum Units { METRIC, IMPERIAL }

    enum SessionsLastMonth { NONE_OR_ONE, TWO_TO_THREE, FOUR, FIVE_OR_MORE }

    /** Contract Schedule. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Schedule(List<DayOfWeek> trainingDays, String usualTrainingTime, SessionsLastMonth sessionsLastMonth,
            DayOfWeek checkInDay, String timeZone) {
    }

    /** Contract FoodPreferences. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Food(List<String> avoid, String budgetNote) {
    }

    /** Contract Profile. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Profile(Goal goal, Sex sex, Integer heightCm, Integer birthYear, Activity activityLevel, Experience experience,
            ProgramChoice programChoice, Schedule schedule, Food food, Units units) {
    }

    private static final Pattern CLOCK_TIME = Pattern.compile("([01][0-9]|2[0-3]):[0-5][0-9]");
    private static final int MIN_HEIGHT_CM = 100;
    private static final int MAX_HEIGHT_CM = 250;
    private static final int MIN_BIRTH_YEAR = 1900;

    private final ProfileStore store;
    private final Clock clock;
    private final ProfileLimits limits;
    private final ConsentGate consent;
    private final ObjectProvider<FirstCalls> firstCalls;

    ProfileController(ProfileStore store, Clock clock, ProfileLimits limits, ConsentGate consent, ObjectProvider<FirstCalls> firstCalls) {
        this.firstCalls = firstCalls;
        this.store = store;
        this.clock = clock;
        this.limits = limits;
        this.consent = consent;
    }

    @GetMapping
    Profile get(AccountId account) {
        return shown(account, store.find(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND)));
    }

    /**
     * An adult's profile (K-225). The foods one cannot eat may be health data — an allergy, coeliac disease (GDPR Art.
     * 9): kept and read only with the HEALTH_DATA consent (ADR-027 #14).
     */
    @PutMapping
    Profile put(AccountId account, @RequestBody Profile profile) {
        if (!valid(profile)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        if (profile.food() != null && profile.food().avoid() != null && !profile.food().avoid().isEmpty()) {
            consent.require(account, ConsentKind.HEALTH_DATA);
        }
        store.save(account, consent.granted(account, ConsentKind.HEALTH_DATA) ? profile : keepingTheStoredAvoid(account, profile));
        return shown(account, store.find(account).orElseThrow()); // what was stored, so the answer is what a GET returns
    }

    /**
     * The plan was shown (K-993, ADR-077 Ek 3): the first time is kept, by the server's clock; the first week counts from
     * that day. Sent again, or once the first call is made, nothing changes. NOT_FOUND without a profile.
     */
    @PutMapping("/plan-seen")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void planSeen(AccountId account) {
        if (store.find(account).isEmpty()) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        // After the first call the first week is closed: a plan seen now (an old account, a late send) moves nothing (#526).
        FirstCalls calls = firstCalls.getIfUnique();
        if (calls == null || !calls.made(account)) {
            store.planSeen(account);
        }
    }

    /**
     * Without the consent the user cannot see the stored list, so a PUT that leaves it out (settings PUT the whole
     * profile) is not a wish to empty it: it stays as stored (ADR-030 #27). Withdrawing the consent deletes it (K-231),
     * so what stays here is a list kept under a consent closed by a revised text, not withdrawn.
     */
    private Profile keepingTheStoredAvoid(AccountId account, Profile profile) {
        List<String> stored = store.find(account).map(Profile::food).map(Food::avoid).orElse(null);
        if (stored == null) {
            return profile;
        }
        Food food = new Food(stored, profile.food() == null ? null : profile.food().budgetNote());
        return new Profile(profile.goal(), profile.sex(), profile.heightCm(), profile.birthYear(), profile.activityLevel(), profile.experience(),
                profile.programChoice(), profile.schedule(), food, profile.units());
    }

    // Without the consent (never given, or taken back) the foods to avoid are not read out.
    private Profile shown(AccountId account, Profile profile) {
        if (profile.food() == null || profile.food().avoid() == null || consent.granted(account, ConsentKind.HEALTH_DATA)) {
            return profile;
        }
        Food food = profile.food().budgetNote() == null ? null : new Food(null, profile.food().budgetNote());
        return new Profile(profile.goal(), profile.sex(), profile.heightCm(), profile.birthYear(), profile.activityLevel(), profile.experience(),
                profile.programChoice(), profile.schedule(), food, profile.units());
    }

    // The contract's limits (openapi.yaml › Profile, Schedule); enum values are checked by the JSON reader already.
    private boolean valid(Profile profile) {
        Schedule schedule = profile.schedule();
        if (profile.goal() == null || profile.sex() == null || profile.heightCm() == null || profile.birthYear() == null
                || profile.programChoice() == null || profile.units() == null || schedule == null
                || schedule.trainingDays() == null || schedule.checkInDay() == null || schedule.timeZone() == null) {
            return false;
        }
        boolean height = profile.heightCm() >= MIN_HEIGHT_CM && profile.heightCm() <= MAX_HEIGHT_CM;
        boolean born = profile.birthYear() >= MIN_BIRTH_YEAR && profile.birthYear() <= Year.now(clock).getValue();
        boolean days = !schedule.trainingDays().contains(null) && new HashSet<>(schedule.trainingDays()).size() == schedule.trainingDays().size();
        boolean time = schedule.usualTrainingTime() == null || CLOCK_TIME.matcher(schedule.usualTrainingTime()).matches();
        return height && born && days && time && knownZone(schedule.timeZone())
                && AgeGate.certainlyAtLeast(profile.birthYear(), LocalDate.now(clock.withZone(ZoneId.of(schedule.timeZone()))), limits.adultAge());
    }

    private static boolean knownZone(String zone) {
        try {
            ZoneId.of(zone);
            return true;
        } catch (DateTimeException unknown) {
            return false;
        }
    }
}
