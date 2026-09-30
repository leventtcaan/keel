package app.keel.measurement;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** The look the engine reads (K-224): the latest in the days given; two on that day, the lower (H8 C). */
class BodyLookTests {

    private static final LocalDate FROM = LocalDate.of(2026, 7, 1);
    private static final LocalDate TO = LocalDate.of(2026, 9, 30);

    @Test
    void theLatestLookInTheDaysCountsAndTwoOnOneDayGiveTheLower() {
        assertThat(Measurements.latestLevel(List.of(look(8, 1, 4), look(9, 20, 3)), FROM, TO)).contains(3);
        assertThat(Measurements.latestLevel(List.of(look(6, 30, 2)), FROM, TO)).as("before the days").isEmpty();
        assertThat(Measurements.latestLevel(List.of(look(7, 1, 2)), FROM, TO)).as("the first day is in").contains(2);
        assertThat(Measurements.latestLevel(List.of(look(9, 30, 6)), FROM, TO)).as("the last day is in").contains(6);
        assertThat(Measurements.latestLevel(List.of(look(9, 20, 5), look(9, 20, 3)), FROM, TO)).contains(3);
        assertThat(Measurements.latestLevel(List.of(look(9, 20, 3), look(9, 20, 5)), FROM, TO)).contains(3);
    }

    private static MeasurementStore.BodyLook look(int month, int day, int level) {
        return new MeasurementStore.BodyLook(UUID.randomUUID(), UUID.randomUUID(), LocalDate.of(2026, month, day), level);
    }
}
