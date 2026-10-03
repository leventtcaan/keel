package app.keel.coach;

import app.keel.decision.CallFacts;
import app.keel.decision.CallReader;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.subscription.Quota;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

/**
 * A question about a call, answered (K-505, K-529, ADR-043 #76; U1, U2): the model only classifies — what the message is
 * about ({@link Topic}) and which of the call's rules answers it — and the app says it in its own copy: the topic's
 * sentence, the rule's sentence and that the call stands until new data. The model's reply is used only when
 * {@link TopicReply} reads it as exactly that. The call itself goes with every answer as it stands; the coach never
 * changes it. When the model's reply cannot be used, or is not asked for, the answer is the engine's own words (the
 * deterministic mode).
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

    /**
     * The model's classification — a topic, and the rule that answers it (none for a topic not about the call) — or the
     * key of the engine's own words; with the call, when there is one.
     */
    record Answer(Mode mode, Topic topic, String rule, String copyKey, Call call) {
    }

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final CallReader calls;
    private final Quota quota;
    private final CoachModel model;
    private final TopicReply reply;
    private final String instructions;

    Explanation(CallReader calls, Quota quota, CoachModel model, CoachProperties properties) {
        this.calls = calls;
        this.quota = quota;
        this.model = model;
        this.reply = new TopicReply(properties.maxReplyChars());
        this.instructions = CoachInstructions.read("explain.md");
    }

    Optional<Answer> answer(AccountId account, String question, Optional<UUID> decisionId) {
        Optional<CallFacts> found = calls.call(account, decisionId);
        if (found.isEmpty()) {
            return decisionId.isPresent() ? Optional.empty() : Optional.of(new Answer(Mode.DETERMINISTIC, null, null, NO_CALL_WORDS, null));
        }
        CallFacts call = found.get();
        Call told = new Call(call.id(), call.copyKey(), call.nextReview());
        if (!call.tellable()) {
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, null, CALL_WORDS, told));
        }
        // Without the consent the model would not be asked: refused before anything is counted.
        if (!model.mayAsk(account, Purpose.EXPLAIN)) {
            throw new ApiException(ErrorCode.CONSENT_REQUIRED);
        }
        // The day's limit (K-508): past it, the call as it stands — no hard stop. A use is given back if the call never ran.
        Optional<LocalDate> taken = quota.take(account, Quota.Use.COACH_MESSAGE);
        if (taken.isEmpty()) {
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, null, DAILY_LIMIT_WORDS, told));
        }
        ModelReply classified;
        try {
            classified = model.ask(account, Purpose.EXPLAIN, instructions + "\n\n" + facts(call), List.of(Turn.user(question)));
        } catch (RuntimeException notAsked) {
            try {
                quota.giveBack(account, Quota.Use.COACH_MESSAGE, taken.get());
            } catch (RuntimeException alsoFailed) {
                notAsked.addSuppressed(alsoFailed);
            }
            throw notAsked;
        }
        return Optional.of(reply.read(classified.text(), call).map(read -> new Answer(Mode.MODEL, read.topic(), read.rule(), null, told))
                .orElseGet(() -> new Answer(Mode.DETERMINISTIC, null, null, CALL_WORDS, told)));
    }

    /**
     * The call as the model gets it: what kind of call, and its rules with their kinds of source — nothing more than it
     * needs to choose (no number of the call, no date: it writes none, and they are health data).
     */
    static String facts(CallFacts call) {
        Map<String, Object> facts = new LinkedHashMap<>();
        facts.put("action", call.action().get("type"));
        facts.put("reasons", call.reasons().stream().map(rule -> Map.of("rule", rule.rule(), "source", rule.sourceTag())).toList());
        return "FACTS: " + JSON.writeValueAsString(facts);
    }
}
