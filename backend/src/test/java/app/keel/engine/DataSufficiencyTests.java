package app.keel.engine;

import static app.keel.engine.EngineFixtures.daily;
import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static app.keel.engine.EngineFixtures.weighIn;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.Tuple;
import net.jqwik.api.statistics.Statistics;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.Test;

/**
 * "Measure often, interpret rarely" (U8): with too little data the engine says so instead of deciding (U3).
 * Thresholds come from data/parameters/windows.yaml; each boundary is tested just below, at and above.
 */
class DataSufficiencyTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26); // a Monday check-in

    private static final Parameters MALE = parameters(Sex.MALE);
    private static final Parameters FEMALE = parameters(Sex.FEMALE);
    private static final int NO_INTERPRETATION_DAYS = MALE.wholeNumber(ParameterKey.NO_INTERPRETATION_DAYS);
    private static final int MALE_WINDOW = MALE.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
    private static final int FEMALE_WINDOW = FEMALE.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
    private static final int MIN_PER_WEEK = MALE.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK);

    private static final LocalDate LONG_AGO = TODAY.minusDays(120);

    @Test
    void theLiteralReviewDatesBelowAssumeTodaysParameters() {
        // Some expected review dates are worked out by hand from these values; if a parameter changes on purpose,
        // redo those dates instead of deriving them from the code under test.
        assertThat(List.of(NO_INTERPRETATION_DAYS, MALE_WINDOW, FEMALE_WINDOW, MIN_PER_WEEK)).containsExactly(14, 21, 28, 4);
    }

    // ── the first days: no interpretation ───────────────────────────────────────────────────────────────────

    @Test
    void withNoWeighInsThereIsNoDecisionYet() {
        Optional<Decision> decision = DataSufficiency.check(snapshot(Sex.MALE, LONG_AGO, List.of()), MALE);

        assertNoDecisionYet(decision, "data_insufficient");
        // Daily from tomorrow (TODAY+1): the 14-day rule passes on TODAY+14, and the window's oldest week
        // (D-20..D-14) first holds 4 weigh-ins when D-14 - (TODAY+1) + 1 = 4 → D = TODAY+18.
        assertThat(decision.orElseThrow().nextReview()).isEqualTo(TODAY.plusDays(18));
    }

    @Test
    void theFirstDaysOfDataAreNotInterpreted() {
        // Spec WC-01: day 10, weighed every day — still no interpretation.
        LocalDate first = TODAY.minusDays(9);
        Optional<Decision> decision = DataSufficiency.check(
                snapshot(Sex.MALE, first, daily(first, TODAY, "80.0")), MALE);

        assertNoDecisionYet(decision, "data_insufficient");
    }

    @Test
    void oneDayShortOfTheNoInterpretationPeriodIsStillTooEarly() {
        LocalDate first = TODAY.minusDays(NO_INTERPRETATION_DAYS - 2); // NO_INTERPRETATION_DAYS - 1 days of data
        Optional<Decision> decision = DataSufficiency.check(
                snapshot(Sex.MALE, LONG_AGO, daily(first, TODAY, "80.0")), MALE);

        assertNoDecisionYet(decision, "data_insufficient");
        // 13 days of data. Weighing daily from tomorrow, the first day all three checks pass is when the window's
        // oldest week (D-20..D-14) holds 4 weigh-ins: D-14 - (TODAY-12) + 1 = 4 → D = TODAY+5.
        // (It used to promise TODAY+1, when only the 14-day rule is met; the week rule then blocked again.)
        assertThat(decision.orElseThrow().nextReview()).isEqualTo(TODAY.plusDays(5));
    }

    @Test
    void afterTheNoInterpretationPeriodTheRemainingGapIsWeighInsPerWeek() {
        // Exactly the no-interpretation period of data passes the first check (so its "tomorrow" review is gone);
        // the window's oldest week is still empty, so the week-count rule answers, a week later.
        LocalDate first = TODAY.minusDays(NO_INTERPRETATION_DAYS - 1);
        Optional<Decision> decision = DataSufficiency.check(
                snapshot(Sex.MALE, LONG_AGO, daily(first, TODAY, "80.0")), MALE);

        assertNoDecisionYet(decision, "data_insufficient");
        // 14 days of data: oldest window week needs 4 → D-14 - (TODAY-13) + 1 = 4 → D = TODAY+4.
        assertThat(decision.orElseThrow().nextReview()).isEqualTo(TODAY.plusDays(4));
    }

    @Test
    void importedHistoryCountsFromTheFirstWeighInNotFromThePlanStart() {
        // ADR-018: a user who imports months of weigh-ins has data at once; only the plan window still runs.
        LocalDate planStart = TODAY.minusDays(MALE_WINDOW - 1);
        Optional<Decision> decision = DataSufficiency.check(
                snapshot(Sex.MALE, planStart, daily(LONG_AGO, TODAY, "80.0")), MALE);

        assertThat(decision).isNotPresent();
    }

    // ── the decision window: judge a plan only after it had its full window ─────────────────────────────────

    @Test
    void aPlanIsNotJudgedBeforeItsWindowIsFull() {
        LocalDate planStart = TODAY.minusDays(MALE_WINDOW - 2); // MALE_WINDOW - 1 days on the plan
        Optional<Decision> decision = DataSufficiency.check(
                snapshot(Sex.MALE, planStart, daily(LONG_AGO, TODAY, "80.0")), MALE);

        assertNoDecisionYet(decision, "window_not_full");
        assertThat(decision.orElseThrow().nextReview()).isEqualTo(TODAY.plusDays(1));
        assertThat(decision.orElseThrow().copyKey()).isEqualTo(new CopyKey("decision.no_decision_yet.window_not_full"));
    }

    @Test
    void aPlanIsJudgedOnceItsWindowIsFull() {
        LocalDate planStart = TODAY.minusDays(MALE_WINDOW - 1);
        Optional<Decision> atWindow = DataSufficiency.check(
                snapshot(Sex.MALE, planStart, daily(LONG_AGO, TODAY, "80.0")), MALE);
        Optional<Decision> pastWindow = DataSufficiency.check(
                snapshot(Sex.MALE, planStart.minusDays(1), daily(LONG_AGO, TODAY, "80.0")), MALE);

        assertThat(atWindow).isNotPresent();
        assertThat(pastWindow).isNotPresent();
    }

    @Test
    void womenGetTheLongerWindowThatCancelsTheCycle() {
        // Spec WC-02: 21 days on the plan is enough for a man, not for a woman (J1 D1: 28 days).
        LocalDate planStart = TODAY.minusDays(MALE_WINDOW - 1);
        List<WeighIn> weighIns = daily(LONG_AGO, TODAY, "65.0");

        assertThat(DataSufficiency.check(snapshot(Sex.MALE, planStart, weighIns), MALE)).isNotPresent();
        assertNoDecisionYet(DataSufficiency.check(snapshot(Sex.FEMALE, planStart, weighIns), FEMALE), "window_not_full");
        assertThat(FEMALE_WINDOW).isGreaterThan(MALE_WINDOW);
    }

    @Test
    void aWomansPlanIsJudgedAtDay28NotBefore() {
        List<WeighIn> weighIns = daily(LONG_AGO, TODAY, "65.0");

        assertNoDecisionYet(DataSufficiency.check(
                snapshot(Sex.FEMALE, TODAY.minusDays(FEMALE_WINDOW - 2), weighIns), FEMALE), "window_not_full");
        assertThat(DataSufficiency.check(snapshot(Sex.FEMALE, TODAY.minusDays(FEMALE_WINDOW - 1), weighIns), FEMALE))
                .isNotPresent();
    }

    @Test
    void windowNotFullNamesTheCycleResearchAndIsLowConfidence() {
        Optional<Decision> decision = DataSufficiency.check(
                snapshot(Sex.FEMALE, TODAY.minusDays(3), daily(LONG_AGO, TODAY, "65.0")), FEMALE);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.confidence()).isEqualTo(Confidence.LOW);
            assertThat(d.reasons()).containsExactly(new Reason(
                    new RuleId("window_not_full"), new Source("arastirma/ham/J1-cinsiyet.md#D1", SourceTag.LITERATURE)));
        });
    }

    // ── weigh-ins per week inside the window ────────────────────────────────────────────────────────────────

    @Test
    void aWeekWithTooFewWeighInsLeavesTheWindowUnreadable() {
        Optional<Decision> decision = DataSufficiency.check(
                snapshot(Sex.MALE, LONG_AGO, withOneWeekHaving(MIN_PER_WEEK - 1)), MALE);

        assertNoDecisionYet(decision, "data_insufficient");
        // Oldest week has 3 (TODAY-20..-18), then 4 empty days, then daily from TODAY-13. The oldest block
        // (D-20..D-14) first holds 4 on D = TODAY+4. (It used to promise TODAY+7 whatever the gap's position.)
        assertThat(decision.orElseThrow().nextReview()).isEqualTo(TODAY.plusDays(4));
    }

    @Test
    void aThinWeekInsideTheWindowPromisesTheDayFromWhichTheDataStaysEnough() {
        // Daily, except the week TODAY-13..-7 has only TODAY-13 and TODAY-10. Weeks are counted back from the day
        // looked at, so with daily weigh-ins from tomorrow the check passes on TODAY+3..+5 (the thin week is split
        // across two blocks), fails again on TODAY+6..+9 (the oldest block holds TODAY-14..-8 at most 3) and holds for
        // good from TODAY+10 (the oldest block starts at TODAY-10). Promising TODAY+3 would break at the next weekly
        // check-in, TODAY+7.
        List<WeighIn> weighIns = new ArrayList<>(daily(LONG_AGO, TODAY.minusDays(14), "80.0"));
        weighIns.add(weighIn(TODAY.minusDays(13), "80.0"));
        weighIns.add(weighIn(TODAY.minusDays(10), "80.0"));
        weighIns.addAll(daily(TODAY.minusDays(6), TODAY, "80.0"));

        Optional<Decision> decision = DataSufficiency.check(snapshot(Sex.MALE, LONG_AGO, weighIns), MALE);

        assertNoDecisionYet(decision, "data_insufficient");
        assertThat(decision.orElseThrow().nextReview()).isEqualTo(TODAY.plusDays(10));
    }

    @ParameterizedTest(name = "{0}, week {1} back")
    @MethodSource("everyWeekOfEveryWindow")
    void aThinWeekAnywhereInTheWindowBlocks(Sex sex, int weeksBack) {
        // weeksBack 0 is the current week: a user who stopped weighing this week is not judged on stale data.
        LocalDate thinEnd = TODAY.minusDays(7L * weeksBack);
        LocalDate thinStart = thinEnd.minusDays(6);
        List<WeighIn> weighIns = new ArrayList<>(daily(LONG_AGO, thinStart.minusDays(1), "70.0"));
        weighIns.addAll(daily(thinStart, thinStart.plusDays(MIN_PER_WEEK - 2), "70.0"));
        if (weeksBack > 0) {
            weighIns.addAll(daily(thinEnd.plusDays(1), TODAY, "70.0"));
        }

        assertNoDecisionYet(DataSufficiency.check(snapshot(sex, LONG_AGO, weighIns), parameters(sex)), "data_insufficient");
    }

    static Stream<Arguments> everyWeekOfEveryWindow() {
        return Stream.of(Sex.values()).flatMap(sex -> IntStream.range(0, parameters(sex)
                .wholeNumber(ParameterKey.DECISION_WINDOW_DAYS) / 7).mapToObj(week -> Arguments.of(sex, week)));
    }

    @Test
    void aPlanStillInItsWindowIsReportedAsSuchEvenWithThinWeeks() {
        // Order: the window check comes before the week count, so the user hears "the plan needs time",
        // not "weigh in more", while both are true.
        LocalDate planStart = TODAY.minusDays(9);

        assertNoDecisionYet(DataSufficiency.check(
                snapshot(Sex.MALE, planStart, withOneWeekHaving(MIN_PER_WEEK - 1)), MALE), "window_not_full");
    }

    @Test
    void theMinimumWeighInsPerWeekIsEnough() {
        assertThat(DataSufficiency.check(snapshot(Sex.MALE, LONG_AGO, withOneWeekHaving(MIN_PER_WEEK)), MALE))
                .isNotPresent();
        assertThat(DataSufficiency.check(snapshot(Sex.MALE, LONG_AGO, withOneWeekHaving(MIN_PER_WEEK + 1)), MALE))
                .isNotPresent();
    }

    // ── what a "no decision yet" looks like ─────────────────────────────────────────────────────────────────

    @Test
    void noDecisionYetIsLowConfidenceAndNamesItsRuleAndSource() {
        Optional<Decision> decision = DataSufficiency.check(snapshot(Sex.MALE, LONG_AGO, List.of()), MALE);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.confidence()).isEqualTo(Confidence.LOW);
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.no_decision_yet.data_insufficient"));
            assertThat(d.reasons()).containsExactly(new Reason(
                    new RuleId("data_insufficient"), new Source("arastirma/ham/H1-olcum.md#3.4", SourceTag.LITERATURE)));
        });
    }

    @Test
    @SuppressWarnings("unchecked")
    void everyCopyKeyItCanReturnHasATitleAndBodyInEnJson() throws java.io.IOException {
        // The engine returns keys; the words live in data/copy/en.json (K2, ADR-010). JSON is valid YAML.
        Map<String, Object> copy;
        try (java.io.Reader reader = java.nio.file.Files.newBufferedReader(java.nio.file.Path.of("../data/copy/en.json"))) {
            copy = ParametersLoaderTests.strictYaml().load(reader);
        }
        Map<String, Object> noDecisionYet =
                (Map<String, Object>) ((Map<String, Object>) copy.get("decision")).get("no_decision_yet");

        for (RuleId rule : DataSufficiency.RULES) {
            assertThat(noDecisionYet.get(rule.value())).as(rule.value())
                    .isInstanceOfSatisfying(Map.class, texts -> assertThat((Map<String, Object>) texts)
                            .hasEntrySatisfying("title", title -> assertThat(title).isInstanceOf(String.class))
                            .hasEntrySatisfying("body", body -> assertThat(body).isInstanceOf(String.class)));
        }
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    @Property
    boolean aNoDecisionYetAlwaysPromisesALaterLook(
            @ForAll("weighInDays") List<Integer> daysAgo, @ForAll("planAges") int planAge, @ForAll Sex sex) {
        Optional<Decision> decision = DataSufficiency.check(
                snapshot(sex, TODAY.minusDays(planAge), weighInsOn(daysAgo)), parameters(sex));

        return decision.map(d -> d.nextReview().isAfter(TODAY)).orElse(true);
    }

    @Property
    boolean thePromisedReviewDayIsKeptByDailyWeighIns(
            @ForAll("weighInDays") List<Integer> daysAgo, @ForAll("planAges") int planAge, @ForAll Sex sex) {
        // The strongest reading of "no decision yet, look again on D": weigh in every morning until D, and on D the
        // data is enough. A broken promise would erode trust in every later call.
        LocalDate planStart = TODAY.minusDays(planAge);
        Optional<Decision> decision = DataSufficiency.check(snapshot(sex, planStart, weighInsOn(daysAgo)), parameters(sex));
        if (decision.isEmpty()) {
            return true;
        }
        LocalDate promised = decision.get().nextReview();
        List<WeighIn> kept = new ArrayList<>(weighInsOn(daysAgo));
        kept.addAll(daily(TODAY.plusDays(1), promised, "80.0"));
        Snapshot onPromisedDay = new Snapshot(promised, sex, Phase.CUT, planStart, series(kept));

        return DataSufficiency.check(onPromisedDay, parameters(sex)).isEmpty();
    }

    @Property
    boolean afterThePromisedDayDailyWeighInsKeepTheDataEnough(
            @ForAll("weighInDays") List<Integer> daysAgo, @ForAll("planAges") int planAge, @ForAll Sex sex) {
        // "Look again on D" must hold on D and on every later look — above all the next weekly check-in. Until the
        // window has moved past today's data, weeks counted back from a later day can split a thin week differently.
        LocalDate planStart = TODAY.minusDays(planAge);
        Optional<Decision> decision = DataSufficiency.check(snapshot(sex, planStart, weighInsOn(daysAgo)), parameters(sex));
        if (decision.isEmpty()) {
            return true;
        }
        LocalDate promised = decision.get().nextReview();
        int window = parameters(sex).wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
        for (LocalDate day = promised; !day.isAfter(promised.plusDays(window)); day = day.plusDays(1)) {
            List<WeighIn> kept = new ArrayList<>(weighInsOn(daysAgo));
            kept.addAll(daily(TODAY.plusDays(1), day, "80.0"));
            if (DataSufficiency.check(new Snapshot(day, sex, Phase.CUT, planStart, series(kept)), parameters(sex)).isPresent()) {
                return false;
            }
        }
        return true;
    }

    @Property
    boolean oneMoreWeighInNeverTurnsEnoughDataIntoTooLittle(
            @ForAll("weighInDays") List<Integer> daysAgo, @ForAll("planAges") int planAge,
            @ForAll("extraDay") int extra, @ForAll Sex sex) {
        LocalDate planStart = TODAY.minusDays(planAge);
        boolean enoughBefore = DataSufficiency.check(snapshot(sex, planStart, weighInsOn(daysAgo)), parameters(sex)).isEmpty();
        List<Integer> withExtra = new ArrayList<>(daysAgo);
        if (!withExtra.contains(extra)) {
            withExtra.add(extra);
        }
        boolean enoughAfter = DataSufficiency.check(snapshot(sex, planStart, weighInsOn(withExtra)), parameters(sex)).isEmpty();

        // The implication is only tested when "enough before" happens; make sure it does often enough.
        Statistics.label("enough before").collect(enoughBefore);
        Statistics.label("enough before").coverage(coverage -> coverage.check(true).percentage(p -> p > 20));
        return !enoughBefore || enoughAfter;
    }

    @Provide
    Arbitrary<List<Integer>> weighInDays() {
        // Mostly-dense histories with random gaps: sparse ones would rarely have enough data to test anything.
        Arbitrary<List<Integer>> dense = Arbitraries.integers().between(0, 60).set().ofMinSize(45).ofMaxSize(61)
                .map(List::copyOf);
        Arbitrary<List<Integer>> any = Arbitraries.integers().between(0, 60).set().ofMaxSize(61).map(List::copyOf);
        return Arbitraries.frequencyOf(Tuple.of(3, dense), Tuple.of(1, any));
    }

    @Provide
    Arbitrary<Integer> planAges() {
        return Arbitraries.frequencyOf(
                Tuple.of(3, Arbitraries.integers().between(28, 60)), Tuple.of(1, Arbitraries.integers().between(0, 27)));
    }

    @Provide
    Arbitrary<Integer> extraDay() {
        return Arbitraries.integers().between(0, 60);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    private static Snapshot snapshot(Sex sex, LocalDate planStart, List<WeighIn> weighIns) {
        return new Snapshot(TODAY, sex, Phase.CUT, planStart, series(weighIns));
    }

    private static List<WeighIn> weighInsOn(List<Integer> daysAgo) {
        return daysAgo.stream().map(ago -> weighIn(TODAY.minusDays(ago), "80.0")).toList();
    }

    /** Daily weigh-ins for months, except that the oldest week of the window has only {@code count} of them. */
    private static List<WeighIn> withOneWeekHaving(int count) {
        LocalDate weekStart = TODAY.minusDays(MALE_WINDOW - 1);
        List<WeighIn> weighIns = new ArrayList<>(daily(LONG_AGO, weekStart.minusDays(1), "80.0"));
        weighIns.addAll(daily(weekStart, weekStart.plusDays(count - 1), "80.0"));
        weighIns.addAll(daily(weekStart.plusDays(7), TODAY, "80.0"));
        return weighIns;
    }

    private static void assertNoDecisionYet(Optional<Decision> decision, String rule) {
        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.NoDecisionYet());
            assertThat(d.reasons()).extracting(Reason::rule).containsExactly(new RuleId(rule));
        });
    }
}
