package app.keel.decision;

import app.keel.profile.FirstCalls;
import app.keel.shared.AccountId;
import org.springframework.stereotype.Component;

/** Profile's FirstCalls (K-993): whether a weekly call was made, from the call ledger. */
@Component
class MadeFirstCalls implements FirstCalls {

    private final CallStore calls;

    MadeFirstCalls(CallStore calls) {
        this.calls = calls;
    }

    @Override
    public boolean made(AccountId account) {
        return calls.firstMadeOn(account).isPresent();
    }
}
