package app.keel.engine;

import java.util.List;

/**
 * After the hard stop (ADR-020 L-1) the plan builds at maintenance at least. How long that holds is ADR-028 #23 (Levent,
 * option b): before any call opens a deficit again — a cut, a step down, a mini cut — the cycle question is asked again.
 * "Resolved" lets the call through; no answer waits ("not yet": the check-in then asks, K-213); "still stopped" never
 * reaches here — the safety net makes it the hard stop again. The hold comes from the calls applied since (decision).
 */
public final class SafetyHold {

    /** The reason of a call waiting for the cycle question; the check-in asks it when it sees this (decision). */
    public static final RuleId CYCLE_CHECK_NEEDED = new RuleId("cycle_check_needed");
    private static final Source REDS_TIERS = new Source("arastirma/ham/J1-cinsiyet.md#C6", SourceTag.LITERATURE);
    private static final CopyKey WAITING = new CopyKey("decision.no_decision_yet.cycle_check_needed");

    private SafetyHold() {
    }

    /** The candidate call, or — held, unresolved, and it would open a deficit — "not yet", waiting for the answer. */
    static Decision check(Decision candidate, Snapshot snapshot) {
        if (!snapshot.safetyHold() || snapshot.cycleResolved() || !opensDeficit(candidate.action())) {
            return candidate;
        }
        return new Decision(new Action.NoDecisionYet(), List.of(new Reason(CYCLE_CHECK_NEEDED, REDS_TIERS)), Confidence.LOW,
                candidate.nextReview(), WAITING);
    }

    /** Whether a call takes the plan under maintenance again: a cut, a step down, a mini cut. The decision module reads the hold with it. */
    public static boolean opensDeficit(Action action) {
        return switch (action) {
            case Action.ChangePhase(Phase to) -> to == Phase.CUT;
            case Action.AdjustCalories(int kcalPerDay) -> kcalPerDay < 0;
            case Action.MiniCut _ -> true;
            default -> false;
        };
    }
}
