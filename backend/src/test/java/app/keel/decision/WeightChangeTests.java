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
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

/**
 * The period's weight change (K-988, ADR-078 #2, Ek 1): today's trend weight minus the one ending on the day the record
 * began, each window with enough weigh-ins (min_weighins_per_week), never one day's weight (U8). Thresholds from the
 * parameter files.
 */
class WeightChangeTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final int TREND = P.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS);
    private static final int ENOUGH = P.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK);
    private static final LocalDate SINCE = LocalDate.of(2026, 9, 7);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 9);

    @Test
    void aLossIsTheDifferenceOfTheTwoAveragesBelowZero() {
        // 90 kg the week up to the start, 86.2 kg the last week: down 3.8.
        List<WeighIn> weights = new ArrayList<>(days(SINCE, TREND, "90"));
        weights.addAll(days(TODAY, TREND, "86.2"));

        assertThat(WeightChange.of(new WeightSeries(weights), SINCE, TODAY, P)).hasValueSatisfying(kg -> assertThat(kg).isEqualByComparingTo("-3.8"));
    }

    @Test
    void aGainIsAboveZeroAndRoundedAsATrendPoint() {
        List<WeighIn> weights = new ArrayList<>(days(SINCE, TREND, "70"));
        weights.addAll(List.of(new WeighIn(TODAY, new BigDecimal("71.01")), new WeighIn(TODAY.minusDays(1), new BigDecimal("71.02")),
                new WeighIn(TODAY.minusDays(2), new BigDecimal("71.02")), new WeighIn(TODAY.minusDays(3), new BigDecimal("71.02"))));

        assertThat(WeightChange.of(new WeightSeries(weights), SINCE, TODAY, P)).hasValueSatisfying(kg -> assertThat(kg).isEqualTo(new BigDecimal("1.02")));
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

    /** {@code count} daily weigh-ins of {@code kg}, the last on {@code until}. */
    private static List<WeighIn> days(LocalDate until, int count, String kg) {
        return IntStream.range(0, count).mapToObj(back -> new WeighIn(until.minusDays(back), new BigDecimal(kg))).toList();
    }
}
