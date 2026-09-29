package app.keel.engine;

import static app.keel.engine.EngineFixtures.daily;
import static app.keel.engine.EngineFixtures.series;
import static app.keel.engine.EngineFixtures.weighIn;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/**
 * Trend weight: the average of the weigh-ins in the last N days, skipping missing days (U8, H1 §3.4).
 * A single morning is ~1/6 signal, 5/6 water noise; the trend is what the engine and the user look at.
 */
class TrendTests {

    private static final LocalDate DAY_1 = LocalDate.of(2026, 9, 1);
    private static final int WINDOW = EngineFixtures.parameters(Sex.MALE).wholeNumber(ParameterKey.TREND_DISPLAY_DAYS);

    @Test
    void aConstantSeriesHasThatConstantAsItsTrend() {
        WeightSeries series = series(daily(DAY_1, DAY_1.plusDays(20), "80.0"));

        assertThat(WeightTrend.at(series, DAY_1.plusDays(20), WINDOW)).hasValueSatisfying(
                trend -> assertThat(trend).isEqualByComparingTo("80.0"));
    }

    @Test
    void aSingleWeighInIsItsOwnTrend() {
        WeightSeries series = series(List.of(weighIn(DAY_1, "82.4")));

        assertThat(WeightTrend.at(series, DAY_1, WINDOW)).hasValueSatisfying(
                trend -> assertThat(trend).isEqualByComparingTo("82.4"));
    }

    @Test
    void skipsMissingDaysInsteadOfFillingThemIn() {
        // Weighed on days 1, 3 and 7 of a 7-day window: (80.0 + 81.0 + 83.0) / 3 = 81.333…
        LocalDate last = DAY_1.plusDays(6);
        WeightSeries series = series(List.of(weighIn(DAY_1, "80.0"), weighIn(DAY_1.plusDays(2), "81.0"), weighIn(last, "83.0")));

        assertThat(WeightTrend.at(series, last, 7)).hasValueSatisfying(
                trend -> assertThat(trend.doubleValue()).isCloseTo(81.3333, within(0.0001)));
    }

    @Test
    void ignoresWeighInsOlderThanTheWindowAndAfterTheDay() {
        LocalDate day = DAY_1.plusDays(7);
        WeightSeries series = series(List.of(
                weighIn(DAY_1, "95.0"),               // 7 days before `day`: just outside a 7-day window
                weighIn(DAY_1.plusDays(1), "80.0"),   // first day inside
                weighIn(day, "80.0"),
                weighIn(day.plusDays(1), "60.0")));   // after `day`: not seen yet

        assertThat(WeightTrend.at(series, day, 7)).hasValueSatisfying(
                trend -> assertThat(trend).isEqualByComparingTo("80.0"));
    }

    @Test
    void isEmptyWhenNoWeighInFallsInTheWindow() {
        WeightSeries series = series(List.of(weighIn(DAY_1, "80.0")));

        assertThat(WeightTrend.at(series, DAY_1.plusDays(WINDOW), WINDOW)).isEmpty();
    }

    @Test
    void smoothsANoisySeriesToItsCentre() {
        // Seven mornings of water noise around 80 kg, deviations summing to zero.
        String[] noisy = {"80.4", "79.6", "80.2", "79.8", "80.0", "80.3", "79.7"};
        List<WeighIn> weighIns = new ArrayList<>();
        for (int i = 0; i < noisy.length; i++) {
            weighIns.add(weighIn(DAY_1.plusDays(i), noisy[i]));
        }

        assertThat(WeightTrend.at(series(weighIns), DAY_1.plusDays(6), 7)).hasValueSatisfying(
                trend -> assertThat(trend).isEqualByComparingTo("80.0"));
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    @Property
    boolean theTrendLiesBetweenTheLowestAndHighestWeighInOfTheWindow(
            @ForAll("weightsInKg") List<BigDecimal> weights, @ForAll @IntRange(min = 1, max = 30) int window) {
        WeightSeries series = consecutive(weights);
        LocalDate day = DAY_1.plusDays(weights.size() - 1);
        List<BigDecimal> inWindow = series.weighIns().stream()
                .filter(w -> w.date().isAfter(day.minusDays(window)))
                .map(WeighIn::kg).toList();

        BigDecimal lowest = inWindow.stream().min(BigDecimal::compareTo).orElseThrow();
        BigDecimal highest = inWindow.stream().max(BigDecimal::compareTo).orElseThrow();

        // The day itself is always weighed here, so a missing trend is a failure, not a pass.
        return WeightTrend.at(series, day, window)
                .map(trend -> trend.compareTo(lowest) >= 0 && trend.compareTo(highest) <= 0)
                .orElse(false);
    }

    @Property
    boolean aConstantWeightIsItsTrendWhateverDaysAreMissing(
            @ForAll("weightInKg") BigDecimal kg, @ForAll("daySets") List<Integer> dayOffsets) {
        List<WeighIn> weighIns = dayOffsets.stream().map(offset -> new WeighIn(DAY_1.plusDays(offset), kg)).toList();
        LocalDate day = DAY_1.plusDays(dayOffsets.getLast());

        return WeightTrend.at(series(weighIns), day, WINDOW).map(trend -> trend.compareTo(kg) == 0).orElse(false);
    }

    @Property
    boolean weighInsOutsideTheWindowNeverMoveTheTrend(
            @ForAll("weightsInKg") List<BigDecimal> weights, @ForAll @IntRange(min = 1, max = 30) int window,
            @ForAll("weightInKg") BigDecimal outsider, @ForAll @IntRange(min = 1, max = 40) int beyond) {
        // Kills window off-by-ones: a weigh-in one day too old, or after the day, must not count.
        WeightSeries series = consecutive(weights);
        LocalDate day = DAY_1.plusDays(weights.size() - 1);
        List<WeighIn> tooOld = new ArrayList<>(series.weighIns());
        tooOld.removeIf(w -> w.date().equals(day.minusDays(window - 1L + beyond)));
        tooOld.add(new WeighIn(day.minusDays(window - 1L + beyond), outsider));
        List<WeighIn> future = new ArrayList<>(series.weighIns());
        future.add(new WeighIn(day.plusDays(beyond), outsider));

        java.util.Optional<BigDecimal> trend = WeightTrend.at(series, day, window);
        return trend.equals(WeightTrend.at(series(tooOld), day, window))
                && trend.equals(WeightTrend.at(series(future), day, window));
    }

    @Test
    void refusesAWindowShorterThanOneDay() {
        org.assertj.core.api.Assertions.assertThatThrownBy(
                () -> WeightTrend.at(series(List.of(weighIn(DAY_1, "80.0"))), DAY_1, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Provide
    Arbitrary<BigDecimal> weightInKg() {
        return Arbitraries.bigDecimals().between(new BigDecimal("30.0"), new BigDecimal("250.0")).ofScale(1);
    }

    @Provide
    Arbitrary<List<BigDecimal>> weightsInKg() {
        return weightInKg().list().ofMinSize(1).ofMaxSize(60);
    }

    @Provide
    Arbitrary<List<Integer>> daySets() {
        // Distinct, increasing day offsets: some days weighed, some skipped.
        return Arbitraries.integers().between(0, 60).set().ofMinSize(1).ofMaxSize(40)
                .map(set -> set.stream().sorted().toList());
    }

    private static WeightSeries consecutive(List<BigDecimal> weights) {
        List<WeighIn> weighIns = new ArrayList<>();
        for (int i = 0; i < weights.size(); i++) {
            weighIns.add(new WeighIn(DAY_1.plusDays(i), weights.get(i)));
        }
        return series(weighIns);
    }
}
