package app.keel.profile;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.Year;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The contract's /v1/profile (K-205): read it, or replace it whole. */
@RestController
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
    record Profile(Goal goal, Sex sex, Integer heightCm, Integer birthYear, Activity activityLevel, ProgramChoice programChoice,
            Schedule schedule, Food food, Units units) {
    }

    private static final Pattern CLOCK_TIME = Pattern.compile("([01][0-9]|2[0-3]):[0-5][0-9]");
    private static final int MIN_HEIGHT_CM = 100;
    private static final int MAX_HEIGHT_CM = 250;
    private static final int MIN_BIRTH_YEAR = 1900;

    private final ProfileStore store;
    private final Clock clock;

    ProfileController(ProfileStore store, Clock clock) {
        this.store = store;
        this.clock = clock;
    }

    @GetMapping
    Profile get(AccountId account) {
        return store.find(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    @PutMapping
    Profile put(AccountId account, @RequestBody Profile profile) {
        if (!valid(profile)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        store.save(account, profile);
        return store.find(account).orElseThrow(); // what was stored, so the answer is what a GET returns

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
        return height && born && days && time && knownZone(schedule.timeZone());
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
