package app.keel.decision;

import app.keel.engine.Action;

/**
 * When the weigh-in week is shown (ADR-089 #1, contract FirstWeeks.weighInWeek): until a call has read the scale. A "no decision
 * yet" has not. Nor has the call that closes the first week: it reads the sessions planned and done, never the weight (K-962,
 * ADR-077 #4, U8), so the weeks after it, which the weight call still waits for, keep the count. Any other call has read it,
 * the hard stop too (it rests on the trend).
 */
final class WeighInWeekFacts {

    private WeighInWeekFacts() {
    }

    /** Whether this call, the account's latest, read the scale: from here on the card no longer counts the week's weigh-ins. */
    static boolean readTheScale(CallStore.Call call) {
        if (DecisionJson.action(call.decision()) instanceof Action.NoDecisionYet) {
            return false;
        }
        boolean closedTheFirstWeek = call.snapshot() != null && call.snapshot().firstWeek() != null;
        return !closedTheFirstWeek || DecisionJson.action(call.decision()) instanceof Action.HardStop;
    }
}
