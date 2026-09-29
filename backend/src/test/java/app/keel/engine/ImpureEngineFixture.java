package app.keel.engine;

import java.nio.file.Path;
import java.time.LocalDate;
import org.springframework.util.StringUtils;

/**
 * Test-only stand-in for an engine class that breaks every purity rule. EnginePurityTests evaluates its rules
 * against this class to prove they are not vacuous. Lives under src/test, so it is never part of the engine.
 */
public final class ImpureEngineFixture {

    private ImpureEngineFixture() {
    }

    static String everyForbiddenThing() {
        LocalDate today = LocalDate.now();
        Path file = Path.of("data");
        boolean framework = StringUtils.hasText("x");
        return today + file.toString() + framework;
    }
}
