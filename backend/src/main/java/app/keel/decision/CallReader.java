package app.keel.decision;

import app.keel.engine.RuleId;
import app.keel.engine.SafetyHold;
import app.keel.engine.SafetyNet;
import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;

/**
 * The calls as the coach may read them (K-505): the user's own, behind the health data consent like /v1/decisions, as
 * they are sent — sources by kind only (K-523). The coach tells a call; it never makes or changes one (U1).
 */
@Service
public class CallReader {

    // A call waiting for the cycle question (V4) or resting on the safety net (U6): the engine's own words only (K-505 review).
    private static final Set<String> UNTELLABLE = Stream.concat(Stream.of(SafetyHold.CYCLE_CHECK_NEEDED), SafetyNet.RULES.stream())
            .map(RuleId::value).collect(Collectors.toUnmodifiableSet());

    private final DecisionService decisions;

    CallReader(DecisionService decisions) {
        this.decisions = decisions;
    }

    /** The call with this id, or the latest when none is given. */
    public Optional<CallFacts> call(AccountId account, Optional<UUID> id) {
        return id.map(given -> decisions.find(account, given)).orElseGet(() -> decisions.current(account)).map(CallReader::facts);
    }

    @SuppressWarnings("unchecked")
    private static CallFacts facts(CallStore.Call call) {
        Map<String, Object> sent = SourceView.sent(call.decision());
        List<CallFacts.Rule> reasons = ((List<Map<String, Object>>) sent.get("reasons")).stream()
                .map(reason -> new CallFacts.Rule((String) reason.get("rule"), (String) ((Map<String, Object>) reason.get("source")).get("tag")))
                .toList();
        boolean untellable = Boolean.TRUE.equals(sent.get("safety"))
                || reasons.stream().anyMatch(reason -> UNTELLABLE.contains(reason.rule()));
        return new CallFacts(call.id(), call.madeOn(), (Map<String, Object>) sent.get("action"), reasons, (String) sent.get("confidence"),
                LocalDate.parse((String) sent.get("nextReview")), (String) sent.get("copyKey"), !untellable);
    }
}
