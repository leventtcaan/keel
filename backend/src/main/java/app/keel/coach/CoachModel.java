package app.keel.coach;

import app.keel.privacy.EgressGate;
import app.keel.shared.AccountId;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * The one way to the language model (K-503, V2): every call goes out through the privacy module's gate, to the provider
 * keel.coach names, carrying the data its purpose names — without the AI consent to that provider and that data, it never
 * runs — with the model and the output limit keel.coach sets.
 */
@Component
class CoachModel {

    private final LanguageModel model;
    private final EgressGate egress;
    private final CoachProperties properties;

    CoachModel(LanguageModel model, EgressGate egress, CoachProperties properties) {
        this.model = model;
        this.egress = egress;
        this.properties = properties;
    }

    /** Whether a call for this purpose would go: the AI consent to the provider and the data, now (K-508: before counting). */
    boolean mayAsk(AccountId account, Purpose purpose) {
        return egress.allowsAi(account, properties.providerName(), properties.dataTypes().get(purpose));
    }

    ModelReply ask(AccountId account, Purpose purpose, String system, List<Turn> turns) {
        ModelRequest request = new ModelRequest(purpose, properties.model(), properties.maxOutput(), system, turns);
        return egress.sendToAi(account, properties.providerName(), properties.dataTypes().get(purpose), () -> model.complete(request));
    }
}
