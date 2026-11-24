package app.keel.coach;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.shared.RateLimitGroup;
import app.keel.shared.RateLimited;
import app.keel.subscription.Entitlements;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The coach's conversation and what it was asked to remember (ADR-092 #3): the user sees, corrects and deletes both. */
@RestController
class CoachConversationController {

    /** Contract CoachMessage: one message of the conversation; the coach's is the model's checked words or the key of the engine's sentence. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record MessageView(UUID id, CoachConversation.Role role, String text, String copyKey, Topic topic, UUID decisionId, Instant createdAt) {
    }

    /** Contract CoachHistory. */
    record HistoryView(List<MessageView> messages) {
    }

    /** Contract CoachMemoryItem. */
    record MemoryItemView(UUID id, String text, Instant createdAt) {
    }

    /** Contract CoachMemory. */
    record MemoryView(List<MemoryItemView> items, int maxItems) {
    }

    /** Contract CoachMemoryWords. */
    record MemoryWords(String text) {
    }

    private final CoachConversation conversation;
    private final CoachMemory memory;
    private final CoachModel model;
    private final Entitlements entitlements;
    private final Clock clock;

    CoachConversationController(CoachConversation conversation, CoachMemory memory, CoachModel model, Entitlements entitlements, Clock clock) {
        this.conversation = conversation;
        this.memory = memory;
        this.model = model;
        this.entitlements = entitlements;
        this.clock = clock;
    }

    /** GET /v1/coach/history (ADR-092 #3): the last messages of the conversation, oldest first. */
    @GetMapping("/v1/coach/history")
    HistoryView history(AccountId account) {
        return new HistoryView(conversation.history(account).stream().map(message -> new MessageView(message.id(), message.role(), message.text(),
                message.copyKey(), message.topic(), message.decisionId(), message.at())).toList());
    }

    /** DELETE /v1/coach/history: the whole conversation, for good; what the coach was asked to remember stays (it has its own list). */
    @DeleteMapping("/v1/coach/history")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void clearHistory(AccountId account) {
        conversation.clear(account);
    }

    /** GET /v1/coach/memory: what the coach was asked to remember, with how many it can hold. */
    @GetMapping("/v1/coach/memory")
    MemoryView remembered(AccountId account) {
        return new MemoryView(memory.list(account).stream().map(item -> new MemoryItemView(item.id(), item.text(), item.at())).toList(), memory.maxItems());
    }

    /**
     * POST /v1/coach/memory: the user's own "remember this" — the only way anything is remembered. As the coach itself: the
     * subscription and the AI consent (V2); words the coach could not say are refused (400), a full list is a conflict (409).
     */
    @PostMapping("/v1/coach/memory")
    @RateLimited(RateLimitGroup.COACH)
    @ResponseStatus(HttpStatus.CREATED)
    MemoryItemView remember(AccountId account, @RequestBody MemoryWords words) {
        if (!entitlements.active(account, clock.instant())) {
            throw new ApiException(ErrorCode.ENTITLEMENT_REQUIRED);
        }
        if (!model.mayAsk(account, Purpose.EXPLAIN)) {
            throw new ApiException(ErrorCode.CONSENT_REQUIRED);
        }
        CoachMemory.Item item = memory.add(account, words == null ? null : words.text());
        return new MemoryItemView(item.id(), item.text(), item.at());
    }

    /** PATCH /v1/coach/memory/{id}: the user corrects their own sentence. */
    @PatchMapping("/v1/coach/memory/{id}")
    MemoryItemView correct(AccountId account, @PathVariable UUID id, @RequestBody MemoryWords words) {
        CoachMemory.Item item = memory.correct(account, id, words == null ? null : words.text()).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        return new MemoryItemView(item.id(), item.text(), item.at());
    }

    /** DELETE /v1/coach/memory/{id}: forgotten at once; the next question is asked without it. */
    @DeleteMapping("/v1/coach/memory/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void forget(AccountId account, @PathVariable UUID id) {
        if (!memory.delete(account, id)) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
    }
}
