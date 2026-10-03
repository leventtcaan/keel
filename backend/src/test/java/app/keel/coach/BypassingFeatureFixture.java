package app.keel.coach;

import java.util.List;

/** What LanguageModelBoundaryTests must catch: a feature that calls the model past the gate. */
final class BypassingFeatureFixture {

    static ModelReply explain(LanguageModel model) {
        return model.complete(new ModelRequest("explain", "m", 1, "s", List.of()));
    }

    private BypassingFeatureFixture() {
    }
}
