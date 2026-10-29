package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Household measures as text (K-1061): the count, what it counts, volumes in millilitres, weights in grams. */
class MeasuresTests {

    @Test
    void theCountIsWholeDecimalFractionOrMixed() {
        assertThat(Measures.parse("1 large").orElseThrow()).isEqualTo(new Measures.Label(new java.math.BigDecimal("1"), "large"));
        assertThat(Measures.parse("1.5 cup").orElseThrow().count()).isEqualByComparingTo("1.5");
        assertThat(Measures.parse("2/3 cup (55 g)").orElseThrow().count()).isEqualByComparingTo("0.6667");
        assertThat(Measures.parse("1 1/2 tbsp").orElseThrow().count()).isEqualByComparingTo("1.5");
        assertThat(Measures.parse("1 1/2 tbsp").orElseThrow().what()).isEqualTo("tbsp");
    }

    @Test
    void textWithoutALeadingPositiveNumberIsNoMeasure() {
        assertThat(Measures.parse("Amount per serving")).isEmpty();
        assertThat(Measures.parse("PER CONTAINER")).isEmpty();
        assertThat(Measures.parse("0 cup")).isEmpty();
        assertThat(Measures.parse(null)).isEmpty();
        assertThat(Measures.parse("")).isEmpty();
    }

    @Test
    void volumesAreUsCustomaryMillilitres() {
        assertThat(Measures.millilitres("1 cup").orElseThrow()).isEqualByComparingTo("236.588");
        assertThat(Measures.millilitres("2 tbsp").orElseThrow()).isEqualByComparingTo("29.5736");
        assertThat(Measures.millilitres("1 cup, chopped").orElseThrow()).isEqualByComparingTo("236.588");
        assertThat(Measures.millilitres("1 fl oz").orElseThrow()).isEqualByComparingTo("29.5735");
        assertThat(Measures.millilitres("1 Tbsp (15 ml)").orElseThrow()).isEqualByComparingTo("14.7868");
        assertThat(Measures.millilitres("240 ml").orElseThrow()).isEqualByComparingTo("240");
    }

    @Test
    void aUnitMustEndAtAWordEnd() {
        assertThat(Measures.isVolume("1 cupcake")).isFalse();
        assertThat(Measures.isVolume("1 large")).isFalse();
        assertThat(Measures.isVolume("1 lb")).as("l is a litre but lb is a weight").isFalse();
        assertThat(Measures.isWeight("1 lb")).isTrue();
        assertThat(Measures.isWeight("1 gallon")).as("g is a gram but gallon is a volume").isFalse();
        assertThat(Measures.isVolume("1 gallon")).isTrue();
    }

    @Test
    void anOunceOfWeightIsNotAFluidOunce() {
        assertThat(Measures.isWeight("3 oz")).isTrue();
        assertThat(Measures.isVolume("3 oz")).isFalse();
        assertThat(Measures.isVolume("3 fl oz")).isTrue();
        assertThat(Measures.isWeight("3 fl oz")).isFalse();
        assertThat(Measures.grams("3 oz").orElseThrow()).isBetween(new java.math.BigDecimal("85.0485"), new java.math.BigDecimal("85.0486"));
    }
}
