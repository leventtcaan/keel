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
 * fake; a name the server does not know stops it from starting rather than calling nobody knows what. In production
 * (keel.production, K-907) the fake does not start — it keeps the last requests in memory (M8 inventory gap 7) — and
 * "off" is the coach without a model: nothing goes anywhere, nothing is kept (ADR-064 #5).
 */
class LanguageModelConfigurationTests {

    private static final Map<Purpose, String> TYPES = Map.of(Purpose.EXPLAIN, "coach question", Purpose.PARSE_MEAL, "meal note", Purpose.PHOTO_MEAL,
            "meal photo");

    private static CoachProperties properties(String provider) {
        return new CoachProperties(provider, "Example AI", "fake-model", 400, new BigDecimal("0.10"), new BigDecimal("0.40"), TYPES, 2000, 400);
    }

    @Test
    void theFakeProviderIsTheFake() {
        assertThat(LanguageModelConfiguration.languageModel(properties("fake"), false)).isInstanceOf(FakeLanguageModel.class);
    }

    @Test
    void aProviderTheServerDoesNotKnowStopsItFromStarting() {
        assertThatIllegalStateException().isThrownBy(() -> LanguageModelConfiguration.languageModel(properties("acme"), false))
                .withMessageContaining("acme").withMessageContaining("fake");
    }

    @Test
    void inProductionTheFakeDoesNotStart() {
        assertThatIllegalStateException().isThrownBy(() -> LanguageModelConfiguration.languageModel(properties("fake"), true))
                .withMessageContaining("fake").withMessageContaining("production");
    }

    @Test
    void offIsAModelThatNeverAnswersAndKeepsNothing() {
        LanguageModel off = LanguageModelConfiguration.languageModel(properties("off"), true);
        assertThat(off).isInstanceOf(OffLanguageModel.class);
        assertThat(LanguageModelConfiguration.languageModel(properties("off"), false)).isInstanceOf(OffLanguageModel.class);

        // Never called while no AI consent can be given; if it were, it fails as a provider that is down — no reply made up.
        ModelRequest request = new ModelRequest(Purpose.EXPLAIN, "m", 400, "system", java.util.List.of(Turn.user("why?")));
        assertThatIllegalStateException().isThrownBy(() -> off.complete(request)).withMessageContaining("off");
        assertThat(OffLanguageModel.class.getDeclaredFields()).as("keeps nothing of a request").isEmpty();
    }

    @Test
    void theLimitsAndPricesAreRealOnes() {
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", 0, BigDecimal.ZERO, BigDecimal.ZERO, TYPES, 2000, 400));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", null, BigDecimal.ZERO, BigDecimal.ZERO, TYPES, 2000, 400))
                .withMessageContaining("max-output");
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", 400, new BigDecimal("-1"), BigDecimal.ZERO, TYPES, 2000, 400));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", 400, BigDecimal.ZERO, new BigDecimal("-1"), TYPES, 2000, 400));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", " ", 400, BigDecimal.ZERO, BigDecimal.ZERO, TYPES, 2000, 400));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties(null, "AI", "m", 400, BigDecimal.ZERO, BigDecimal.ZERO, TYPES, 2000, 400));
        // Every purpose names the data it carries, as the consent does (V2, K-505).
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", 400, BigDecimal.ZERO, BigDecimal.ZERO,
                Map.of(Purpose.EXPLAIN, "coach question"), 2000, 400)).withMessageContaining("data-types");
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", 400, BigDecimal.ZERO, BigDecimal.ZERO,
                Map.of(Purpose.EXPLAIN, " ", Purpose.PARSE_MEAL, "meal note", Purpose.PHOTO_MEAL, "meal photo"), 2000, 400));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "AI", "m", 400, BigDecimal.ZERO, BigDecimal.ZERO, TYPES, 2000, 0));
        // Who the calls go to, as the consent names it (V2): never left out.
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", " ", "m", 400, BigDecimal.ZERO, BigDecimal.ZERO, TYPES, 2000, 400));
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
                        "keel.coach.data-types.explain=coach question", "keel.coach.data-types.parse-meal=meal note", "keel.coach.data-types.photo-meal=meal photo",
                        "keel.coach.max-question-chars=2000", "keel.coach.max-reply-chars=400")
                .run(context -> assertThat(context).hasFailed().getFailure().rootCause().hasMessageContaining("max-output"));
        runner.withPropertyValues("keel.production=false", "keel.coach.provider=fake", "keel.coach.provider-name=Example AI", "keel.coach.model=m", "keel.coach.max-output=300",
                        "keel.coach.input-price-per-million=0.10", "keel.coach.output-price-per-million=0.40",
                        "keel.coach.data-types.explain=coach question", "keel.coach.data-types.parse-meal=meal note", "keel.coach.data-types.photo-meal=meal photo",
                        "keel.coach.max-question-chars=2000", "keel.coach.max-reply-chars=400")
                .run(context -> assertThat(context).hasSingleBean(LanguageModel.class).getBean(CoachProperties.class)
                        .satisfies(bound -> assertThat(bound.inputPricePerMillion()).isEqualByComparingTo("0.10")));
    }
}
