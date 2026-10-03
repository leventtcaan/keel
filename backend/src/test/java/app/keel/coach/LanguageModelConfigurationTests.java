package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/**
 * Which language model answers is configuration (K-503, ADR-004, ADR-042): the provider, the model, the output limit and
 * the prices come from keel.coach, never from code (K2). Until a provider is chosen (K-511, ADR-041) the only one is the
 * fake; a name the server does not know stops it from starting rather than calling nobody knows what.
 */
class LanguageModelConfigurationTests {

    private static CoachProperties properties(String provider) {
        return new CoachProperties(provider, "fake-model", 400, new BigDecimal("0.10"), new BigDecimal("0.40"));
    }

    @Test
    void theFakeProviderIsTheFake() {
        assertThat(LanguageModelConfiguration.languageModel(properties("fake"))).isInstanceOf(FakeLanguageModel.class);
    }

    @Test
    void aProviderTheServerDoesNotKnowStopsItFromStarting() {
        assertThatIllegalStateException().isThrownBy(() -> LanguageModelConfiguration.languageModel(properties("acme")))
                .withMessageContaining("acme").withMessageContaining("fake");
    }

    @Test
    void theLimitsAndPricesAreRealOnes() {
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "m", 0, BigDecimal.ZERO, BigDecimal.ZERO));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "m", 400, new BigDecimal("-1"), BigDecimal.ZERO));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", " ", 400, BigDecimal.ZERO, BigDecimal.ZERO));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties(null, "m", 400, BigDecimal.ZERO, BigDecimal.ZERO));
    }

    @Test
    void aCallCostsItsTokensAtThePricesPerMillion() {
        // 1,200 in at 0.10 and 300 out at 0.40 per million tokens: 0.00012 + 0.00012 = 0.00024.
        assertThat(properties("fake").cost(new ModelReply("{}", 1200, 300))).isEqualByComparingTo("0.00024");
        assertThat(properties("fake").cost(new ModelReply("{}", 0, 0))).isEqualByComparingTo("0");
    }
}
