package app.keel.consent;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import org.springframework.stereotype.Service;

/**
 * Whether a feature may run for an account (K-204): a feature that needs a consent asks here first, every time, so a
 * withdrawal stops it at once. {@link ConsentWithdrawn} tells modules that keep something running (a sync, say).
 */
@Service
public class ConsentGate {

    private final ConsentEvents events;

    ConsentGate(ConsentEvents events) {
        this.events = events;
    }

    public boolean granted(AccountId account, ConsentKind kind) {
        return events.latest(account, kind).filter(event -> event.action() == ConsentEvents.Action.GRANTED).isPresent();
    }

    /** CONSENT_REQUIRED unless the consent is given now. */
    public void require(AccountId account, ConsentKind kind) {
        if (!granted(account, kind)) {
            throw new ApiException(ErrorCode.CONSENT_REQUIRED);
        }
    }
}
