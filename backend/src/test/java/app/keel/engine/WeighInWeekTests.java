package app.keel.engine;

import static app.keel.engine.EngineFixtures.daily;
import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.weighIn;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * This week's weigh-ins against what the next call needs (ADR-089 #1): the block is the engine's own, the seven days ending
 * on the day of the call; it is short when the days weighed plus the days left cannot reach min_weighins_per_week; and
 * then the day the call can read the data is DataSufficiency's own review date, not a second formula.
 */
class WeighInWeekTests {

    private static final Parameters MALE = parameters(Sex.MALE);
    private static final int NEEDED = MALE.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK);

    // The check-in is Monday 2 November 2026; its block is Tuesday 27 October to that Monday.
    private static final LocalDate CHECK_IN = LocalDate.of(2026, 11, 2);
    private static final LocalDate TUESDAY = LocalDate.of(2026, 10, 27);
    private static final LocalDate THURSDAY = LocalDate.of(2026, 10, 29);
    private static final LocalDate SATURDAY = LocalDate.of(2026, 10, 31);
    private static final LocalDate SUNDAY = LocalDate.of(2026, 11, 1);
    private static final LocalDate LONG_AGO = LocalDate.of(2026, 6, 1);

    @Test
    void theExpectationsBelowAssumeTodaysParameter() {
        // They are worked out by hand from this value; if it changes on purpose, redo them.
        assertThat(NEEDED).isEqualTo(4);
    }

    @Test
    void theBlockIsTheSevenDaysEndingOnTheCheckInDay() {
        WeighInWeek week = WeighInWeek.of(SATURDAY, CHECK_IN, LONG_AGO, series(), MALE);

        assertThat(week.from()).isEqualTo(TUESDAY);
        assertThat(week.to()).isEqualTo(CHECK_IN);
        assertThat(week.needed()).isEqualTo(NEEDED);
    }

    @Test
    void fourWeighInsInTheBlockIsOnTrackWithNoDateToPromise() {
        WeighInWeek week = WeighInWeek.of(SATURDAY, CHECK_IN, LONG_AGO, series(daily(TUESDAY, SATURDAY.minusDays(1), "80.0")), MALE);

        assertThat(week.weighedDays()).containsExactly(TUESDAY, TUESDAY.plusDays(1), THURSDAY, THURSDAY.plusDays(1));
        assertThat(week.callsFrom()).isEmpty();
    }

    @Test
    void behindButEveryMorningFromTodayStillReachesIt() {
        // Thursday, one weigh-in so far: Thursday to Monday are five mornings, 1 + 5 >= 4.
        WeighInWeek week = WeighInWeek.of(THURSDAY, CHECK_IN, LONG_AGO, series(List.of(weighIn(TUESDAY, "80.0"))), MALE);

        assertThat(week.weighedDays()).containsExactly(TUESDAY);
        assertThat(week.callsFrom()).isEmpty();
    }

    @Test
    void exactlyReachableOnTheLastTwoDaysWhenTodayIsNotWeighedYet() {
        // Sunday with two weigh-ins: Sunday and Monday are the two mornings left, 2 + 2 = 4.
        WeighInWeek week = WeighInWeek.of(SUNDAY, CHECK_IN, LONG_AGO,
                series(List.of(weighIn(TUESDAY, "80.0"), weighIn(TUESDAY.plusDays(1), "80.0"))), MALE);

        assertThat(week.weighedDays()).hasSize(2);
        assertThat(week.callsFrom()).isEmpty();
    }

    @Test
    void exactlyReachableWhenTodayIsWeighedAndOnlyTheCheckInDayIsLeft() {
        // Sunday with three, today's one of them: only Monday is left, 3 + 1 = 4. Today does not count twice.
        WeighInWeek week = WeighInWeek.of(SUNDAY, CHECK_IN, LONG_AGO,
                series(List.of(weighIn(TUESDAY, "80.0"), weighIn(TUESDAY.plusDays(1), "80.0"), weighIn(SUNDAY, "80.0"))), MALE);

        assertThat(week.weighedDays()).hasSize(3);
        assertThat(week.callsFrom()).isEmpty();
    }

    @Test
    void oneMorningShortNoLongerHoldsTheCallBack() {
        // K1 (ADR-091 Ek 4, K-1204): the same week as before, 1 weighed + 2 mornings left = 3 < 4, used to name 19 Nov. The
        // window now flexes with the edge weeks' weigh-ins (3 weigh-ins: margin 0.63 kg), so the call on Monday reads the data
        // and no date is promised.
        WeightSeries weights = dailyUntilTuesday();

        WeighInWeek week = WeighInWeek.of(SUNDAY, CHECK_IN, LONG_AGO, weights, MALE);

        assertThat(week.weighedDays()).containsExactly(TUESDAY);
        assertThat(week.callsFrom()).isEmpty();
    }

    @Test
    void callsFromIsTheReviewDateOfTheCallMadeOnTheSameData() {
        // K1 (ADR-091 Ek 4, K-1204): with the same dense history before the week, the call is made (no "not yet"), and no date
        // is promised. Where the data cannot carry the call (a new user, below) the date is the call's own review date.
        WeightSeries weights = dailyUntilTuesday();

        Optional<LocalDate> callsFrom = WeighInWeek.of(SUNDAY, CHECK_IN, LONG_AGO, weights, MALE).callsFrom();
        Optional<Decision> call = DataSufficiency.check(new Snapshot(SUNDAY, Sex.MALE, Phase.CUT, LONG_AGO, weights), MALE);

        assertThat(call).isEmpty();
        assertThat(callsFrom).isEmpty();

        WeightSeries none = series(List.of(weighIn(SUNDAY, "80.0")));
        Optional<Decision> newUser = DataSufficiency.check(new Snapshot(SUNDAY, Sex.MALE, Phase.CUT, SUNDAY, none), MALE);
        assertThat(newUser).isPresent();
        assertThat(WeighInWeek.of(SUNDAY, CHECK_IN, SUNDAY, none, MALE).callsFrom()).contains(newUser.orElseThrow().nextReview());
    }

    @Test
    void aBlockThatStartsBeforeTheFirstWeighInCountsOnlyTheDaysWeighed() {
        // A new user, first weigh-in on Thursday, in a block that began on Tuesday: 1 weighed (today), Friday to Monday four
        // mornings left, 5 >= 4. Nothing is made up for Tuesday and Wednesday.
        WeighInWeek week = WeighInWeek.of(THURSDAY, CHECK_IN, THURSDAY, series(List.of(weighIn(THURSDAY, "80.0"))), MALE);

        assertThat(week.from()).isEqualTo(TUESDAY);
        assertThat(week.weighedDays()).containsExactly(THURSDAY);
        assertThat(week.callsFrom()).isEmpty();
    }

    @Test
    void aNewUserWhoStartsOnSundayIsShortAndTheDateIsAfterTheCheckIn() {
        // First weigh-in on Sunday, the plan began that day too: 1 weighed + Monday = 2 < 4.
        WeighInWeek week = WeighInWeek.of(SUNDAY, CHECK_IN, SUNDAY, series(List.of(weighIn(SUNDAY, "80.0"))), MALE);

        assertThat(week.weighedDays()).containsExactly(SUNDAY);
        assertThat(week.callsFrom()).hasValueSatisfying(day -> assertThat(day).isAfter(CHECK_IN));
    }

    @Test
    void aFirstCallsPlanThatHasNotStartedYetIsJudgedFromItsStart() {
        // The plan starts with the first call, on Monday 2 Nov; its 21-day window is full from Sunday 22 Nov, and the weigh-ins
        // daily from Monday keep every block full by then (the oldest holds 2 to 8 Nov).
        WeighInWeek week = WeighInWeek.of(SUNDAY, CHECK_IN, CHECK_IN, series(List.of(weighIn(SUNDAY, "80.0"))), MALE);

        assertThat(week.callsFrom()).contains(LocalDate.of(2026, 11, 22));
    }

    @ParameterizedTest(name = "{0}, plan starting {1} days on")
    @MethodSource("everyPlanStartTheFirstCallCanHave")
    void aPlanStartingWithinTheWeekIsNeverBeyondTheSearch(Sex sex, int daysOn) {
        // Nothing weighed and the first call within two days: the block is short (it never is with more mornings left than
        // the minimum), and the window of the plan starting with that call, still ahead, is found by the search.
        LocalDate planStart = SUNDAY.plusDays(daysOn);

        WeighInWeek week = WeighInWeek.of(SUNDAY, planStart, planStart, series(), parameters(sex));

        int window = parameters(sex).wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
        assertThat(week.callsFrom()).hasValueSatisfying(day -> assertThat(day).isAfterOrEqualTo(planStart.plusDays(window - 1L)));
    }

    static Stream<Arguments> everyPlanStartTheFirstCallCanHave() {
        return Stream.of(Sex.values()).flatMap(sex -> IntStream.rangeClosed(0, 2).mapToObj(days -> Arguments.of(sex, days)));
    }

    @Test
    void weighInsBeforeTheBlockAreNotCounted() {
        WeighInWeek week = WeighInWeek.of(TUESDAY.plusDays(1), CHECK_IN, LONG_AGO, dailyUntilTuesday(), MALE);

        assertThat(week.weighedDays()).containsExactly(TUESDAY);
    }

    @Test
    void anOpenCallsBlockEndsTodayAndTodayIsTheOnlyDayLeft() {
        // The check-in day has come without a call: the block ends today. Four weighed, today not yet: on track.
        WeighInWeek week = WeighInWeek.of(CHECK_IN, CHECK_IN, LONG_AGO, series(daily(TUESDAY, TUESDAY.plusDays(3), "80.0")), MALE);

        assertThat(week.weighedDays()).hasSize(4);
        assertThat(week.callsFrom()).isEmpty();
    }

    @Test
    void anOpenCallWithNothingWeighedInTheBlockIsShort() {
        // Nothing in the block, and today is the only morning left: 0 + 1 < 4.
        WeighInWeek week = WeighInWeek.of(CHECK_IN, CHECK_IN, LONG_AGO, series(daily(LONG_AGO, TUESDAY.minusDays(1), "80.0")), MALE);

        assertThat(week.weighedDays()).isEmpty();
        assertThat(week.callsFrom()).hasValueSatisfying(day -> assertThat(day).isAfter(CHECK_IN));
    }

    @Test
    void aWomansBlockNeedsHerParameter() {
        Parameters female = parameters(Sex.FEMALE);

        WeighInWeek week = WeighInWeek.of(SUNDAY, CHECK_IN, LONG_AGO, series(), female);

        assertThat(week.needed()).isEqualTo(female.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK));
    }

    @Test
    void aCheckInDayBeforeTodayIsRefused() {
        assertThatIllegalArgumentException().isThrownBy(() -> WeighInWeek.of(CHECK_IN, CHECK_IN.minusDays(1), LONG_AGO, series(), MALE));
    }

    @Test
    void aWeighInAfterTodayIsRefused() {
        assertThatIllegalArgumentException().isThrownBy(() -> WeighInWeek.of(TUESDAY, CHECK_IN, LONG_AGO,
                series(List.of(weighIn(TUESDAY.plusDays(1), "80.0"))), MALE));
    }

    /** Weighed every day from long ago to Tuesday 27 October, nothing after. */
    private static WeightSeries dailyUntilTuesday() {
        return series(daily(LONG_AGO, TUESDAY, "80.0"));
    }

    private static WeightSeries series(List<WeighIn> weighIns) {
        return new WeightSeries(weighIns);
    }

    private static WeightSeries series() {
        return new WeightSeries(new ArrayList<>());
    }
}
