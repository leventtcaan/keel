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
 * <p>The model is asked only with an active subscription (K-703): without one, ENTITLEMENT_REQUIRED — after the few introductory
 * questions about the first full call ({@link TrialQuestions}, ADR-092 #7). And only while the month's
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
    /** The topic sentence for a doctor or a health matter (coach.topic.health): the coach is not care (U6). */
    static final String HEALTH_WORDS = "coach.topic.health";

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
    private final CoachConversation conversation;
    private final CoachMemory memory;
    private final TrialQuestions trial;
    private final ReplyValidator validator;
    private final Signals health = Signals.health();
    private final Signals injection = Signals.injection();
    private final String instructions;

    Explanation(CallReader calls, Quota quota, Entitlements entitlements, Clock clock, CoachModel model, CoachSpend spend, CoachConversation conversation,
            CoachMemory memory, TrialQuestions trial, CoachProperties properties) {
        this.calls = calls;
        this.quota = quota;
        this.entitlements = entitlements;
        this.clock = clock;
        this.model = model;
        this.spend = spend;
        this.conversation = conversation;
        this.memory = memory;
        this.trial = trial;
        this.validator = new ReplyValidator(properties.maxReplyChars(), ForbiddenWords.fromClasspath(), ReplyRules.fromClasspath());
        this.instructions = CoachInstructions.read("explain.md");
    }

    /**
     * The answer, and — when the model could have been asked, so with the AI consent — the exchange kept for the conversation
     * (ADR-092 #3; the engine's own "no call yet" is no exchange).
     */
    Optional<Answer> answer(AccountId account, String question, Optional<UUID> decisionId) {
        Optional<Answer> answered = compute(account, question, decisionId);
        answered.filter(answer -> answer.call() != null).filter(answer -> model.mayAsk(account, Purpose.EXPLAIN)).ifPresent(answer -> remember(account, question, answer));
        return answered;
    }

    private void remember(AccountId account, String question, Answer answer) {
        UUID call = answer.call().decisionId();
        // A question the server stopped before it could be sent stays in the user's view and export, marked, and is never sent later.
        boolean blocked = !health.found(question).isEmpty() || !injection.found(question).isEmpty();
        conversation.append(account, CoachConversation.Role.USER, question, null, null, call, blocked);
        conversation.append(account, CoachConversation.Role.COACH, answer.reply(), answer.reply() == null ? (answer.copyKey() != null ? answer.copyKey() : "coach.topic."
                + answer.topic().name().toLowerCase(java.util.Locale.ROOT)) : null, answer.topic(), call, blocked);
    }

    private Optional<Answer> compute(AccountId account, String question, Optional<UUID> decisionId) {
        Optional<CallFacts> found = calls.call(account, decisionId);
        if (found.isEmpty()) {
            return decisionId.isPresent() ? Optional.empty() : Optional.of(new Answer(Mode.DETERMINISTIC, null, null, null, NO_CALL_WORDS, null));
        }
        CallFacts call = found.get();
        Call told = new Call(call.id(), call.copyKey(), call.nextReview(), call.nextCallOn());
        if (!call.tellable()) {
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, null, null, CALL_WORDS, told));
        }
        // Before anything else that could send a word out (ADR-092 #2, U6): a question or a memory with a health, medical, injury or
        // eating-disorder word gets the engine's safe sentence, one that tries to give the coach orders the call as it stands — no
        // model, no count, nothing sent. Deterministic, from lists in data/coach.
        List<String> memories = memory.list(account).stream().map(CoachMemory.Item::text).toList();
        if (touchesHealth(question, memories)) {
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, null, null, HEALTH_WORDS, told));
        }
        if (givesOrders(question, memories)) {
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, null, null, CALL_WORDS, told));
        }
        // The model is what the subscription pays for (K-703, ADR-056 #10): without one, refused before the consents are
        // looked at and anything is counted — except the few introductory questions about the first full call (ADR-092 #7).
        // The engine's own words above need none.
        boolean subscribed = entitlements.active(account, clock.instant());
        if (!subscribed && trial.left(account) == 0) {
            throw new ApiException(ErrorCode.ENTITLEMENT_REQUIRED);
        }
        // Without the consent the model would not be asked: refused before anything is counted.
        if (!model.mayAsk(account, Purpose.EXPLAIN)) {
            throw new ApiException(ErrorCode.CONSENT_REQUIRED);
        }
        // The month's budget (ADR-092 #4): once spent, the engine's words for everyone — before a use of the day is taken.
        if (spend.exhausted(account)) {
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, null, null, CALL_WORDS, told));
        }
        // The day's limit (K-508): past it, the call as it stands — no hard stop. A use is given back if the call never ran.
        Optional<LocalDate> taken = quota.take(account, Quota.Use.COACH_MESSAGE);
        if (taken.isEmpty()) {
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, null, null, DAILY_LIMIT_WORDS, told));
        }
        // An introductory question is taken once the day's use is: past either limit, none is spent (the engine's words are shown).
        boolean onTrial = !subscribed;
        if (onTrial && !trial.take(account)) {
            quota.giveBack(account, Quota.Use.COACH_MESSAGE, taken.get());
            throw new ApiException(ErrorCode.ENTITLEMENT_REQUIRED);
        }
        CoachFacts facts = CoachFacts.of(call, memories);
        List<Turn> turns = sendable(conversation.turns(account));
        turns.add(Turn.user(question));
        ModelReply said;
        try {
            said = model.ask(account, Purpose.EXPLAIN, instructions + "\n\n" + facts.json(), turns, REPLY_SCHEMA);
        } catch (ModelUnavailable down) {
            // The provider is down, over its limit or refuses our key: the call in the engine's words, and the use given back.
            giveBack(account, taken.get(), onTrial, down);
            SafeLog.failure(UUID.randomUUID(), ErrorCode.SERVICE_UNAVAILABLE, down);
            return Optional.of(new Answer(Mode.DETERMINISTIC, null, null, null, CALL_WORDS, told));
        } catch (RuntimeException notAsked) {
            giveBack(account, taken.get(), onTrial, notAsked);
            throw notAsked;
        }
        return Optional.of(validator.read(said.text(), call, facts)
                .map(valid -> new Answer(Mode.MODEL, valid.topic(), valid.rule(), valid.reply(), null, told))
                .orElseGet(() -> new Answer(Mode.DETERMINISTIC, null, null, null, CALL_WORDS, told)));
    }

    /**
     * The earlier turns that may go out with this question: the signals run over every one of them, as they ran over the question — a
     * turn that touches health or gives orders (kept before the lists said so, or written by hand) is not sent, and since the rest
     * would no longer follow from it, nothing of the history is: the question goes alone (fail closed).
     */
    private List<Turn> sendable(List<Turn> earlier) {
        boolean clean = earlier.stream().allMatch(turn -> health.found(turn.text()).isEmpty() && injection.found(turn.text()).isEmpty());
        return clean ? new java.util.ArrayList<>(earlier) : new java.util.ArrayList<>();
    }

    private boolean touchesHealth(String question, List<String> memories) {
        return !health.found(question).isEmpty() || memories.stream().anyMatch(item -> !health.found(item).isEmpty());
    }

    private boolean givesOrders(String question, List<String> memories) {
        return !injection.found(question).isEmpty() || memories.stream().anyMatch(item -> !injection.found(item).isEmpty());
    }

    private void giveBack(AccountId account, LocalDate day, boolean onTrial, RuntimeException failure) {
        try {
            quota.giveBack(account, Quota.Use.COACH_MESSAGE, day);
            if (onTrial) {
                trial.giveBack(account);
            }
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
