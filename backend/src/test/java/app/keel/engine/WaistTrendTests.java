package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Where the waist went over the decision window (K-213): the last measurement against the first, a change within the
 * tape's own error (waist_measurement_error_cm, H1 §1.2) is flat. Fewer than two days measured: unknown — asked, not guessed.
 */
class WaistTrendTests {

    private static final Parameters P = parameters(Sex.MALE);
    private static final LocalDate DAY = LocalDate.of(2026, 9, 7);

    @Test
    void beyondTheTapesErrorIsAMove() {
        assertThat(WaistTrend.direction(List.of(reading(0, "90.0"), reading(14, "88.5")), P)).isEqualTo(CheckIn.Waist.DOWN);
        assertThat(WaistTrend.direction(List.of(reading(0, "90.0"), reading(14, "91.5")), P)).isEqualTo(CheckIn.Waist.UP);
    }

    @Test
    void withinTheTapesErrorIsFlat() {
        // 1.0 cm is the error: a change of exactly that is not a move.
        assertThat(WaistTrend.direction(List.of(reading(0, "90.0"), reading(14, "89.0")), P)).isEqualTo(CheckIn.Waist.FLAT);
        assertThat(WaistTrend.direction(List.of(reading(0, "90.0"), reading(7, "90.6"), reading(14, "90.9")), P)).isEqualTo(CheckIn.Waist.FLAT);
    }

    @Test
    void theErrorLineHoldsOnTheWayUpAsOnTheWayDown() {
        assertThat(WaistTrend.direction(List.of(reading(0, "90.0"), reading(14, "91.0")), P)).as("exactly the error").isEqualTo(CheckIn.Waist.FLAT);
        assertThat(WaistTrend.direction(List.of(reading(0, "90.0"), reading(14, "91.1")), P)).isEqualTo(CheckIn.Waist.UP);
        assertThat(WaistTrend.direction(List.of(reading(0, "90.0"), reading(14, "88.9")), P)).isEqualTo(CheckIn.Waist.DOWN);
    }

    @Test
    void aDayMeasuredTwiceCountsAsTheMeanOfItsReadingsInAnyOrder() {
        // Two readings on the first day (90.0 and 92.0 → 91.0), 91.5 on the last: within the error, whichever came first.
        assertThat(WaistTrend.direction(List.of(reading(0, "90.0"), reading(0, "92.0"), reading(14, "91.5")), P)).isEqualTo(CheckIn.Waist.FLAT);
        assertThat(WaistTrend.direction(List.of(reading(0, "92.0"), reading(0, "90.0"), reading(14, "91.5")), P)).isEqualTo(CheckIn.Waist.FLAT);
    }

    @Test
    void theFirstAndLastDayCountWhateverTheOrderGiven() {
        assertThat(WaistTrend.direction(List.of(reading(14, "88.0"), reading(7, "95.0"), reading(0, "90.0")), P)).isEqualTo(CheckIn.Waist.DOWN);
    }

    @Test
    void oneDayMeasuredIsUnknown() {
        assertThat(WaistTrend.direction(List.of(), P)).isEqualTo(CheckIn.Waist.UNKNOWN);
        assertThat(WaistTrend.direction(List.of(reading(3, "90.0")), P)).isEqualTo(CheckIn.Waist.UNKNOWN);
        assertThat(WaistTrend.direction(List.of(reading(3, "90.0"), reading(3, "87.0")), P)).as("the same day twice").isEqualTo(CheckIn.Waist.UNKNOWN);
    }

    private static WaistTrend.Reading reading(int day, String cm) {
        return new WaistTrend.Reading(DAY.plusDays(day), new BigDecimal(cm));
    }
}
