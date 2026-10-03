package app.keel.coach;

import java.util.List;
import java.util.function.Function;

/** What LanguageModelBoundaryTests must catch: features that call a model past the gate, each another way. */
final class BypassingFeatureFixture {

    private static final ModelRequest REQUEST = new ModelRequest("explain", "m", 1, "s", List.of());

    static ModelReply explain(LanguageModel model) {
        return model.complete(REQUEST);
    }

    static final class ThroughTheAdapter {
        static ModelReply explain(FakeLanguageModel fake) {
            return fake.complete(REQUEST);
        }
    }

    static final class ThroughAReference {
        static Function<ModelRequest, ModelReply> explain(LanguageModel model) {
            return model::complete;
        }
    }

    interface NarrowerPort extends LanguageModel {
    }

    static final class ThroughANarrowerPort {
        static ModelReply explain(NarrowerPort port) {
            return port.complete(REQUEST);
        }
    }

    static class Adapter implements LanguageModel {
        @Override
        public ModelReply complete(ModelRequest request) {
            return new ModelReply("{}", 0, 0);
        }
    }

    static final class ThroughASubclass extends Adapter {
        @Override
        public ModelReply complete(ModelRequest request) {
            return super.complete(request);
        }
    }

    private BypassingFeatureFixture() {
    }
}
