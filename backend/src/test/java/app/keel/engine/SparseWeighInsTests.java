package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * K-1204 (ADR-091 Ek 4): the noise margin follows the weigh-ins of the window's edge weeks (ADR-020 L-10 generalised to n),
 * and a sparse window extends up to six weeks. Expected margins and weeks are worked out by hand:
 * margin = 0.58 · √((1/n1 + 1/n2) / (2/4)), a week counted for at most 4; the window is the first number of weeks w from
 * the base with margin / (w − 1) ≤ 0.34.
 */
class SparseWeighInsTests {

    private static final Parameters MALE = parameters(Sex.MALE);
    private static final Parameters FEMALE = parameters(Sex.FEMALE);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final LocalDate LONG_AGO = TODAY.minusDays(200);

    @Test
    void theParametersTheTablesBelowAssume() {
        assertThat(List.of(MALE.number(ParameterKey.FLAT_MARGIN_KG), (double) MALE.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK),
                MALE.number(ParameterKey.DETECTABLE_RATE_KG_PER_WEEK), (double) MALE.wholeNumber(ParameterKey.DECISION_WINDOW_MAX_WEEKS),
                (double) MALE.wholeNumber(ParameterKey.MIN_WEIGHINS_FLOOR_PER_WEEK)))
                .containsExactly(0.58, 4.0, 0.34, 6.0, 1.0);
    }

    @ParameterizedTest(name = "{0} + {1} weigh-ins: {2} kg")
    @CsvSource({"4,4,0.58", "3,3,0.67", "2,2,0.82", "1,1,1.16", "4,3,0.63", "3,4,0.63", "4,1,0.92", "6,6,0.58", "7,4,0.58", "0,4,0.92"})
    void theMarginFollowsTheEdgeWeeksWeighIns(int first, int last, String kg) {
        assertThat(NoiseMargin.of(first, last, MALE)).isEqualByComparingTo(new BigDecimal(kg));
    }

    /** Weigh-ins per week counted back from today, the latest week first; the weeks after the list are daily. */
    private static WeightSeries weeksOf(int... newestFirst) {
        List<WeighIn> weighIns = new ArrayList<>(EngineFixtures.daily(LONG_AGO, TODAY.minusDays(7L * newestFirst.length), "80.0"));
        for (int week = 0; week < newestFirst.length; week++) {
            LocalDate end = TODAY.minusDays(7L * week);
            for (int i = 0; i < newestFirst[week]; i++) {
                weighIns.add(new WeighIn(end.minusDays(i), new BigDecimal("80.0")));
            }
        }
        return series(weighIns.stream().sorted(java.util.Comparator.comparing(WeighIn::date)).toList());
    }

    @ParameterizedTest(name = "weeks (newest first) {0}: a window of {1} weeks")
    @CsvSource(delimiter = '|', value = {"4,4,4|3", "3,4,3|3", "4,3,4|3", "2,4,2,4,4,4|4", "1,1,1,1,1,1|5", "1,4,4,4,4,4|4",
        "2,4,4,4,4,4|4", "4,4,4,4,4,2|3"})
    void aSparseWindowExtendsToTheFirstLengthThatCarriesIt(String counts, int weeks) {
        int[] newestFirst = java.util.Arrays.stream(counts.split(",")).mapToInt(Integer::parseInt).toArray();

        assertThat(DecisionWindow.sufficientWeeks(3, LONG_AGO, TODAY, weeksOf(newestFirst), MALE)).hasValue(weeks);
    }

    @Test
    void oneWeighInAWeekDecidesOnlyFromTheFifthWeekOfThePlan() {
        // The plan's day 28 (4 weeks): 1 + 1 → 1.16 / 3 = 0.39 > 0.34 → not yet; day 35: 1.16 / 4 = 0.29 → a call.
        LocalDate planStart = TODAY.minusDays(27);
        WeightSeries week4 = oneADay(planStart, TODAY, 7);
        assertThat(DataSufficiency.check(snapshot(planStart, week4), MALE)).hasValueSatisfying(d ->
                assertThat(d.reasons().getFirst().rule().value()).isEqualTo("data_insufficient"));

        LocalDate start5 = TODAY.minusDays(34);
        assertThat(DataSufficiency.check(snapshot(start5, oneADay(start5, TODAY, 7)), MALE)).isEmpty();
    }

    @Test
    void anEmptyWeekIsNeverReadWhateverTheWindow() {
        List<WeighIn> weighIns = new ArrayList<>(EngineFixtures.daily(LONG_AGO, TODAY.minusDays(14), "80.0"));
        weighIns.addAll(EngineFixtures.daily(TODAY.minusDays(5), TODAY, "80.0"));
        assertThat(DataSufficiency.check(snapshot(LONG_AGO, series(weighIns)), MALE)).isPresent();
    }

    @Test
    void aWomansWindowIsAtLeastHerFourWeeks() {
        assertThat(DecisionWindow.sufficientWeeks(4, LONG_AGO, TODAY, weeksOf(4, 4, 4, 4), FEMALE)).hasValue(4);
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    /** Any pattern of weigh-in days over the last 6 weeks, and the plan's age. */
    record Pattern(List<Integer> daysAgo, int planAge) {

        WeightSeries weights() {
            List<WeighIn> weighIns = new ArrayList<>(EngineFixtures.daily(LONG_AGO, TODAY.minusDays(43), "80.0"));
            daysAgo.stream().sorted(java.util.Comparator.reverseOrder())
                    .forEach(ago -> weighIns.add(new WeighIn(TODAY.minusDays(ago), new BigDecimal("80.0"))));
            return series(weighIns);
        }
    }

    @Provide
    Arbitrary<Pattern> patterns() {
        return Arbitraries.integers().between(0, 42).set().ofMaxSize(43).flatMap(days ->
                Arbitraries.integers().between(14, 80).map(age -> new Pattern(List.copyOf(days), age)));
    }

    @Property
    void aCallIsNeverMadeOnASmallerMarginThanDenseDataWould(@ForAll("patterns") Pattern pattern) {
        WeightSeries weights = pattern.weights();
        LocalDate planStart = TODAY.minusDays(pattern.planAge() - 1L);
        Optional<Decision> notYet = DataSufficiency.check(snapshot(planStart, weights), MALE);
        if (notYet.isPresent()) {
            return;
        }
        int weeks = DecisionWindow.days(Phase.CUT, false, planStart, TODAY, weights, MALE) / 7;
        int[] counts = DecisionWindow.weekCounts(weights, TODAY, weeks);
        BigDecimal margin = NoiseMargin.of(counts[weeks - 1], counts[0], MALE);

        assertThat(margin).isGreaterThanOrEqualTo(BigDecimal.valueOf(MALE.number(ParameterKey.FLAT_MARGIN_KG)));
        assertThat(margin).isLessThanOrEqualTo(BigDecimal.valueOf(MALE.number(ParameterKey.DETECTABLE_RATE_KG_PER_WEEK))
                .multiply(BigDecimal.valueOf(weeks - 1L)));
        assertThat(weeks).isBetween(3, MALE.wholeNumber(ParameterKey.DECISION_WINDOW_MAX_WEEKS));
        assertThat(java.util.Arrays.stream(counts).min().orElseThrow()).isGreaterThanOrEqualTo(1);
        assertThat(TODAY.minusDays(7L * weeks - 1)).isAfterOrEqualTo(planStart);
    }

    @Property
    void theMarginNeverShrinksWithFewerWeighIns(@ForAll int a, @ForAll int b) {
        int n1 = Math.floorMod(a, 9);
        int n2 = Math.floorMod(b, 9);
        BigDecimal margin = NoiseMargin.of(n1, n2, MALE);

        assertThat(margin).isGreaterThanOrEqualTo(NoiseMargin.of(4, 4, MALE));
        assertThat(NoiseMargin.of(n1 + 1, n2, MALE)).isLessThanOrEqualTo(margin);
        assertThat(NoiseMargin.of(n1, n2 + 1, MALE)).isLessThanOrEqualTo(margin);
    }

    private static WeightSeries oneADay(LocalDate from, LocalDate to, int every) {
        List<WeighIn> weighIns = new ArrayList<>(EngineFixtures.daily(LONG_AGO, from.minusDays(1), "80.0"));
        for (LocalDate day = to; !day.isBefore(from); day = day.minusDays(every)) {
            weighIns.add(new WeighIn(day, new BigDecimal("80.0")));
        }
        return series(weighIns.stream().sorted(java.util.Comparator.comparing(WeighIn::date)).toList());
    }

    private static Snapshot snapshot(LocalDate planStart, WeightSeries weights) {
        return new Snapshot(TODAY, Sex.MALE, Phase.CUT, planStart, weights);
    }
}
