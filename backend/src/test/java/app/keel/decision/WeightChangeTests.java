package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import app.keel.engine.WeighIn;
import app.keel.engine.WeightSeries;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * The period's weight change (K-988, ADR-078 #2, Ek 1): today's trend weight minus the one ending on the day the record
 * began, each window with enough weigh-ins (min_weighins_per_week, scaled to the window), never one day's weight (U8);
 * steady within the engine's flat_margin_kg. Thresholds from the parameter files.
 */
class WeightChangeTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final int TREND = P.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS);
    private static final int ENOUGH = P.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK);
    private static final BigDecimal MARGIN = BigDecimal.valueOf(P.number(ParameterKey.FLAT_MARGIN_KG));
    private static final LocalDate SINCE = LocalDate.of(2026, 9, 7);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 9);

    @Test
    void aLossIsTheDifferenceOfTheTwoAveragesBelowZero() {
        // 90 kg the week up to the start, 86.2 kg the last week: down 3.8.
        List<WeighIn> weights = new ArrayList<>(days(SINCE, TREND, "90"));
        weights.addAll(days(TODAY, TREND, "86.2"));

        Optional<WeightChange.Change> change = WeightChange.of(new WeightSeries(weights), SINCE, TODAY, P);

        assertThat(change).hasValueSatisfying(it -> assertThat(it.kg()).isEqualByComparingTo("-3.8"));
        assertThat(change.map(WeightChange.Change::direction)).contains(WeightChange.Direction.DOWN);
    }

    @Test
    void aGainIsAboveZeroAndRoundedAsATrendPoint() {
        List<WeighIn> weights = new ArrayList<>(days(SINCE, TREND, "70"));
        weights.addAll(List.of(new WeighIn(TODAY, new BigDecimal("71.01")), new WeighIn(TODAY.minusDays(1), new BigDecimal("71.02")),
                new WeighIn(TODAY.minusDays(2), new BigDecimal("71.02")), new WeighIn(TODAY.minusDays(3), new BigDecimal("71.02"))));

        Optional<WeightChange.Change> change = WeightChange.of(new WeightSeries(weights), SINCE, TODAY, P);

        assertThat(change.map(WeightChange.Change::kg)).contains(new BigDecimal("1.02"));
        assertThat(change.map(WeightChange.Change::direction)).contains(WeightChange.Direction.UP);
    }

    @Test
    void theWeighInsJustOutsideEitherWindowAreNotAveraged() {
        // #522 review: since-7, since+1 and today-7 hold far weights; each average reads its own seven days only.
        List<WeighIn> weights = new ArrayList<>(days(SINCE, TREND, "90"));
        weights.addAll(days(TODAY, TREND, "86"));
        weights.add(new WeighIn(SINCE.minusDays(TREND), new BigDecimal("200")));
        weights.add(new WeighIn(SINCE.plusDays(1), new BigDecimal("200")));
        weights.add(new WeighIn(TODAY.minusDays(TREND), new BigDecimal("200")));

        assertThat(WeightChange.of(new WeightSeries(weights), SINCE, TODAY, P).map(WeightChange.Change::kg))
                .hasValueSatisfying(kg -> assertThat(kg).isEqualByComparingTo("-4"));
    }

    @Test
    void aWeighInJustOutsideAThinWindowDoesNotMakeItEnough() {
        // Three in the start window and one the day before it: too few, whatever the one outside.
        List<WeighIn> weights = new ArrayList<>(days(SINCE, ENOUGH - 1, "90"));
        weights.add(new WeighIn(SINCE.minusDays(TREND), new BigDecimal("90")));
        weights.addAll(days(TODAY, TREND, "88"));
        List<WeighIn> thinNow = new ArrayList<>(days(SINCE, TREND, "90"));
        thinNow.addAll(days(TODAY, ENOUGH - 1, "88"));
        thinNow.add(new WeighIn(TODAY.minusDays(TREND), new BigDecimal("88")));

        assertThat(WeightChange.of(new WeightSeries(weights), SINCE, TODAY, P)).isEmpty();
        assertThat(WeightChange.of(new WeightSeries(thinNow), SINCE, TODAY, P)).isEmpty();
    }

    @Test
    void eitherWindowWithTooFewWeighInsGivesNone() {
        List<WeighIn> thinStart = new ArrayList<>(days(SINCE, ENOUGH - 1, "90"));
        thinStart.addAll(days(TODAY, TREND, "88"));
        List<WeighIn> thinNow = new ArrayList<>(days(SINCE, TREND, "90"));
        thinNow.addAll(days(TODAY, ENOUGH - 1, "88"));
        List<WeighIn> justEnough = new ArrayList<>(days(SINCE, ENOUGH, "90"));
        justEnough.addAll(days(TODAY, ENOUGH, "88"));

        assertThat(WeightChange.of(new WeightSeries(thinStart), SINCE, TODAY, P)).isEmpty();
        assertThat(WeightChange.of(new WeightSeries(thinNow), SINCE, TODAY, P)).isEmpty();
        assertThat(WeightChange.of(new WeightSeries(justEnough), SINCE, TODAY, P)).isPresent();
    }

    @Test
    void overlappingWindowsGiveNoneASingleWeighInNeverCounts() {
        // Less than a trend window since the start: the two averages share days.
        LocalDate soon = SINCE.plusDays(TREND - 1L);
        List<WeighIn> weights = days(soon, TREND + TREND - 1, "80");

        assertThat(WeightChange.of(new WeightSeries(weights), SINCE, soon, P)).isEmpty();
        assertThat(WeightChange.of(new WeightSeries(days(SINCE.plusDays(TREND), TREND + TREND, "80")), SINCE, SINCE.plusDays(TREND), P)).isPresent();
        assertThat(WeightChange.of(new WeightSeries(List.of(new WeighIn(SINCE, new BigDecimal("90")), new WeighIn(TODAY, new BigDecimal("85")))), SINCE,
                TODAY, P)).isEmpty();
    }

    @Test
    void withinTheFlatMarginItIsSteadyAsTheEngineReadsAFlatWeek() {
        // At the margin itself: not past it, steady (WeeklySpine: the margin must be passed); just past it, a move.
        assertThat(WeightChange.direction(MARGIN.negate(), MARGIN)).isEqualTo(WeightChange.Direction.STEADY);
        assertThat(WeightChange.direction(MARGIN, MARGIN)).isEqualTo(WeightChange.Direction.STEADY);
        assertThat(WeightChange.direction(BigDecimal.ZERO, MARGIN)).isEqualTo(WeightChange.Direction.STEADY);
        assertThat(WeightChange.direction(MARGIN.add(new BigDecimal("0.01")), MARGIN)).isEqualTo(WeightChange.Direction.UP);
        assertThat(WeightChange.direction(MARGIN.add(new BigDecimal("0.01")).negate(), MARGIN)).isEqualTo(WeightChange.Direction.DOWN);
    }

    @ParameterizedTest(name = "{0} a week over {1} days: {2}")
    @CsvSource({"4, 7, 4", "4, 14, 8", "4, 3, 2", "4, 10, 6"})
    void theWeeklyMinimumIsScaledToTheWindow(int perWeek, int windowDays, int needed) {
        // #522 review: min_weighins_per_week is a week's; a trend window of another length asks its share, rounded up.
        assertThat(WeightChange.needed(perWeek, windowDays)).isEqualTo(needed);
    }

    /** {@code count} daily weigh-ins of {@code kg}, the last on {@code until}. */
    private static List<WeighIn> days(LocalDate until, int count, String kg) {
        return IntStream.range(0, count).mapToObj(back -> new WeighIn(until.minusDays(back), new BigDecimal(kg))).toList();
    }
}
