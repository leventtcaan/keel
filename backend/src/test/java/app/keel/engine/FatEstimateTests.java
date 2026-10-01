package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Optional;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/**
 * The engine's internal fat estimate (K-224, ADR-027 #11; U4: never shown): from waist and height (RFM, Woolcott &
 * Bergman 2018, H8 A1) and from the reference look the user picks (Ö-4); when both exist, both are kept and each rule
 * reads the one cautious for it (H8 C, ADR-027 #11).
 */
class FatEstimateTests {

    private static final Parameters MALE = parameters(Sex.MALE);
    private static final Parameters FEMALE = parameters(Sex.FEMALE);

    @Test
    void relativeFatMassIsSixtyFourLessTwentyTimesHeightOverWaistPlusTwelveForWomen() {
        // A man 180 cm, waist 90 cm: 64 − 20 × 2 = 24. A woman 165 cm, waist 80 cm: 64 − 41.25 + 12 = 34.75.
        assertThat(FatEstimate.rfm(180, new BigDecimal("90"), MALE)).hasValueSatisfying(pct -> assertThat(pct).isEqualByComparingTo("24"));
        assertThat(FatEstimate.rfm(165, new BigDecimal("80"), FEMALE)).hasValueSatisfying(pct -> assertThat(pct).isEqualByComparingTo("34.75"));
    }

    @Test
    void aWaistNoBodyCouldHaveGivesNoEstimate() {
        // K-224 review: 9 typed for 90 at 180 cm is RFM −336 %; read as a fat estimate it made a fat-free mass larger than
        // the body and a calorie floor of ~8,700 kcal. Under essential fat's low end (J1 B2: men 2, women 10) the waist is
        // wrong, so there is no estimate — not a clamped one.
        assertThat(FatEstimate.rfm(180, new BigDecimal("9.0"), MALE)).isEmpty();
        assertThat(FatEstimate.rfm(180, new BigDecimal("35"), MALE)).as("inches typed as cm").isEmpty();
        // On the line it stands: 186 / 60 = 3.1 → 64 − 62 = 2; 165 / 50 = 3.3 → 64 − 66 + 12 = 10.
        assertThat(FatEstimate.rfm(186, new BigDecimal("60"), MALE)).hasValueSatisfying(pct -> assertThat(pct).isEqualByComparingTo("2"));
        assertThat(FatEstimate.rfm(186, new BigDecimal("59.9"), MALE)).isEmpty();
        assertThat(FatEstimate.rfm(165, new BigDecimal("50"), FEMALE)).hasValueSatisfying(pct -> assertThat(pct).isEqualByComparingTo("10"));
        assertThat(FatEstimate.rfm(165, new BigDecimal("49.9"), FEMALE)).isEmpty();
    }

    @Test
    void aLookLevelIsItsBandFromTheFirstInEvenSteps() {
        // Men from 10 %, women from 20 % (J1 B1: +10), in steps of 5.
        assertThat(FatEstimate.fromLook(1, MALE)).isEqualByComparingTo("10");
        assertThat(FatEstimate.fromLook(3, MALE)).isEqualByComparingTo("20");
        assertThat(FatEstimate.fromLook(3, FEMALE)).isEqualByComparingTo("30");
    }

    @Test
    void twoEstimatesKeepTheLowerAndTheHigherAndOneAloneIsBoth() {
        // K-224 review, ADR-027 #11 "the cautious one": which one is cautious depends on the rule, so neither is dropped.
        BigDecimal twenty = new BigDecimal("20");
        BigDecimal twentyFour = new BigDecimal("24");
        assertThat(FatEstimate.of(Optional.of(twenty), Optional.of(twentyFour))).contains(new FatEstimate.Estimate(twenty, twentyFour));
        assertThat(FatEstimate.of(Optional.of(twentyFour), Optional.of(twenty))).contains(new FatEstimate.Estimate(twenty, twentyFour));
        assertThat(FatEstimate.of(Optional.empty(), Optional.of(twentyFour))).contains(new FatEstimate.Estimate(twentyFour, twentyFour));
        assertThat(FatEstimate.of(Optional.of(twenty), Optional.empty())).contains(new FatEstimate.Estimate(twenty, twenty));
        assertThat(FatEstimate.of(Optional.empty(), Optional.empty())).isEmpty();
    }

    @Test
    void theLowEnergyRuleReadsTheWaistsEstimateAtItsCautiousEnd() {
        // K-230, ADR-028 #22 (c): RFM's 90 % band is about ± 5 points for men and ± 6 for women (H8 A3). Less fat is the
        // cautious end for energy availability — more fat-free mass, a higher floor. 24 → 19; 34.75 → 28.75.
        assertThat(FatEstimate.forEnergy(Optional.empty(), Optional.of(new BigDecimal("24")), MALE))
                .hasValueSatisfying(pct -> assertThat(pct).isEqualByComparingTo("19"));
        assertThat(FatEstimate.forEnergy(Optional.empty(), Optional.of(new BigDecimal("34.75")), FEMALE))
                .hasValueSatisfying(pct -> assertThat(pct).isEqualByComparingTo("28.75"));
    }

    @Test
    void theLookStandsAsItIsAndOfTheTwoTheCautiousIsRead() {
        // The look has no measured band (Ö-4); with the waist too, the lower of the look and the waist's cautious end
        // (ADR-027 #11: "the cautious one").
        BigDecimal look = new BigDecimal("20");
        assertThat(FatEstimate.forEnergy(Optional.of(look), Optional.empty(), MALE)).hasValueSatisfying(pct -> assertThat(pct).isEqualByComparingTo("20"));
        assertThat(FatEstimate.forEnergy(Optional.of(look), Optional.of(new BigDecimal("24")), MALE))
                .hasValueSatisfying(pct -> assertThat(pct).isEqualByComparingTo("19"));
        assertThat(FatEstimate.forEnergy(Optional.of(new BigDecimal("15")), Optional.of(new BigDecimal("24")), MALE))
                .hasValueSatisfying(pct -> assertThat(pct).isEqualByComparingTo("15"));
        assertThat(FatEstimate.forEnergy(Optional.empty(), Optional.empty(), MALE)).isEmpty();
    }

    @Test
    void theCautiousEndStopsAtEssentialFat() {
        // No body is under essential fat's low end (J1 B2: men 2, women 10): 5 − 5 = 0 reads 2, 13 − 6 = 7 reads 10.
        assertThat(FatEstimate.forEnergy(Optional.empty(), Optional.of(new BigDecimal("5")), MALE))
                .hasValueSatisfying(pct -> assertThat(pct).isEqualByComparingTo("2"));
        assertThat(FatEstimate.forEnergy(Optional.empty(), Optional.of(new BigDecimal("13")), FEMALE))
                .hasValueSatisfying(pct -> assertThat(pct).isEqualByComparingTo("10"));
    }

    @Property
    boolean theEnergyEndIsBetweenEssentialFatAndTheLowerEstimate(@ForAll Sex sex, @ForAll @IntRange(min = 0, max = 600) int tenthsOverTheMin,
            @ForAll @IntRange(min = 0, max = 7) int lookLevel) {
        Parameters p = parameters(sex);
        BigDecimal min = BigDecimal.valueOf(p.number(ParameterKey.RFM_PLAUSIBLE_MIN_PCT));
        Optional<BigDecimal> waist = Optional.of(min.add(BigDecimal.valueOf(tenthsOverTheMin, 1)));
        Optional<BigDecimal> look = lookLevel == 0 ? Optional.empty() : Optional.of(FatEstimate.fromLook(lookLevel, p));

        BigDecimal energy = FatEstimate.forEnergy(look, waist, p).orElseThrow();

        return energy.compareTo(min) >= 0 && energy.compareTo(FatEstimate.of(look, waist).orElseThrow().lowerPct()) <= 0;
    }

    @Test
    void theLevelsAreTheParameterFilesCount() {
        assertThat(FatEstimate.levels(MALE)).isEqualTo(7);
    }
}
