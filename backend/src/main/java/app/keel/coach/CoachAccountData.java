package app.keel.coach;

import app.keel.consent.ConsentKind;
import app.keel.consent.ConsentWithdrawn;
import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.event.EventListener;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * The coach's part of the user's data (ADR-092 #3, V6): the conversation and the things it was asked to remember — in the
 * export as they are, and gone with the account, with the AI consent (nothing is sent without it, so nothing is kept for it) and with the
 * health data consent (what was said is about the call). A withdrawal deletes in its own transaction, as the others do (K-231).
 */
@Component
class CoachAccountData implements AccountDataExport {

    private final CoachConversation conversation;
    private final CoachMemory memory;

    CoachAccountData(CoachConversation conversation, CoachMemory memory) {
        this.conversation = conversation;
        this.memory = memory;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        delete(deletion.account());
    }

    @EventListener
    void on(ConsentWithdrawn withdrawn) {
        if (withdrawn.kind() == ConsentKind.THIRD_PARTY_AI || withdrawn.kind() == ConsentKind.HEALTH_DATA) {
            delete(withdrawn.account());
        }
    }

    private void delete(AccountId account) {
        conversation.clear(account);
        memory.clear(account);
    }

    @Override
    public String section() {
        return "coach";
    }

    @Override
    public Object export(AccountId account) {
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("messages", conversation.history(account).stream().map(message -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("at", message.at().toString());
            entry.put("role", message.role().name());
            if (message.text() != null) {
                entry.put("text", message.text());
            }
            if (message.copyKey() != null) {
                entry.put("engineSentence", message.copyKey());
            }
            if (message.topic() != null) {
                entry.put("topic", message.topic().name());
            }
            return (Map<String, Object>) entry;
        }).toList());
        List<Map<String, Object>> remembered = memory.list(account).stream()
                .map(item -> Map.<String, Object>of("text", item.text(), "at", item.at().toString())).toList();
        section.put("memory", remembered);
        return section;
    }
}
