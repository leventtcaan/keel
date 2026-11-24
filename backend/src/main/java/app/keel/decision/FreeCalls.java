package app.keel.decision;

import app.keel.engine.SafetyHold;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;

/**
 * Which weekly calls the free account may keep (ADR-091 Ek 1, K-1201): logging is free, the call is what the subscription
 * pays for. A <b>full call</b> is one made on a decision window that was read ({@code DecisionPipeline.windowRead}); the first
 * {@code free_full_calls} of an account (data/parameters/quota.yaml: a product limit, K2) are free, the next ones are held
 * back until the account has the subscription. The safety net and the cycle question are never full: never held, never
 * spending the allowance (U6).
 */
record FreeCalls(int allowance) {

    private static final String KEY = "free_full_calls";

    static FreeCalls fromClasspath() {
        LoaderOptions strict = new LoaderOptions();
        strict.setAllowDuplicateKeys(false);
        try (InputStream in = new ClassPathResource("data/parameters/quota.yaml").getInputStream()) {
            Map<String, Object> document = new Yaml(strict).load(in);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parameters = (List<Map<String, Object>>) document.get("parameters");
            return new FreeCalls(parameters.stream().filter(parameter -> KEY.equals(parameter.get("key"))).map(parameter -> parameter.get("value"))
                    .filter(value -> value instanceof Integer whole && whole >= 0).map(Integer.class::cast).findFirst()
                    .orElseThrow(() -> new IllegalStateException("quota.yaml: " + KEY + " is missing or not a whole number of at least 0")));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Whether the kept call is a full one: the window was read, and it rests on neither the safety net nor the cycle question. */
    static boolean full(boolean windowRead, Map<String, Object> kept) {
        return windowRead && !SafetyCalls.restsOnTheSafetyNet(kept) && !waitsForTheCycleQuestion(kept);
    }

    @SuppressWarnings("unchecked")
    private static boolean waitsForTheCycleQuestion(Map<String, Object> kept) {
        return ((List<Map<String, Object>>) kept.getOrDefault("reasons", List.of())).stream()
                .anyMatch(reason -> SafetyHold.CYCLE_CHECK_NEEDED.value().equals(reason.get("rule")));
    }

    /** Whether a call just made is held back: full, the account's free ones used up ({@code earlierFull} before it), no subscription now. */
    boolean heldBack(boolean full, long earlierFull, boolean entitled) {
        return full && !entitled && earlierFull >= allowance;
    }
}
