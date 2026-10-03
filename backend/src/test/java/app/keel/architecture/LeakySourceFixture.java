package app.keel.architecture;

import app.keel.engine.Source;
import java.util.Map;

/** What ResearchPathStaysOnServerTests must catch: a view that carries the engine's Source, and one that reads its path. */
final class LeakySourceFixture {

    record LeakyView(String rule, Source source) {
    }

    static Map<String, Object> leakyMap(Source source) {
        return Map.of("reference", source.reference());
    }

    private LeakySourceFixture() {
    }
}
