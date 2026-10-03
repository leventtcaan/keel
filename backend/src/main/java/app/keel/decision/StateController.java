package app.keel.decision;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.engine.DeclaredContext;
import app.keel.engine.BusyWeekDose;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Sex;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ApiLimits;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * State mode (K-516, ADR-038): /v1/state — what life brought, declared by the user (U9: never asked for), from today on
 * their calendar. Health data: behind the HEALTH_DATA consent, as every /v1/decisions route.
 */
@RestController
class StateController {

    record NewState(String kind, LocalDate until) {
    }

    /** Contract DeclaredState; a busy week with its least dose (K-528). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record DeclaredState(DeclaredContext kind, LocalDate since, LocalDate until, BusyDose busyDose) {

        /** As declared, nothing derived: what an export holds (the dose is the engine's reading, not the user's data). */
        static DeclaredState of(StateStore.State state) {
            return new DeclaredState(state.kind(), state.startsOn(), state.endsOn().orElse(null), null);
        }
    }

    /** Contract BusyDose. */
    record BusyDose(int sessions, int setsPerExercise, boolean keepLoad) {
    }

    /**
     * A busy week's least dose (K-528, ADR-038 #7; H9 §2): with BUSY only — the sessions, the sets per exercise, the load
     * kept — by the user's age this year (the older dose from busy_min_older_age; a year's precision is the study's).
     */
    static Optional<BusyDose> busyDose(DeclaredContext kind, int birthYear, LocalDate today, Parameters parameters) {
        if (kind != DeclaredContext.BUSY) {
            return Optional.empty();
        }
        BusyWeekDose dose = BusyWeekDose.of(today.getYear() - birthYear, parameters);
        return Optional.of(new BusyDose(dose.sessions(), dose.setsPerExercise(), dose.keepLoad()));
    }

    private final StateStore states;
    private final Profiles profiles;
    private final ConsentGate consent;
    private final ApiLimits api;
    private final Clock clock;
    private final ParameterSet parameters;

    StateController(StateStore states, Profiles profiles, ConsentGate consent, ApiLimits api, Clock clock, ParameterSet parameters) {
        this.parameters = parameters;
        this.states = states;
        this.profiles = profiles;
        this.consent = consent;
        this.api = api;
        this.clock = clock;
    }

    @GetMapping("/v1/state")
    DeclaredState current(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        LocalDate today = today(account);
        return states.current(account, today).map(state -> shown(account, state, today)).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    @PutMapping("/v1/state")
    DeclaredState declare(AccountId account, @RequestBody NewState declared) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        LocalDate today = today(account);
        DeclaredContext kind = Arrays.stream(DeclaredContext.values()).filter(known -> known.name().equals(declared.kind())).findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED));
        if (declared.until() != null && !api.range(today, declared.until())) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        return shown(account, states.declare(account, kind, today, Optional.ofNullable(declared.until()), clock.instant()), today);
    }

    @DeleteMapping("/v1/state")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void back(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        states.end(account, today(account));
    }

    private DeclaredState shown(AccountId account, StateStore.State state, LocalDate today) {
        ProfileFacts profile = profiles.of(account).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        Parameters forUser = parameters.forSex(Sex.valueOf(profile.sex().name()));
        return new DeclaredState(state.kind(), state.startsOn(), state.endsOn().orElse(null),
                busyDose(state.kind(), profile.birthYear(), today, forUser).orElse(null));
    }

    /** Today on the user's calendar; without a profile there is none (CONFLICT, as a check-in). */
    private LocalDate today(AccountId account) {
        ProfileFacts profile = profiles.of(account).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        return LocalDate.now(clock.withZone(profile.timeZone()));
    }
}
