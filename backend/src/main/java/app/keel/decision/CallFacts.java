package app.keel.decision;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * A kept call as the coach may tell it (K-505): the action with its data as the contract writes it, the rules it rests on
 * by kind of source only (K-523: no research path, no name), how sure, when it is looked at again, the day the next call
 * opens ({@code nextCallOn}, K-1032: the Decision's own, the one the coach names), its words' key, and
 * whether anyone but the engine may tell it ({@code tellable}): not the safety label (ADR-028 #24), not a call waiting for
 * the cycle question (V4 — the question exists because of an earlier answer), not one resting on the safety net (U6).
 * Health data: read behind the consent.
 *
 * <p>{@code context} is what the conversational coach (ADR-092 #1) may also be told, counts only and nothing dated: this week's
 * kinds of action as done of planned ({@code week}), the weeks on track of those counted ({@code record}) and the profile's
 * goal, experience and how many days a week the user trains ({@code profile}). Absent parts are left out, none is made up.
 */
public record CallFacts(UUID id, LocalDate madeOn, Map<String, Object> action, List<Rule> reasons, String confidence, LocalDate nextReview,
        LocalDate nextCallOn, String copyKey, boolean tellable, Map<String, Object> context) {

    /** A rule the call rests on, its kind of source and the numbers it read (ReasonFacts; none when it has none of its own). */
    public record Rule(String rule, String sourceTag, Map<String, Object> facts) {

        public Rule {
            facts = facts == null ? Map.of() : Map.copyOf(facts);
        }

        public Rule(String rule, String sourceTag) {
            this(rule, sourceTag, Map.of());
        }
    }

    public CallFacts {
        action = Map.copyOf(action);
        reasons = List.copyOf(reasons);
        context = context == null ? Map.of() : Map.copyOf(context);
    }

    /** A call without its surroundings (ADR-092 #1): the call alone. */
    public CallFacts(UUID id, LocalDate madeOn, Map<String, Object> action, List<Rule> reasons, String confidence, LocalDate nextReview,
            LocalDate nextCallOn, String copyKey, boolean tellable) {
        this(id, madeOn, action, reasons, confidence, nextReview, nextCallOn, copyKey, tellable, Map.of());
    }
}
