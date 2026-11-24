package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;

/** What a phone says it can show (ADR-091 Ek 1): the 1.0 in the stores says nothing, and is read as before the locked call. */
class ClientFeaturesTests {

    private final ClientFeatures features = ClientFeatures.fromClasspath();

    @Test
    void theHeaderAndTheTokenAreParametersNotLiterals() throws IOException {
        try (InputStream in = new ClassPathResource("data/parameters/quota.yaml").getInputStream()) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parameters = (List<Map<String, Object>>) new Yaml().<Map<String, Object>>load(in).get("parameters");
            for (String key : List.of("client_features_header", "locked_calls_feature_token", "legacy_clients_unlocked_until")) {
                assertThat(parameters).filteredOn(parameter -> key.equals(parameter.get("key"))).singleElement()
                        .satisfies(parameter -> assertThat(parameter).containsKeys("value", "unit", "tag", "source", "note"));
            }
        }
        assertThat(features.header()).isEqualTo("X-Keel-Features");
        assertThat(features.lockedCallsToken()).isEqualTo("locked-calls");
        assertThat(features.legacyUnlockedUntil()).isEqualTo(LocalDate.of(2027, 1, 15));
    }

    @Test
    void anUnmarkedPhoneOfBeforeIsServedAsBeforeUpToTheCutoff() {
        ClientFeatures cutoff = new ClientFeatures("X-Keel-Features", "locked-calls", LocalDate.of(2027, 1, 15));

        assertThat(cutoff.enforced(false, false, LocalDate.of(2026, 12, 1))).isFalse();
        assertThat(cutoff.enforced(false, false, LocalDate.of(2027, 1, 15))).as("the day itself").isFalse();
    }

    @Test
    void leavingTheHeaderOffNeverGetsTheFreeCallBack() {
        ClientFeatures cutoff = new ClientFeatures("X-Keel-Features", "locked-calls", LocalDate.of(2027, 1, 15));

        assertThat(cutoff.enforced(true, false, LocalDate.of(2026, 12, 1))).as("says it shows locked calls").isTrue();
        assertThat(cutoff.enforced(false, true, LocalDate.of(2026, 12, 1))).as("the account said so once").isTrue();
    }

    @Test
    void afterTheCutoffTheHeaderIsIrrelevant() {
        ClientFeatures cutoff = new ClientFeatures("X-Keel-Features", "locked-calls", LocalDate.of(2027, 1, 15));

        assertThat(cutoff.enforced(false, false, LocalDate.of(2027, 1, 16))).isTrue();
        assertThat(cutoff.enforced(false, false, LocalDate.of(2030, 1, 1))).isTrue();
    }

    @Test
    void aPhoneListingTheTokenShowsLockedCalls() {
        assertThat(features.showsLockedCalls("locked-calls")).isTrue();
        assertThat(features.showsLockedCalls("other, Locked-Calls ,more")).isTrue();
        assertThat(features.showsLockedCalls("LOCKED-CALLS")).isTrue();
    }

    @Test
    void theOneBeforeTheFeatureSaysNothingOrSomethingElse() {
        assertThat(features.showsLockedCalls((String) null)).isFalse();
        assertThat(features.showsLockedCalls("")).isFalse();
        assertThat(features.showsLockedCalls("locked-calls-v2, unlocked")).isFalse();
    }
}
