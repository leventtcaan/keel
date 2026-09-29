package app.keel.engine;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * The engine's output (U3, ADR-003 §2): what to do, why, how sure, when to look again, and which text explains it.
 * Immutable, and an invalid decision cannot be constructed: every decision except {@link Action.NoDecisionYet}
 * names at least one reason.
 *
 * @param copyKey key into data/copy/en.json (K2): the words live there, not in code
 */
public record Decision(Action action, List<Reason> reasons, Confidence confidence, LocalDate nextReview, String copyKey) {

    // Dotted lowercase path with at least two segments, like the nesting in data/copy/en.json.
    private static final Pattern COPY_KEY = Pattern.compile("[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+");

    public Decision {
        Objects.requireNonNull(action, "action");
        Objects.requireNonNull(reasons, "reasons");
        Objects.requireNonNull(confidence, "confidence");
        Objects.requireNonNull(nextReview, "nextReview");
        Objects.requireNonNull(copyKey, "copyKey");

        reasons = List.copyOf(reasons);
        if (reasons.isEmpty() && !(action instanceof Action.NoDecisionYet)) {
            throw new IllegalArgumentException(
                    "A decision to " + action.type() + " needs at least one reason (U3); only NO_DECISION_YET may have none");
        }
        if (!COPY_KEY.matcher(copyKey).matches()) {
            throw new IllegalArgumentException("copyKey must be a dotted lowercase key like 'decision.continue': '" + copyKey + "'");
        }
    }
}
