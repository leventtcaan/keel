package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * Which language model answers is configuration (K-503, ADR-004, ADR-042): the provider, the model, the output limit and
 * the prices come from keel.coach, never from code (K2). Until a provider is chosen (K-511, ADR-041) the only one is the
 * fake; a name the server does not know stops it from starting rather than calling nobody knows what.
 */
class LanguageModelConfigurationTests {

    private static final Map<Purpose, String> TYPES = Map.of(Purpose.EXPLAIN, "coach question", Purpose.PARSE_MEAL, "meal note");

    private static CoachProperties properties(String provider) {
        return new CoachProperties(provider, "Example AI", "fake-model", 400, new BigDecimal("0.10"), new BigDecimal("0.40"), TYPES);
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
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", 0, BigDecimal.ZERO, BigDecimal.ZERO, TYPES));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", null, BigDecimal.ZERO, BigDecimal.ZERO, TYPES))
                .withMessageContaining("max-output");
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", 400, new BigDecimal("-1"), BigDecimal.ZERO, TYPES));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", 400, BigDecimal.ZERO, new BigDecimal("-1"), TYPES));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", " ", 400, BigDecimal.ZERO, BigDecimal.ZERO, TYPES));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties(null, "AI", "m", 400, BigDecimal.ZERO, BigDecimal.ZERO, TYPES));
        // Every purpose names the data it carries, as the consent does (V2, K-505).
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", 400, BigDecimal.ZERO, BigDecimal.ZERO,
                Map.of(Purpose.EXPLAIN, "coach question"))).withMessageContaining("data-types");
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", 400, BigDecimal.ZERO, BigDecimal.ZERO,
                Map.of(Purpose.EXPLAIN, " ", Purpose.PARSE_MEAL, "meal note")));
        // Who the calls go to, as the consent names it (V2): never left out.
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", " ", "m", 400, BigDecimal.ZERO, BigDecimal.ZERO, TYPES));
    }

    @Test
    void aCallCostsItsTokensAtThePricesPerMillion() {
        // 1,200 in at 0.10 and 300 out at 0.40 per million tokens: 0.00012 + 0.00012 = 0.00024.
        assertThat(properties("fake").cost(new ModelReply("{}", 1200, 300))).isEqualByComparingTo("0.00024");
        assertThat(properties("fake").cost(new ModelReply("{}", 0, 0))).isEqualByComparingTo("0");
    }

    @Test
    void aServerWithoutTheCoachsSettingsDoesNotStart() {
        // Bound from keel.coach as the server binds it: nothing set, or the output limit left out, stops it with the reason.
        ApplicationContextRunner runner = new ApplicationContextRunner().withUserConfiguration(LanguageModelConfiguration.class);
        runner.run(context -> assertThat(context).hasFailed().getFailure().rootCause().hasMessageContaining("keel.coach needs a provider"));
        runner.withPropertyValues("keel.coach.provider=fake", "keel.coach.provider-name=Example AI", "keel.coach.model=m",
                        "keel.coach.input-price-per-million=0", "keel.coach.output-price-per-million=0",
                        "keel.coach.data-types.explain=coach question", "keel.coach.data-types.parse-meal=meal note")
                .run(context -> assertThat(context).hasFailed().getFailure().rootCause().hasMessageContaining("max-output"));
        runner.withPropertyValues("keel.coach.provider=fake", "keel.coach.provider-name=Example AI", "keel.coach.model=m", "keel.coach.max-output=300",
                        "keel.coach.input-price-per-million=0.10", "keel.coach.output-price-per-million=0.40",
                        "keel.coach.data-types.explain=coach question", "keel.coach.data-types.parse-meal=meal note")
                .run(context -> assertThat(context).hasSingleBean(LanguageModel.class).getBean(CoachProperties.class)
                        .satisfies(bound -> assertThat(bound.inputPricePerMillion()).isEqualByComparingTo("0.10")));
    }
}
