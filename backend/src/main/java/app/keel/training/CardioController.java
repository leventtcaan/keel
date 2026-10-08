package app.keel.training;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ApiLimits;
import app.keel.shared.ErrorCode;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/cardio-sessions (K-959, ADR-074 #6): a cardio session done, typed or read from an Apple Health
 * workout. It counts in its week's cardio and nowhere else: not in the food budget (#5, K-30), not in the weekly
 * consistency, which counts weight sessions.
 */
@RestController
@EnableConfigurationProperties(CardioController.CardioLimits.class)
class CardioController {

    /** What a cardio session can be (keel.training.cardio): the contract's maximums. */
    @ConfigurationProperties("keel.training.cardio")
    record CardioLimits(int maxMinutes, int maxActiveEnergyKcal) {

        boolean minutes(Integer minutes) {
            return minutes != null && minutes >= 1 && minutes <= maxMinutes;
        }
    }

    record NewCardioSession(UUID clientId, LocalDate day, Integer minutes, CardioStore.Source source, Integer activeEnergyKcal) {
    }

    private final CardioStore store;
    private final ConsentGate consent;
    private final CardioLimits limits;
    private final ApiLimits api;

    CardioController(CardioStore store, ConsentGate consent, CardioLimits limits, ApiLimits api) {
        this.store = store;
        this.consent = consent;
        this.limits = limits;
        this.api = api;
    }

    /**
     * Active energy only as an Apple Watch measured it, so only from Apple Health (ADR-074 #5: typed calories are no
     * measurement); it is health data, so it needs the health data consent. The session itself is training data.
     */
    @PostMapping("/v1/cardio-sessions")
    ResponseEntity<CardioStore.Logged> log(AccountId account, @RequestBody NewCardioSession session) {
        Integer energy = session.activeEnergyKcal();
        require(session.clientId() != null && api.day(session.day()) && limits.minutes(session.minutes()) && session.source() != null
                && (energy == null || session.source() == CardioStore.Source.APPLE_HEALTH && energy >= 0 && energy <= limits.maxActiveEnergyKcal()));
        if (energy != null) {
            consent.require(account, ConsentKind.HEALTH_DATA);
        }
        CardioStore.Stored stored = store.log(account, session.clientId(), session.day(), session.minutes(), session.source(), energy);
        return ResponseEntity.status(stored.created() ? HttpStatus.CREATED : HttpStatus.OK).body(stored.session());
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
