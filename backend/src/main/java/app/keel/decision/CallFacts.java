package app.keel.decision;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * A kept call as the coach may tell it (K-505): the action with its data as the contract writes it, the rules it rests on
 * by kind of source only (K-523: no research path, no name), how sure, when it is looked at again, its words' key, and
 * whether it is the safety label (ADR-028 #24). Health data: read behind the consent.
 */
public record CallFacts(UUID id, LocalDate madeOn, Map<String, Object> action, List<Rule> reasons, String confidence, LocalDate nextReview,
        String copyKey, boolean safety) {

    public record Rule(String rule, String sourceTag) {
    }

    public CallFacts {
        action = Map.copyOf(action);
        reasons = List.copyOf(reasons);
    }
}
