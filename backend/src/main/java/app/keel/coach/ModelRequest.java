package app.keel.coach;

import java.util.List;
import java.util.Objects;

/**
 * One call to a language model: what it is for (a label for the counts, never sent), the model and the output limit
 * from keel.coach (K2), the instructions and the turns.
 */
record ModelRequest(String purpose, String model, int maxOutputTokens, String system, List<Turn> turns) {

    ModelRequest {
        Objects.requireNonNull(purpose, "purpose");
        Objects.requireNonNull(model, "model");
        Objects.requireNonNull(system, "system");
        turns = List.copyOf(turns);
    }
}
