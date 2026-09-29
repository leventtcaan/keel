package app.keel.privacy;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.shared.AccountId;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;

/**
 * The one door out (K-214, V2): every call that carries a user's data to someone else runs through here, and only
 * this module may make an outbound call (EgressRuleTests). Data for a third-party AI needs the consent that names the
 * provider and the data, checked at the moment of sending; without it the call does not run.
 */
@Service
public class EgressGate {

    public enum Destination {
        /** A language model (M5): only with the THIRD_PARTY_AI consent (Apple 5.1.2(i)). */
        THIRD_PARTY_AI,
        /** Account housekeeping with Apple (revoking Sign in with Apple tokens on deletion): no health data. */
        APPLE_ACCOUNT
    }

    private final ConsentGate consents;

    EgressGate(ConsentGate consents) {
        this.consents = consents;
    }

    public <T> T send(AccountId account, Destination destination, Supplier<T> call) {
        if (destination == Destination.THIRD_PARTY_AI) {
            consents.require(account, ConsentKind.THIRD_PARTY_AI);
        }
        return call.get();
    }
}
