package app.keel.coach;

import app.keel.privacy.EgressGate;
import app.keel.shared.AccountId;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * The one way to the language model (K-503, V2): every call goes out through the privacy module's gate — without the AI
 * consent that names the provider, it never runs — with the model and the output limit keel.coach sets.
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

    ModelReply ask(AccountId account, String purpose, String system, List<Turn> turns) {
        ModelRequest request = new ModelRequest(purpose, properties.model(), properties.maxOutput(), system, turns);
        return model.complete(request);
    }
}
