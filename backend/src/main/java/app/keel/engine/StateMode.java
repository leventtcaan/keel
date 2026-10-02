package app.keel.engine;

import java.util.List;
import java.util.Optional;

/**
 * State mode (K-516, ADR-038): a week the user declared disturbed — traveling, sick, in pain, busy, a new gym — is new data
 * (U2), and its call waits with the reason shown (U3): a routine broken moves the scale by water, sodium and glycogen
 * (H1), and a sick week's loss is not fat (G2 K-87). The safety net comes before it (U13); nothing here resets a count (U7).
 */
public final class StateMode {

    static final RuleId DECLARED_CONTEXT = new RuleId("declared_context");
    private static final Source SCALE_NOISE = new Source("arastirma/ham/H1-olcum.md#3.4", SourceTag.LITERATURE);
    private static final int DAYS_PER_WEEK = 7;

    private StateMode() {
    }

    /** "Not yet" for a week the user declared, looked at again in a week. */
    public static Optional<Decision> check(Snapshot snapshot) {
        return snapshot.context().map(context -> new Decision(new Action.NoDecisionYet(), List.of(new Reason(DECLARED_CONTEXT, SCALE_NOISE)),
                Confidence.LOW, snapshot.today().plusDays(DAYS_PER_WEEK), new CopyKey("decision.no_decision_yet." + DECLARED_CONTEXT.value())));
    }
}
