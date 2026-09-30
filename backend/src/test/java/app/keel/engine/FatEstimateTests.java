package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * The engine's internal fat estimate (K-224, ADR-027 #11; U4: never shown): from waist and height (RFM, Woolcott &
 * Bergman 2018, H8 A1) and from the reference look the user picks (Ö-4); when both exist, the smaller — the one the
 * safety rules read most protectively (H8 C).
 */
class FatEstimateTests {

    private static final Parameters MALE = parameters(Sex.MALE);
    private static final Parameters FEMALE = parameters(Sex.FEMALE);

    @Test
    void relativeFatMassIsSixtyFourLessTwentyTimesHeightOverWaistPlusTwelveForWomen() {
        // A man 180 cm, waist 90 cm: 64 − 20 × 2 = 24. A woman 165 cm, waist 80 cm: 64 − 41.25 + 12 = 34.75.
        assertThat(FatEstimate.rfm(180, new BigDecimal("90"), MALE)).isEqualByComparingTo("24");
        assertThat(FatEstimate.rfm(165, new BigDecimal("80"), FEMALE)).isEqualByComparingTo("34.75");
    }

    @Test
    void aLookLevelIsItsBandFromTheFirstInEvenSteps() {
        // Men from 10 %, women from 20 % (J1 B1: +10), in steps of 5.
        assertThat(FatEstimate.fromLook(1, MALE)).isEqualByComparingTo("10");
        assertThat(FatEstimate.fromLook(3, MALE)).isEqualByComparingTo("20");
        assertThat(FatEstimate.fromLook(3, FEMALE)).isEqualByComparingTo("30");
    }

    @Test
    void theSmallerOfTheTwoIsTheEstimateAndOneAloneIsItself() {
        assertThat(FatEstimate.of(Optional.of(new BigDecimal("20")), Optional.of(new BigDecimal("24")))).contains(new BigDecimal("20"));
        assertThat(FatEstimate.of(Optional.empty(), Optional.of(new BigDecimal("24")))).contains(new BigDecimal("24"));
        assertThat(FatEstimate.of(Optional.of(new BigDecimal("30")), Optional.empty())).contains(new BigDecimal("30"));
        assertThat(FatEstimate.of(Optional.empty(), Optional.empty())).isEmpty();
    }

    @Test
    void theLevelsAreTheParameterFilesCount() {
        assertThat(FatEstimate.levels(MALE)).isEqualTo(7);
    }
}
