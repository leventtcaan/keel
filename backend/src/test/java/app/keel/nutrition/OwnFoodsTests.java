package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/** An own food is typed for one serving and stored per 100 g (K-1063): the conversion is the one thing here that is arithmetic. */
class OwnFoodsTests {

    @Test
    void aServingsNumbersBecomeThePer100GramsOnes() {
        // A 30 g bar with 120 kcal is 400 kcal per 100 g.
        assertThat(OwnFoods.per100g(new BigDecimal("120"), new BigDecimal("30"))).isEqualByComparingTo("400");
        assertThat(OwnFoods.per100g(new BigDecimal("72"), new BigDecimal("50"))).isEqualByComparingTo("144");
    }

    @Test
    void aServingOfOneHundredGramsIsItsOwnPer100() {
        assertThat(OwnFoods.per100g(new BigDecimal("250.5"), new BigDecimal("100"))).isEqualByComparingTo("250.5");
    }

    @Test
    void theFractionIsKeptToTwoDecimalsAndRoundedHalfUp() {
        // 1 g of protein in a 30 g serving: 3.333... per 100 g.
        assertThat(OwnFoods.per100g(BigDecimal.ONE, new BigDecimal("30"))).isEqualByComparingTo("3.33");
        assertThat(OwnFoods.per100g(new BigDecimal("2"), new BigDecimal("30"))).isEqualByComparingTo("6.67");
    }
}
