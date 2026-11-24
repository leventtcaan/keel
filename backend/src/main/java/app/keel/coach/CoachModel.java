package app.keel.coach;

import app.keel.privacy.EgressGate;
import app.keel.shared.AccountId;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * The one way to the language model (K-503, V2): every call goes out through the privacy module's gate, to the provider
 * keel.coach names, carrying the data its purpose names — without the AI consent to that provider and that data, it never
 * runs — with the model and the output limit keel.coach sets, and what it cost counted against the month's budget.
 */
@Component
class CoachModel {

    private final LanguageModel model;
    private final EgressGate egress;
    private final CoachProperties properties;
    private final CoachSpend spend;

    CoachModel(LanguageModel model, EgressGate egress, CoachProperties properties, CoachSpend spend) {
        this.model = model;
        this.egress = egress;
        this.properties = properties;
        this.spend = spend;
    }

    /** Whether a call for this purpose would go: the AI consent to the provider and the data, now (K-508: before counting). */
    boolean mayAsk(AccountId account, Purpose purpose) {
        return egress.allowsAi(account, properties.providerName(), properties.dataTypes().get(purpose));
    }

    ModelReply ask(AccountId account, Purpose purpose, String system, List<Turn> turns) {
        return ask(account, purpose, system, turns, null);
    }

    /** As {@link #ask(AccountId, Purpose, String, List)}, the reply bound to a JSON schema; what the call cost is recorded (ADR-092 #4). */
    ModelReply ask(AccountId account, Purpose purpose, String system, List<Turn> turns, ModelRequest.Schema schema) {
        String dataType = properties.dataTypes().get(purpose);
        ModelRequest request = new ModelRequest(purpose, properties.model(), properties.maxOutput(), system, turns, schema,
                egress.aiChannel(account, properties.providerName(), dataType));
        ModelReply reply;
        try {
            reply = egress.sendToAi(account, properties.providerName(), dataType, () -> model.complete(request));
        } catch (ModelUnavailable failed) {
            spend.recordFailed(account);
            throw failed;
        }
        spend.record(account, reply);
        return reply;
    }
}
