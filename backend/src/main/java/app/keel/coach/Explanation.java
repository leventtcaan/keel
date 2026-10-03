package app.keel.coach;

import app.keel.decision.CallFacts;
import app.keel.decision.CallReader;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.subscription.Quota;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

/**
 * A question about a call, answered (K-505, U1, U2): the model tells the call from its facts only, and its words are
 * shown only when {@link ReplyCheck} finds them to be the call told. The call itself goes with every answer as it stands
 * — the coach repeats it and says the next check-in's data is what changes it; it never changes it. When the model's
 * words cannot be used, or are not asked for, the answer is the engine's own words (the deterministic mode).
 *
 * <p>Not asked of the model: when there is no call yet, and for a call only the engine may tell ({@link CallFacts#tellable}:
 * the safety label, a call waiting for the cycle question — V4, what is behind it is never told by anyone — and the
 * safety net's calls, U6).
 */
@Service
class Explanation {

    static final String CALL_WORDS = "coach.answer.call";
    static final String NO_CALL_WORDS = "coach.answer.no_call";
    static final String DAILY_LIMIT_WORDS = "coach.answer.daily_limit";

    enum Mode { MODEL, DETERMINISTIC }

    /** What the answer says about the call: which, its words, and when it is looked at again (the data that changes it). */
    record Call(UUID decisionId, String copyKey, java.time.LocalDate nextReview) {
    }

    /** The model's checked words, or the key of the engine's own; with the call, when there is one. */
    record Answer(Mode mode, String text, String copyKey, Call call) {
    }

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final CallReader calls;
    private final Quota quota;
    private final CoachModel model;
    private final ReplyCheck check;
    private final String instructions;

    Explanation(CallReader calls, Quota quota, CoachModel model, CoachProperties properties) {
        this.calls = calls;
        this.quota = quota;
        this.model = model;
        this.check = ReplyCheck.fromClasspath(properties.maxReplyChars());
        this.instructions = CoachInstructions.read("explain.md");
    }

    Optional<Answer> answer(AccountId account, String question, Optional<UUID> decisionId) {
        Optional<CallFacts> found = calls.call(account, decisionId);
        if (found.isEmpty()) {
            return decisionId.isPresent() ? Optional.empty() : Optional.of(new Answer(Mode.DETERMINISTIC, null, NO_CALL_WORDS, null));
        }
        CallFacts call = found.get();
        Call told = new Call(call.id(), call.copyKey(), call.nextReview());
        if (!call.tellable()) {
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, CALL_WORDS, told));
        }
        // Without the consent the model would not be asked: refused before anything is counted.
        if (!model.mayAsk(account, Purpose.EXPLAIN)) {
            throw new ApiException(ErrorCode.CONSENT_REQUIRED);
        }
        // The day's limit (K-508): past it, the call as it stands — no hard stop. A use is given back if the call never ran.
        Optional<LocalDate> taken = quota.take(account, Quota.Use.COACH_MESSAGE);
        if (taken.isEmpty()) {
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, DAILY_LIMIT_WORDS, told));
        }
        ModelReply reply;
        try {
            reply = model.ask(account, Purpose.EXPLAIN, instructions + "\n\n" + facts(call), List.of(Turn.user(question)));
        } catch (RuntimeException notAsked) {
            try {
                quota.giveBack(account, Quota.Use.COACH_MESSAGE, taken.get());
            } catch (RuntimeException alsoFailed) {
                notAsked.addSuppressed(alsoFailed);
            }
            throw notAsked;
        }
        return Optional.of(check.read(reply.text(), call).map(text -> new Answer(Mode.MODEL, text, null, told))
                .orElseGet(() -> new Answer(Mode.DETERMINISTIC, null, CALL_WORDS, told)));
    }

    /** The call as the model gets it: its facts, sources by kind only, and every number it may write. */
    static String facts(CallFacts call) {
        Map<String, Object> facts = new LinkedHashMap<>();
        facts.put("action", call.action());
        facts.put("reasons", call.reasons().stream().map(rule -> Map.of("rule", rule.rule(), "source", rule.sourceTag())).toList());
        facts.put("confidence", call.confidence());
        facts.put("nextReview", call.nextReview().toString());
        return "FACTS: " + JSON.writeValueAsString(facts) + "\nNUMBERS: "
                + CallNumbers.told(call).stream().sorted().map(BigDecimal::toPlainString).toList();
    }
}
