package app.keel.shared.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.shared.RateLimitGroup;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

/** keel.rate-limit (K-817): every group has its numbers, and a wrong number stops the server at start rather than limiting nobody. */
class RateLimitPropertiesTests {

    private static Map<String, String> allGroups() {
        Map<String, String> values = new HashMap<>();
        values.put("keel.rate-limit.max-account-keys", "500");
        values.put("keel.rate-limit.max-address-keys", "50");
        for (String group : new String[] {"sign-in", "apple-revocation", "coach", "meal-photo"}) {
            values.put("keel.rate-limit.groups." + group + ".burst", "4");
            values.put("keel.rate-limit.groups." + group + ".refill-every", "20s");
        }
        return values;
    }

    private static RateLimitProperties bind(Map<String, String> values) {
        return new Binder(new MapConfigurationPropertySource(values)).bind("keel.rate-limit", RateLimitProperties.class).get();
    }

    @Test
    void theGroupsAreTheEnumsAndEachHasItsBurstAndRefill() {
        RateLimitProperties properties = bind(allGroups());

        assertThat(properties.maxAccountKeys()).isEqualTo(500);
        assertThat(properties.maxAddressKeys()).isEqualTo(50);
        assertThat(properties.groups()).containsOnlyKeys(RateLimitGroup.values());
        assertThat(properties.rule(RateLimitGroup.APPLE_REVOCATION)).isEqualTo(new RateLimitProperties.Rule(4, Duration.ofSeconds(20)));
    }

    @Test
    void aGroupWithoutNumbersStopsTheServer() {
        Map<String, String> values = allGroups();
        values.remove("keel.rate-limit.groups.coach.burst");
        values.remove("keel.rate-limit.groups.coach.refill-every");

        assertThatThrownBy(() -> bind(values)).hasRootCauseInstanceOf(IllegalArgumentException.class)
                .rootCause().hasMessageContaining("COACH");
    }

    @Test
    void aBurstBelowOneOrARefillOfNoTimeStopsTheServer() {
        Map<String, String> noBurst = allGroups();
        noBurst.put("keel.rate-limit.groups.sign-in.burst", "0");
        Map<String, String> noRefill = allGroups();
        noRefill.put("keel.rate-limit.groups.sign-in.refill-every", "0s");
        Map<String, String> noKeys = allGroups();
        noKeys.put("keel.rate-limit.max-address-keys", "0");

        assertThatThrownBy(() -> bind(noBurst)).hasRootCauseInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> bind(noRefill)).hasRootCauseInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> bind(noKeys)).hasRootCauseInstanceOf(IllegalArgumentException.class);
    }
}
