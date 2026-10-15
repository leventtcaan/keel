package app.keel.shared.web;

import app.keel.shared.RateLimitGroup;
import java.time.Duration;
import java.util.EnumMap;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * keel.rate-limit (K-817, K2): the memory bound of each table (accounts and addresses are kept apart, so a flood of
 * addresses on a route anyone can call cannot make room in the table that guards what costs money), and for every
 * group its rule. A missing group or a number that limits nothing stops the server at start.
 */
@ConfigurationProperties("keel.rate-limit")
public record RateLimitProperties(int maxAccountKeys, int maxAddressKeys, Map<RateLimitGroup, Rule> groups) {

    /** A client may make {@code burst} requests at once and then one more every {@code refillEvery}. */
    public record Rule(int burst, Duration refillEvery) {

        public Rule {
            if (burst < 1) {
                throw new IllegalArgumentException("burst must be at least 1");
            }
            if (refillEvery == null || refillEvery.toMillis() < 1) {
                throw new IllegalArgumentException("refill-every must be at least 1 ms");
            }
        }
    }

    public RateLimitProperties {
        if (maxAccountKeys < 1 || maxAddressKeys < 1) {
            throw new IllegalArgumentException("keel.rate-limit.max-account-keys and max-address-keys must be at least 1");
        }
        Map<RateLimitGroup, Rule> all = new EnumMap<>(RateLimitGroup.class);
        if (groups != null) {
            all.putAll(groups);
        }
        for (RateLimitGroup group : RateLimitGroup.values()) {
            if (all.get(group) == null) {
                throw new IllegalArgumentException("keel.rate-limit.groups has no rule for " + group.name());
            }
        }
        groups = Map.copyOf(all);
    }

    public Rule rule(RateLimitGroup group) {
        return groups.get(group);
    }
}
