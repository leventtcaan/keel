package app.keel.decision;

import app.keel.engine.Action;
import app.keel.engine.SafetyHold;
import java.util.Comparator;
import java.util.List;

/**
 * Whether a hard stop holds now (K-229, ADR-028 #23), read from the calls themselves in the order they were made: an
 * applied hard stop starts it, the next applied call that opens a deficit ends it. A call never applied, or undone, did
 * not change the plan and changes nothing here. No flag is kept beside the calls: they are the record (K-212). Only their
 * outcomes are read, not their snapshots (K-229 review).
 */
final class SafetyHolds {

    private SafetyHolds() {
    }

    static boolean from(List<CallStore.Outcome> calls) {
        boolean held = false;
        for (CallStore.Outcome call : calls.stream().sorted(Comparator.comparing(CallStore.Outcome::decidedAt)).toList()) {
            if (call.application() != CallStore.Application.APPLIED) {
                continue;
            }
            Action action = DecisionJson.action(call.decision());
            if (action instanceof Action.HardStop) {
                held = true;
            } else if (SafetyHold.opensDeficit(action)) {
                held = false;
            }
        }
        return held;
    }
}
