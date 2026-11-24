package app.keel.coach;

import app.keel.decision.CallFacts;
import app.keel.decision.CallReader;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.shared.SafeLog;
import app.keel.subscription.Entitlements;
import app.keel.subscription.Quota;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * A question about a call, answered (K-505, K-529, ADR-092; U1, U2): the model is given the call's facts — the action, the rules
 * with the numbers they read, this week's counts, a few words about the person — and answers in words ({@link ReplyValidator}'s
 * schema: reply, topic, numbers used). Its words are shown only when the validator passes them: every number one of the facts,
 * no forbidden phrase, no concession, no change of the call. Otherwise, or when the model is not asked or cannot answer, the
 * answer is the engine's own sentence (the deterministic mode: the call as it stands, its copyKey). The call itself goes with
 * every answer as it stands; the coach never changes it.
 *
 * <p>The model is asked only with an active subscription (K-703): without one, ENTITLEMENT_REQUIRED. And only while the month's
 * budget lasts (ADR-092 #4, {@link CoachSpend}): past it, the engine's words, for everyone.
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

    private static final ModelRequest.Schema REPLY_SCHEMA = replySchema();

    enum Mode { MODEL, DETERMINISTIC }

    /**
     * What the answer says about the call: which, its words, when it is looked at again (the data that changes it) and the day
     * the next call opens (Decision.nextCallOn, K-1032: the day "the call stands until" names; absent, the sentence has none).
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Call(UUID decisionId, String copyKey, java.time.LocalDate nextReview, java.time.LocalDate nextCallOn) {
    }

    /**
     * What the model said that was shown — its topic, the call's rule that answers it (none for a topic not about the call) and
     * its words (none for a topic not about the call: the app says its own sentence) — or the key of the engine's own words;
     * with the call, when there is one.
     */
    record Answer(Mode mode, Topic topic, String rule, String reply, String copyKey, Call call) {
    }

    private final CallReader calls;
    private final Quota quota;
    private final Entitlements entitlements;
    private final Clock clock;
    private final CoachModel model;
    private final CoachSpend spend;
    private final ReplyValidator validator;
    private final String instructions;

    Explanation(CallReader calls, Quota quota, Entitlements entitlements, Clock clock, CoachModel model, CoachSpend spend, CoachProperties properties) {
        this.calls = calls;
        this.quota = quota;
        this.entitlements = entitlements;
        this.clock = clock;
        this.model = model;
        this.spend = spend;
        this.validator = new ReplyValidator(properties.maxReplyChars(), ForbiddenWords.fromClasspath(), ReplyRules.fromClasspath());
        this.instructions = CoachInstructions.read("explain.md");
    }

    Optional<Answer> answer(AccountId account, String question, Optional<UUID> decisionId) {
        Optional<CallFacts> found = calls.call(account, decisionId);
        if (found.isEmpty()) {
            return decisionId.isPresent() ? Optional.empty() : Optional.of(new Answer(Mode.DETERMINISTIC, null, null, null, NO_CALL_WORDS, null));
        }
        CallFacts call = found.get();
        Call told = new Call(call.id(), call.copyKey(), call.nextReview(), call.nextCallOn());
        if (!call.tellable()) {
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, null, null, CALL_WORDS, told));
        }
        // The model is what the subscription pays for (K-703, ADR-056 #10): without one, refused before the consents are
        // looked at and anything is counted. The engine's own words above need none.
        if (!entitlements.active(account, clock.instant())) {
            throw new ApiException(ErrorCode.ENTITLEMENT_REQUIRED);
        }
        // Without the consent the model would not be asked: refused before anything is counted.
        if (!model.mayAsk(account, Purpose.EXPLAIN)) {
            throw new ApiException(ErrorCode.CONSENT_REQUIRED);
        }
        // The month's budget (ADR-092 #4): once spent, the engine's words for everyone — before a use of the day is taken.
        if (spend.exhausted()) {
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, null, null, CALL_WORDS, told));
        }
        // The day's limit (K-508): past it, the call as it stands — no hard stop. A use is given back if the call never ran.
        Optional<LocalDate> taken = quota.take(account, Quota.Use.COACH_MESSAGE);
        if (taken.isEmpty()) {
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, null, null, DAILY_LIMIT_WORDS, told));
        }
        CoachFacts facts = CoachFacts.of(call);
        ModelReply said;
        try {
            said = model.ask(account, Purpose.EXPLAIN, instructions + "\n\n" + facts.json(), List.of(Turn.user(question)), REPLY_SCHEMA);
        } catch (ModelUnavailable down) {
            // The provider is down, over its limit or refuses our key: the call in the engine's words, and the use given back.
            giveBack(account, taken.get(), down);
            SafeLog.failure(UUID.randomUUID(), ErrorCode.SERVICE_UNAVAILABLE, down);
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, null, null, CALL_WORDS, told));
        } catch (RuntimeException notAsked) {
            giveBack(account, taken.get(), notAsked);
            throw notAsked;
        }
        return Optional.of(validator.read(said.text(), call, facts)
                .map(valid -> new Answer(Mode.MODEL, valid.topic(), valid.rule(), valid.reply(), null, told))
                .orElseGet(() -> new Answer(Mode.DETERMINISTIC, null, null, null, CALL_WORDS, told)));
    }

    private void giveBack(AccountId account, LocalDate day, RuntimeException failure) {
        try {
            quota.giveBack(account, Quota.Use.COACH_MESSAGE, day);
        } catch (RuntimeException alsoFailed) {
            failure.addSuppressed(alsoFailed);
        }
    }

    /** The shape the model's reply must follow (strict): its words, the topic from the closed list, the numbers it used. */
    private static ModelRequest.Schema replySchema() {
        return new ModelRequest.Schema("coach_reply", Map.of("type", "object", "additionalProperties", false,
                "required", List.of("reply", "topic", "numbersUsed"),
                "properties", Map.of("reply", Map.of("type", "string"),
                        "topic", Map.of("type", "string", "enum", java.util.Arrays.stream(Topic.values()).map(Enum::name).toList()),
                        "numbersUsed", Map.of("type", "array", "items", Map.of("type", "number")))));
    }
}
