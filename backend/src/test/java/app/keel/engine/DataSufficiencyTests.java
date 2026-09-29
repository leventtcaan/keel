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

    // ── the first days: no interpretation ───────────────────────────────────────────────────────────────────

    @Test
    void withNoWeighInsThereIsNoDecisionYet() {
        Optional<Decision> decision = DataSufficiency.check(snapshot(Sex.MALE, LONG_AGO, List.of()), MALE);

        assertNoDecisionYet(decision, "data_insufficient");
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
        assertThat(decision.orElseThrow().nextReview()).isEqualTo(TODAY.plusDays(1));
    }

    @Test
    void afterTheNoInterpretationPeriodTheRemainingGapIsWeighInsPerWeek() {
        // Exactly the no-interpretation period of data passes the first check (so its "tomorrow" review is gone);
        // the window's oldest week is still empty, so the week-count rule answers, a week later.
        LocalDate first = TODAY.minusDays(NO_INTERPRETATION_DAYS - 1);
        Optional<Decision> decision = DataSufficiency.check(
                snapshot(Sex.MALE, LONG_AGO, daily(first, TODAY, "80.0")), MALE);

        assertNoDecisionYet(decision, "data_insufficient");
        assertThat(decision.orElseThrow().nextReview()).isEqualTo(TODAY.plusDays(7));
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

    // ── weigh-ins per week inside the window ────────────────────────────────────────────────────────────────

    @Test
    void aWeekWithTooFewWeighInsLeavesTheWindowUnreadable() {
        Optional<Decision> decision = DataSufficiency.check(
                snapshot(Sex.MALE, LONG_AGO, withOneWeekHaving(MIN_PER_WEEK - 1)), MALE);

        assertNoDecisionYet(decision, "data_insufficient");
        assertThat(decision.orElseThrow().nextReview()).isEqualTo(TODAY.plusDays(7));
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

        for (RuleId rule : List.of(DataSufficiency.DATA_INSUFFICIENT, DataSufficiency.WINDOW_NOT_FULL)) {
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

        return !enoughBefore || enoughAfter;
    }

    @Provide
    Arbitrary<List<Integer>> weighInDays() {
        return Arbitraries.integers().between(0, 60).set().ofMaxSize(61).map(set -> List.copyOf(set));
    }

    @Provide
    Arbitrary<Integer> planAges() {
        return Arbitraries.integers().between(0, 60);
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
