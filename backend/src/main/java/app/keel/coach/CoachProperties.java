package app.keel.coach;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.EnumSet;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Which language model the coach uses and what it costs (K-503, keel.coach; ADR-004: never in code, K2). {@code provider}
 * names an adapter the server has; {@code providerName} is who it sends to, as the AI consent names it (V2: a call goes
 * only where the user agreed); {@code dataTypes} what each purpose carries, as the consent names it. The provider ("fake" until K-511 chooses one, ADR-041); the output limit is in tokens; prices are
 * per million tokens, as providers list them. A missing or impossible value stops the server from starting.
 */
@ConfigurationProperties("keel.coach")
record CoachProperties(String provider, String providerName, String model, Integer maxOutput, BigDecimal inputPricePerMillion, BigDecimal outputPricePerMillion,
        Map<Purpose, String> dataTypes) {

    private static final BigDecimal MILLION = BigDecimal.valueOf(1_000_000);

    CoachProperties {
        if (provider == null || provider.isBlank() || providerName == null || providerName.isBlank() || model == null || model.isBlank()) {
            throw new IllegalStateException("keel.coach needs a provider, the provider's name as the AI consent states it, and a model");
        }
        if (maxOutput == null || maxOutput < 1) {
            throw new IllegalStateException("keel.coach.max-output (tokens) must be at least 1, was " + maxOutput);
        }
        if (dataTypes == null || !dataTypes.keySet().containsAll(EnumSet.allOf(Purpose.class))
                || dataTypes.values().stream().anyMatch(type -> type == null || type.isBlank())) {
            throw new IllegalStateException("keel.coach.data-types names, for every purpose, the data the AI consent calls it (V2)");
        }
        dataTypes = Map.copyOf(dataTypes);
        if (inputPricePerMillion == null || outputPricePerMillion == null || inputPricePerMillion.signum() < 0
                || outputPricePerMillion.signum() < 0) {
            throw new IllegalStateException("keel.coach prices are per million tokens, 0 or more");
        }
    }

    /** What a reply cost at these prices. */
    BigDecimal cost(ModelReply reply) {
        return inputPricePerMillion.multiply(BigDecimal.valueOf(reply.inputTokens())).add(outputPricePerMillion.multiply(BigDecimal.valueOf(reply.outputTokens())))
                .divide(MILLION, MathContext.DECIMAL64);
    }
}
