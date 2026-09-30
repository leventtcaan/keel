package app.keel.measurement;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.CheckIn;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * What the week's photo checks say (K-213): the latest one in the days given, as the phone compared it. The photo's
 * verdict goes into the Snapshot, so which check counts must not depend on anything but the checks themselves.
 */
class PhotoLookTests {

    private static final LocalDate FROM = LocalDate.of(2026, 9, 22);
    private static final LocalDate TO = LocalDate.of(2026, 9, 30);

    @Test
    void theLatestCheckInTheDaysCounts() {
        assertThat(Measurements.latestLook(List.of(check(23, MeasurementStore.Look.WORSE), check(29, MeasurementStore.Look.BETTER)), FROM, TO))
                .contains(CheckIn.Look.BETTER);
    }

    @Test
    void checksOutsideTheDaysDoNotCount() {
        assertThat(Measurements.latestLook(List.of(check(21, MeasurementStore.Look.WORSE)), FROM, TO)).isEmpty();
        assertThat(Measurements.latestLook(List.of(check(22, MeasurementStore.Look.WORSE)), FROM, TO)).as("the first day is in")
                .contains(CheckIn.Look.WORSE);
        assertThat(Measurements.latestLook(List.of(check(30, MeasurementStore.Look.SAME)), FROM, TO)).as("the last day is in")
                .contains(CheckIn.Look.SAME);
    }

    @Test
    void twoChecksThatDisagreeOnTheLatestDaySayNothing() {
        // Which one was saved first is not known (the day has no time): the day's verdict is unclear, not guessed (U3).
        UUID low = new UUID(0, 1);
        UUID high = new UUID(0, 2);
        List<MeasurementStore.PhotoCheck> worseFirst = List.of(check(low, 29, MeasurementStore.Look.WORSE), check(high, 29, MeasurementStore.Look.BETTER));
        List<MeasurementStore.PhotoCheck> betterFirst = List.of(check(low, 29, MeasurementStore.Look.BETTER), check(high, 29, MeasurementStore.Look.WORSE));

        assertThat(Measurements.latestLook(worseFirst, FROM, TO)).isEmpty();
        assertThat(Measurements.latestLook(betterFirst, FROM, TO)).isEmpty();
        assertThat(Measurements.latestLook(List.of(check(29, MeasurementStore.Look.SAME), check(29, MeasurementStore.Look.SAME)), FROM, TO))
                .as("two checks that agree").contains(CheckIn.Look.SAME);
    }

    private static MeasurementStore.PhotoCheck check(int dayOfSeptember, MeasurementStore.Look look) {
        return check(UUID.randomUUID(), dayOfSeptember, look);
    }

    private static MeasurementStore.PhotoCheck check(UUID id, int dayOfSeptember, MeasurementStore.Look look) {
        return new MeasurementStore.PhotoCheck(id, UUID.randomUUID(), LocalDate.of(2026, 9, dayOfSeptember), look);
    }
}
