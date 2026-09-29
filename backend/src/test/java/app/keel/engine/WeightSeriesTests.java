package app.keel.engine;

import static app.keel.engine.EngineFixtures.weighIn;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/** A weight series is ordered by date, one weigh-in per day, and cannot be changed after it is built. */
class WeightSeriesTests {

    private static final LocalDate MON = LocalDate.of(2026, 9, 28);

    @Test
    void ordersWeighInsByDate() {
        WeightSeries series = new WeightSeries(List.of(weighIn(MON.plusDays(2), "80.1"), weighIn(MON, "80.5")));

        assertThat(series.weighIns()).extracting(WeighIn::date).containsExactly(MON, MON.plusDays(2));
    }

    @Test
    void rejectsTwoWeighInsOnTheSameDay() {
        assertThatThrownBy(() -> new WeightSeries(List.of(weighIn(MON, "80.5"), weighIn(MON, "80.1"))))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining(MON.toString());
    }

    @Test
    void isNotChangedByLaterEditsToTheCallersList() {
        List<WeighIn> callers = new ArrayList<>(List.of(weighIn(MON, "80.5")));
        WeightSeries series = new WeightSeries(callers);

        callers.clear();

        assertThat(series.weighIns()).hasSize(1);
    }

    @Test
    void rejectsAZeroOrNegativeWeight() {
        assertThatThrownBy(() -> new WeighIn(MON, BigDecimal.ZERO)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new WeighIn(MON, new BigDecimal("-80"))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void knowsItsFirstDayAndCountsDaysInARange() {
        WeightSeries series = new WeightSeries(List.of(
                weighIn(MON, "80.5"), weighIn(MON.plusDays(3), "80.2"), weighIn(MON.plusDays(9), "79.9")));

        assertThat(series.firstDay()).contains(MON);
        assertThat(series.countBetween(MON.plusDays(1), MON.plusDays(9))).isEqualTo(2);
        assertThat(series.countBetween(MON, MON.plusDays(3))).as("both ends included").isEqualTo(2);
        assertThat(new WeightSeries(List.of()).firstDay()).isEmpty();
    }
}
