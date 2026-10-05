package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * What the server runs with on the VPS (K-907): application.yml with application-prod.yml over it, as Spring reads them
 * with SPRING_PROFILES_ACTIVE=prod. Production is on (the Apple key and a real-or-off coach are then required at start,
 * AppleAccountsProductionTests, LanguageModelConfigurationTests); the coach is off and the AI consent cannot be given
 * (ADR-064 #5: no fake, which keeps requests in memory — M8 inventory gap 7); TestFlight's SANDBOX purchases still count
 * during the beta (ADR-056 #4: it goes at the store launch, M10 — this test changes with that decision).
 */
class ProductionProfileTests {

    private static final Path RESOURCES = Path.of("src/main/resources");

    @Test
    void developmentIsNotProduction() throws IOException {
        assertThat(at(load("application.yml"), "keel.production")).isEqualTo(false);
    }

    @Test
    void productionIsOn() throws IOException {
        assertThat(at(production(), "keel.production")).isEqualTo(true);
    }

    @Test
    void theCoachIsOffAndTheAiConsentCannotBeGiven() throws IOException {
        Map<String, Object> prod = production();

        assertThat(at(prod, "keel.coach.provider")).isEqualTo("off");
        assertThat(at(prod, "keel.coach.provider-name")).isEqualTo("none");
        assertThat(at(prod, "keel.consent.third-party-ai")).as("no provider to consent to").isNull();
    }

    @Test
    void testFlightPurchasesCountDuringTheBeta() throws IOException {
        assertThat(at(production(), "keel.subscription.revenuecat.environments")).isEqualTo(List.of("PRODUCTION", "SANDBOX"));
    }

    private static Map<String, Object> production() throws IOException {
        return merge(load("application.yml"), load("application-prod.yml"));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> load(String name) throws IOException {
        try (InputStream in = Files.newInputStream(RESOURCES.resolve(name))) {
            Map<String, Object> loaded = new Yaml().load(in);
            return loaded == null ? Map.of() : loaded;
        }
    }

    /** A profile's file over the base, key by key; a list or a value replaces, as Spring's property sources do. */
    @SuppressWarnings("unchecked")
    private static Map<String, Object> merge(Map<String, Object> base, Map<String, Object> over) {
        Map<String, Object> merged = new LinkedHashMap<>(base);
        over.forEach((key, value) -> merged.merge(key, value, (was, now) -> was instanceof Map<?, ?> a && now instanceof Map<?, ?> b
                ? merge((Map<String, Object>) a, (Map<String, Object>) b) : now));
        return merged;
    }

    @SuppressWarnings("unchecked")
    private static Object at(Map<String, Object> yaml, String path) {
        Object node = yaml;
        for (String key : path.split("\\.")) {
            if (!(node instanceof Map<?, ?> map)) {
                return null;
            }
            node = ((Map<String, Object>) map).get(key);
        }
        return node;
    }
}
