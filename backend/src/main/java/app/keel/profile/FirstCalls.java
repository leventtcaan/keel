package app.keel.profile;

import app.keel.shared.AccountId;

/**
 * Whether the account's first weekly call was made (K-993, ADR-077 Ek 3): the plan seen after it moves nothing. Calls are
 * decision's, and decision depends on profile, so profile asks through this interface and decision provides the bean (as
 * nutrition's DailyTargets). Without a provider, no call is known.
 */
public interface FirstCalls {

    boolean made(AccountId account);
}
