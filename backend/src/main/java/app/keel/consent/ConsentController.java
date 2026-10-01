package app.keel.consent;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The contract's /v1/consents (K-204). */
@RestController
@RequestMapping("/v1/consents")
@EnableConfigurationProperties(ConsentProperties.class)
class ConsentController {

    /** Contract ConsentGrant. */
    record Grant(String textVersion, String provider, List<String> dataTypes) {
    }

    /** Contract Consent. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Consent(ConsentKind kind, String status, String textVersion, String provider, List<String> dataTypes,
            Instant grantedAt, Instant withdrawnAt) {

        static Consent of(ConsentKind kind, Optional<ConsentEvents.Event> latest) {
            return latest.map(event -> event.action() == ConsentEvents.Action.GRANTED
                    ? new Consent(kind, "GRANTED", event.textVersion(), event.provider(), event.dataTypes(), event.at(), null)
                    : new Consent(kind, "WITHDRAWN", event.textVersion(), event.provider(), event.dataTypes(), null, event.at()))
                    .orElse(new Consent(kind, "NEVER_ASKED", null, null, null, null, null));
        }
    }

    private final ConsentEvents events;
    private final ConsentProperties properties;
    private final ApplicationEventPublisher publisher;

    ConsentController(ConsentEvents events, ConsentProperties properties, ApplicationEventPublisher publisher) {
        this.events = events;
        this.properties = properties;
        this.publisher = publisher;
    }

    @GetMapping
    List<Consent> list(AccountId account) {
        return Arrays.stream(ConsentKind.values()).map(kind -> Consent.of(kind, events.latest(account, kind))).toList();
    }

    @PutMapping("/{kind}")
    @Transactional
    Consent grant(AccountId account, @PathVariable String kind, @RequestBody Grant grant) {
        ConsentKind consent = kind(kind);
        // To the current text; the AI consent names exactly the provider and data the server uses (Apple 5.1.2(i), V2),
        // the other two name neither.
        if (!properties.current(consent, grant.textVersion(), grant.provider(), grant.dataTypes())) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        return Consent.of(consent, Optional.of(events.append(account, consent, ConsentEvents.Action.GRANTED,
                grant.textVersion(), grant.provider(), grant.dataTypes())));
    }

    /**
     * Withdraws the consent and, in this transaction, deletes the data it covered (K-231): the modules handle
     * {@link ConsentWithdrawn} before this commits, so a failure anywhere undoes the whole withdrawal and it can be asked
     * again. Irreversible, so it must be confirmed.
     */
    @DeleteMapping("/{kind}")
    @Transactional
    Consent withdraw(AccountId account, @PathVariable String kind, @RequestParam(defaultValue = "false") boolean confirmDataDeletion) {
        ConsentKind consent = kind(kind);
        Optional<ConsentEvents.Event> latest = events.latest(account, consent);
        if (latest.isEmpty() || latest.get().action() != ConsentEvents.Action.GRANTED) {
            return Consent.of(consent, latest); // nothing given, nothing to withdraw
        }
        if (consent.coversStoredData() && !confirmDataDeletion) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        ConsentEvents.Event given = latest.get();
        ConsentEvents.Event withdrawn = events.append(account, consent, ConsentEvents.Action.WITHDRAWN, given.textVersion(),
                given.provider(), given.dataTypes());
        publisher.publishEvent(new ConsentWithdrawn(account, consent));
        return Consent.of(consent, Optional.of(withdrawn));
    }

    private static ConsentKind kind(String name) {
        return Arrays.stream(ConsentKind.values()).filter(kind -> kind.name().equals(name)).findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED));
    }
}
