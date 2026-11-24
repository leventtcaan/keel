package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * K-1226 (ADR-091 Ek 4 devamı): the weekly loss cap reads sparse weigh-ins too. On sparse data a loss over k weeks counts when it
 * exceeds k caps plus the noise margin of the two edge weeks (NoiseMargin: 0.58 · √((1/n1 + 1/n2) / (2/4)), a week counted for at
 * most 4); on dense data (4 + 4 or more in the last two weeks) the rule is the old one, without a margin. The numbers below are
 * worked out by hand: at 110 kg the cap is min(1.0, 1.1) = 1.0 kg a week; two weigh-ins in each edge week make the margin 0.82.
 */
class SparseLossCapTests {

    private static final Parameters MALE = parameters(Sex.MALE);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final LocalDate LONG_AGO = TODAY.minusDays(200);
    private static final RuleId CAP = new RuleId("loss_rate_cap");

    /**
     * Weekly means, newest first, with this many weigh-ins in each week (newest first); every weigh-in of a week is at the week's
     * mean plus its offset. Before the listed weeks: one flat weigh-in a day at the oldest listed mean.
     */
    private static Snapshot cut(List<String> meansNewestFirst, int[] countsNewestFirst, int... offsetsHundredths) {
        int weeks = meansNewestFirst.size();
        BigDecimal oldest = new BigDecimal(meansNewestFirst.getLast());
        List<WeighIn> weighIns = new ArrayList<>(EngineFixtures.daily(LONG_AGO, TODAY.minusDays(7L * weeks), oldest.toPlainString()));
        for (int week = 0; week < weeks; week++) {
            LocalDate end = TODAY.minusDays(7L * week);
            for (int i = 0; i < countsNewestFirst[week]; i++) {
                int offset = offsetsHundredths.length == 0 ? 0 : offsetsHundredths[(week * 7 + i) % offsetsHundredths.length];
                weighIns.add(new WeighIn(end.minusDays(i), new BigDecimal(meansNewestFirst.get(week)).add(BigDecimal.valueOf(offset, 2))));
            }
        }
        weighIns.sort(Comparator.comparing(WeighIn::date));
        return new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(100), series(weighIns));
    }

    private static boolean capCall(Snapshot snapshot) {
        return SafetyNet.check(snapshot, MALE).map(d -> d.reasons().stream().anyMatch(r -> r.rule().equals(CAP))).orElse(false);
    }

    @Test
    void theParametersTheNumbersBelowAssume() {
        assertThat(MALE.wholeNumber(ParameterKey.LOSS_CAP_SPARSE_MAX_SPAN_WEEKS)).isEqualTo(5);
        assertThat(NoiseMargin.of(2, 2, MALE)).isEqualByComparingTo("0.82");
        assertThat(SafetyNet.weeklyLossCapKg(new BigDecimal("110"), MALE)).isEqualByComparingTo("1.0");
    }

    // ── one week's difference ───────────────────────────────────────────────────────────────────────────────

    @ParameterizedTest(name = "{0} weigh-ins this week, {1} last: 110.0 → {2} caught: {3}")
    @CsvSource({
        // 2 + 2: cap 1.0 + margin 0.82 = 1.82 over one week; strictly more is a call
        "2,2,108.1,true", "2,2,108.18,false", "2,2,108.17,true", "2,2,108.5,false", "2,2,107.0,true",
        // 3 + 3: margin 0.67 → 1.67
        "3,3,108.32,true", "3,3,108.33,false", "3,3,108.5,false",
        // 1 + 1: margin 1.16 → 2.16
        "1,1,107.83,true", "1,1,107.84,false", "1,1,108.5,false"})
    void aSparseLossIsCaughtOnlyBeyondTheCapPlusTheMargin(int thisWeek, int lastWeek, String lastWeekKg, boolean caught) {
        // "lastWeekKg" is the mean this week; last week's mean is 110.0 (the table's first column reads the same way round).
        Snapshot snapshot = cut(List.of(lastWeekKg, "110.0", "110.0"), new int[] {thisWeek, lastWeek, 7});

        assertThat(capCall(snapshot)).isEqualTo(caught);
    }

    @Test
    void aSparseLossAtTheCapIsNeverACall() {
        // 1.0 kg a week for five weeks, two weigh-ins a week: the true rate is exactly the cap, no span clears cap + margin.
        List<String> means = List.of("105.0", "106.0", "107.0", "108.0", "109.0", "110.0");
        assertThat(capCall(cut(means, new int[] {2, 2, 2, 2, 2, 2}))).isFalse();
    }

    // ── GS-27: 1.2 kg a week on two weigh-ins a week ────────────────────────────────────────────────────────

    @Test
    void aTwiceAWeekWeigherLosingTwelveHundredGramsIsCaughtWithSixWeeksOfData() {
        // 130.0 (the cap stays 1.0 kg: 1 % of the weight is more), then 1.2 kg less every week, two weigh-ins in each. A span of k weeks shows 1.2 k kg against k + 0.82: k = 5 is the
        // first that clears it (6.0 > 5.82; k = 4: 4.8 > 4.82 is not). The oldest edge is then the first week: six weeks of data.
        for (int weeks = 2; weeks <= 7; weeks++) {
            List<String> newestFirst = new ArrayList<>();
            int[] counts = new int[weeks];
            for (int w = 0; w < weeks; w++) {
                newestFirst.add(BigDecimal.valueOf(1300 - 12L * (weeks - 1 - w), 1).toPlainString());
                counts[w] = 2;
            }
            assertThat(capCall(cut(newestFirst, counts))).as("%s weeks of data", weeks).isEqualTo(weeks >= 6);
        }
    }

    @Test
    void theSameLossOnDenseDataIsCaughtAtOnce() {
        // Dense: no margin, 1.2 > 1.0 in the very first comparable week (the old rule, unchanged).
        assertThat(capCall(cut(List.of("108.8", "110.0", "110.0"), new int[] {4, 4, 7}))).isTrue();
        assertThat(capCall(cut(List.of("109.0", "110.0", "110.0"), new int[] {4, 4, 7}))).isFalse();
    }

    @Test
    void oneDenseWeekAndOneSparseWeekReadWithTheMargin() {
        // 4 weigh-ins this week, 3 last week: sparse (the pair is not both full), margin 0.63 → 1.63 over one week.
        assertThat(capCall(cut(List.of("108.4", "110.0", "110.0"), new int[] {4, 3, 7}))).isFalse();
        assertThat(capCall(cut(List.of("108.3", "110.0", "110.0"), new int[] {4, 3, 7}))).isTrue();
    }

    @Test
    void onceTheLossHasStoppedTheOldDropIsNotAnsweredAgain() {
        // 110 → 105 over two weeks (5 kg > 2 caps + 0.82), then this week holds at 105: the deficit was narrowed already.
        assertThat(capCall(cut(List.of("105.0", "105.0", "110.0", "110.0"), new int[] {2, 2, 2, 7}))).isFalse();
        // The same drop with this week still falling is a call.
        assertThat(capCall(cut(List.of("104.0", "106.0", "110.0", "110.0"), new int[] {2, 2, 2, 7}))).isTrue();
    }

    @Test
    void aWeekWithoutWeighInsIsNeverAnEdge() {
        // This week empty: no trend now, nothing to judge.
        assertThat(capCall(cut(List.of("100.0", "110.0", "110.0"), new int[] {0, 4, 7}))).isFalse();
    }

    @Test
    void theFirstTwoWeeksOfDataAreStillNotInterpreted() {
        // 13 days of data only (H1 §3.4): even a huge drop is not read.
        List<WeighIn> weighIns = new ArrayList<>(List.of(new WeighIn(TODAY.minusDays(12), new BigDecimal("110.0")),
                new WeighIn(TODAY.minusDays(9), new BigDecimal("110.0")), new WeighIn(TODAY.minusDays(1), new BigDecimal("104.0")),
                new WeighIn(TODAY.minusDays(3), new BigDecimal("104.0"))));
        weighIns.sort(Comparator.comparing(WeighIn::date));
        assertThat(capCall(new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(100), series(weighIns)))).isFalse();
    }

    @Test
    void theSparseCapIsACutRule() {
        Snapshot bulk = cut(List.of("100.0", "110.0", "110.0"), new int[] {2, 2, 7});
        Snapshot asBulk = new Snapshot(TODAY, Sex.MALE, Phase.BULK, bulk.planStart(), bulk.weights());
        assertThat(capCall(asBulk)).isFalse();
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    /** Six weeks of weigh-ins, newest first: how many in each (1 to 7), the weekly means' loss per week, the noise on each. */
    record Weeks(int start, int rateHundredths, List<Integer> counts, List<Integer> noiseHundredths) {

        Snapshot snapshot() {
            List<String> means = new ArrayList<>();
            for (int week = 0; week < 6; week++) {
                // Newest first; the oldest week (5) is at "start", each newer one lower by the rate.
                means.add(BigDecimal.valueOf(start * 100L - (long) rateHundredths * (5 - week), 2).toPlainString());
            }
            int[] counts = this.counts.stream().mapToInt(Integer::intValue).toArray();
            return cut(means, counts, noiseHundredths.stream().mapToInt(Integer::intValue).toArray());
        }

        boolean lastTwoWeeksDense() {
            return counts.get(0) >= 4 && counts.get(1) >= 4;
        }
    }

    @Provide
    Arbitrary<Weeks> sparseWeeks() {
        return weeks(0, 80, 20).map(w -> {
            List<Integer> counts = new ArrayList<>(w.counts());
            if (w.lastTwoWeeksDense()) {
                counts.set(1, 3); // the property is about the sparse path
            }
            return new Weeks(w.start(), w.rateHundredths(), counts, w.noiseHundredths());
        });
    }

    @Provide
    Arbitrary<Weeks> anyDensity() {
        return weeks(0, 80, 20);
    }

    private static Arbitrary<Weeks> weeks(int minRate, int maxRate, int noise) {
        return Arbitraries.integers().between(90, 130).flatMap(start ->
                Arbitraries.integers().between(minRate, maxRate).flatMap(rate ->
                        Arbitraries.integers().between(1, 7).list().ofSize(6).flatMap(counts ->
                                Arbitraries.integers().between(-noise, noise).list().ofMinSize(1).ofMaxSize(8)
                                        .map(offsets -> new Weeks(start, rate, List.copyOf(counts), List.copyOf(offsets))))));
    }

    /**
     * Negative property: a true loss under the cap (at most 0.80 kg a week at 85 kg or more: cap ≥ 0.85), each weigh-in off its
     * week's mean by up to 0.2 kg (so a difference of two weekly means is off by at most 0.4, under the smallest margin, 0.58): a
     * sparse reading never makes a safety call. Noise alone never raises the cap.
     */
    @Property
    void sparseNoiseOnALossUnderTheCapNeverRaisesAnAlarm(@ForAll("sparseWeeks") Weeks weeks) {
        assertThat(capCall(weeks.snapshot())).as("%s", weeks).isFalse();
    }

    /**
     * Positive property: a loss of 3.0 kg a week or more (2 kg over the cap, more than the widest margin of 1.16 plus the noise of
     * 0.4) is caught on any pattern of weigh-ins in the last two weeks: sparse data decides later than dense never, and is never blind.
     */
    @Property
    void aClearlyTooFastLossIsCaughtOnAnyDensity(@ForAll("fastLoss") Weeks weeks) {
        assertThat(capCall(weeks.snapshot())).as("%s", weeks).isTrue();
    }

    @Provide
    Arbitrary<Weeks> fastLoss() {
        return weeks(300, 400, 20);
    }

    /** Dense data is the old rule exactly: this week's trend against last week's, over the cap, no margin. */
    @Property
    void denseDataIsReadAsItAlwaysWas(@ForAll("anyDensity") Weeks weeks) {
        Snapshot snapshot = weeks.snapshot();
        if (!weeks.lastTwoWeeksDense()) {
            return;
        }
        BigDecimal now = WeightTrend.at(snapshot.weights(), TODAY, 7).orElseThrow();
        BigDecimal weekAgo = WeightTrend.at(snapshot.weights(), TODAY.minusDays(7), 7).orElseThrow();
        boolean old = weekAgo.subtract(now).compareTo(SafetyNet.weeklyLossCapKg(now, MALE)) > 0;

        assertThat(capCall(snapshot)).as("%s", weeks).isEqualTo(old);
    }

    @Property
    void theEightWeekLossNeverDependedOnTheCount(@ForAll @IntRange(min = 1, max = 3) int perWeek) {
        // 1.2 kg a week for eight weeks on 1 to 3 weigh-ins a week: more than 8 % of 100 kg, still falling (GS-27's week 9).
        List<WeighIn> weighIns = new ArrayList<>();
        for (int week = 0; week < 9; week++) {
            LocalDate end = TODAY.minusDays(7L * (8 - week));
            for (int i = 0; i < perWeek; i++) {
                weighIns.add(new WeighIn(end.minusDays(i), new BigDecimal("100.0").subtract(BigDecimal.valueOf(week).multiply(new BigDecimal("1.2")))));
            }
        }
        weighIns.sort(Comparator.comparing(WeighIn::date));
        Optional<Decision> call = SafetyNet.check(new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(100), series(weighIns)), MALE);

        assertThat(call).hasValueSatisfying(d -> assertThat(d.reasons()).extracting(Reason::rule).contains(new RuleId("rapid_loss")));
    }
}
