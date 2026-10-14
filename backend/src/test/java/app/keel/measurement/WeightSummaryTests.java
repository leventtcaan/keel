package app.keel.measurement;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The weight summary (K-1018, ADR-078 Ek 2): how many days have a weigh-in, counted the way the weight trend takes its
 * days, and whether that has reached trend_min_weighins so the phone may show the trend. The rule is pure: weigh-ins and
 * the user's zone in, the summary out.
 */
class WeightSummaryTests {

    private static final ZoneId ISTANBUL = ZoneId.of("Europe/Istanbul");
    private static final LocalDate DAY_1 = LocalDate.of(2026, 9, 1);

    @ParameterizedTest(name = "{0}: {1} weigh-in days, gate {2}, ready = {3}")
    @MethodSource("gate")
    void theTrendIsReadyWhenTheCountReachesTheGate(String name, int days, int gate, boolean ready) {
        WeightSummary summary = WeightSummary.of(daily(days, MeasurementStore.Source.MANUAL), ISTANBUL, gate);

        assertThat(summary.weighInCount()).isEqualTo(days);
        assertThat(summary.trendMinWeighIns()).isEqualTo(gate);
        assertThat(summary.trendReady()).isEqualTo(ready);
    }

    static Stream<Arguments> gate() {
        return Stream.of(
                Arguments.of("none", 0, 7, false),
                Arguments.of("one", 1, 7, false),
                Arguments.of("one below", 6, 7, false),
                Arguments.of("exactly", 7, 7, true),
                Arguments.of("one over", 8, 7, true),
                Arguments.of("a lower gate", 3, 3, true));
    }

    @Test
    void theGateIsTheParameterFilesAndSevenForTheProduct() {
        // ADR-078 Ek 2: the phone shows "3 of 7"; the number lives in windows.yaml, not in any screen. Same for both sexes.
        assertThat(RepositoryParameters.forSex(Sex.MALE).wholeNumber(ParameterKey.TREND_MIN_WEIGHINS)).isEqualTo(7);
        assertThat(RepositoryParameters.forSex(Sex.FEMALE).wholeNumber(ParameterKey.TREND_MIN_WEIGHINS)).isEqualTo(7);
    }

    @Test
    void withNoWeighInThereIsNoLastAndNoTrend() {
        WeightSummary summary = WeightSummary.of(List.of(), ISTANBUL, 7);

        assertThat(summary.last()).isNull();
        assertThat(summary.weighInCount()).isZero();
        assertThat(summary.trendReady()).isFalse();
    }

    @Test
    void importedWeighInsCountLikeTheTrendTakesThem() {
        // The trend shows imported history at once (ADR-053, U8): 4 imported days and 3 of the user's own are 7.
        List<MeasurementStore.WeighIn> weighIns = new ArrayList<>(daily(4, MeasurementStore.Source.IMPORT));
        weighIns.addAll(daily(3, MeasurementStore.Source.APPLE_HEALTH, DAY_1.plusDays(10)));

        WeightSummary summary = WeightSummary.of(weighIns, ISTANBUL, 7);

        assertThat(summary.weighInCount()).isEqualTo(7);
        assertThat(summary.trendReady()).isTrue();
    }

    @Test
    void sixImportedDaysAreNotSevenEither() {
        assertThat(WeightSummary.of(daily(6, MeasurementStore.Source.IMPORT), ISTANBUL, 7).trendReady()).isFalse();
    }

    @Test
    void twoWeighInsOnOneLocalDayAreOneDay() {
        List<MeasurementStore.WeighIn> weighIns = new ArrayList<>(daily(6, MeasurementStore.Source.MANUAL));
        // The 1st again, in the evening: not a seventh point, the trend takes the day's first only.
        weighIns.add(weighIn(DAY_1.atTime(20, 0).atZone(ISTANBUL).toInstant(), "81.0", MeasurementStore.Source.MANUAL));

        WeightSummary summary = WeightSummary.of(weighIns, ISTANBUL, 7);

        assertThat(summary.weighInCount()).isEqualTo(6);
        assertThat(summary.trendReady()).isFalse();
    }

    @Test
    void aDayIsTheUsersLocalDayNotUtc() {
        // 22:30 UTC on the 1st and 05:00 UTC on the 2nd are both the 2nd in Istanbul (UTC+3): one day.
        List<MeasurementStore.WeighIn> weighIns = List.of(
                weighIn(Instant.parse("2026-09-01T22:30:00Z"), "80.0", MeasurementStore.Source.MANUAL),
                weighIn(Instant.parse("2026-09-02T05:00:00Z"), "80.5", MeasurementStore.Source.MANUAL));

        assertThat(WeightSummary.of(weighIns, ISTANBUL, 7).weighInCount()).isEqualTo(1);
        assertThat(WeightSummary.of(weighIns, ZoneId.of("UTC"), 7).weighInCount()).isEqualTo(2);
    }

    @Test
    void lastIsTheNewestWeighInWhateverItsSourceOrPlaceInTheList() {
        List<MeasurementStore.WeighIn> weighIns = new ArrayList<>(daily(3, MeasurementStore.Source.MANUAL));
        MeasurementStore.WeighIn newest = weighIn(DAY_1.plusDays(20).atTime(7, 0).atZone(ISTANBUL).toInstant(), "79.4",
                MeasurementStore.Source.IMPORT);
        weighIns.addFirst(newest);

        assertThat(WeightSummary.of(weighIns, ISTANBUL, 7).last()).isEqualTo(newest);
    }

    @Test
    void lastIsTheLaterOfTwoWeighInsOnTheSameDayNotTheDaysFirst() {
        MeasurementStore.WeighIn morning = weighIn(DAY_1.atTime(7, 0).atZone(ISTANBUL).toInstant(), "80.4", MeasurementStore.Source.MANUAL);
        MeasurementStore.WeighIn evening = weighIn(DAY_1.atTime(21, 0).atZone(ISTANBUL).toInstant(), "81.2", MeasurementStore.Source.MANUAL);

        assertThat(WeightSummary.of(List.of(morning, evening), ISTANBUL, 7).last()).isEqualTo(evening);
    }

    private static List<MeasurementStore.WeighIn> daily(int days, MeasurementStore.Source source) {
        return daily(days, source, DAY_1);
    }

    private static List<MeasurementStore.WeighIn> daily(int days, MeasurementStore.Source source, LocalDate first) {
        List<MeasurementStore.WeighIn> weighIns = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            weighIns.add(weighIn(first.plusDays(i).atTime(7, 30).atZone(ISTANBUL).toInstant(), "80.0", source));
        }
        return weighIns;
    }

    private static MeasurementStore.WeighIn weighIn(Instant at, String kg, MeasurementStore.Source source) {
        return new MeasurementStore.WeighIn(UUID.randomUUID(), UUID.randomUUID(), at, new BigDecimal(kg), source);
    }
}
