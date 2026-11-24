package app.keel.coach;

import app.keel.privacy.AiChannel;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * One call to a language model: what it is for (a label for the counts, never sent), the model and the output limit
 * from keel.coach (K2), the instructions and the turns; the schema its answer must follow (none: any JSON object) and the
 * channel a provider's adapter posts through — the privacy module's, bound to the account and the data (none for the fake).
 */
record ModelRequest(Purpose purpose, String model, int maxOutputTokens, String system, List<Turn> turns, Schema schema, AiChannel channel) {

    /** A JSON schema the reply must follow (strict: nothing the schema does not name). */
    record Schema(String name, Map<String, Object> definition) {

        Schema {
            Objects.requireNonNull(name, "name");
            definition = Map.copyOf(definition);
        }
    }

    ModelRequest {
        Objects.requireNonNull(purpose, "purpose");
        Objects.requireNonNull(model, "model");
        Objects.requireNonNull(system, "system");
        turns = List.copyOf(turns);
    }

    /** A call with no schema and no channel: what the fake and the tests ask. */
    ModelRequest(Purpose purpose, String model, int maxOutputTokens, String system, List<Turn> turns) {
        this(purpose, model, maxOutputTokens, system, turns, null, null);
    }

    @Override
    public String toString() {
        return "ModelRequest[" + purpose + ", " + model + "]"; // what was asked is health data: never in a log line (V3)
    }
}
