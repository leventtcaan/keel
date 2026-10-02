package app.keel.decision;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.engine.DeclaredContext;
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

    /** Contract DeclaredState. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record DeclaredState(DeclaredContext kind, LocalDate since, LocalDate until) {

        static DeclaredState of(StateStore.State state) {
            return new DeclaredState(state.kind(), state.startsOn(), state.endsOn().orElse(null));
        }
    }

    private final StateStore states;
    private final Profiles profiles;
    private final ConsentGate consent;
    private final ApiLimits api;
    private final Clock clock;

    StateController(StateStore states, Profiles profiles, ConsentGate consent, ApiLimits api, Clock clock) {
        this.states = states;
        this.profiles = profiles;
        this.consent = consent;
        this.api = api;
        this.clock = clock;
    }

    @GetMapping("/v1/state")
    DeclaredState current(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        return states.current(account, today(account)).map(DeclaredState::of).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
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
        return DeclaredState.of(states.declare(account, kind, today, Optional.ofNullable(declared.until()), clock.instant()));
    }

    @DeleteMapping("/v1/state")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void back(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        states.end(account, today(account));
    }

    /** Today on the user's calendar; without a profile there is none (CONFLICT, as a check-in). */
    private LocalDate today(AccountId account) {
        ProfileFacts profile = profiles.of(account).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        return LocalDate.now(clock.withZone(profile.timeZone()));
    }
}
