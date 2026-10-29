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
import org.junit.jupiter.api.Test;

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
    void oneMorningShortNamesTheDayTheCallCanReadTheData() {
        // Sunday with one weigh-in (Tuesday), the days before it weighed daily: 1 + 2 mornings left = 3 < 4.
        WeightSeries weights = dailyUntilTuesday();

        WeighInWeek week = WeighInWeek.of(SUNDAY, CHECK_IN, LONG_AGO, weights, MALE);

        assertThat(week.weighedDays()).containsExactly(TUESDAY);
        // By hand, weighing every morning from Monday 2 Nov: the block ending on a day D holds 4 from D = 5 Nov; the block
        // before it (D-13..D-7) holds 2 Nov to D-7, so it needs D >= 12 Nov; and the oldest block (D-20..D-14) holds the days
        // up to Tuesday 27 Oct and any from 2 Nov on, and has 3 or fewer on 14 to 18 Nov. The data stays enough from 19 Nov.
        assertThat(week.callsFrom()).contains(LocalDate.of(2026, 11, 19));
    }

    @Test
    void callsFromIsTheReviewDateOfTheCallMadeOnTheSameData() {
        WeightSeries weights = dailyUntilTuesday();

        Optional<LocalDate> callsFrom = WeighInWeek.of(SUNDAY, CHECK_IN, LONG_AGO, weights, MALE).callsFrom();
        Optional<Decision> call = DataSufficiency.check(new Snapshot(SUNDAY, Sex.MALE, Phase.CUT, LONG_AGO, weights), MALE);

        assertThat(call).isPresent();
        assertThat(callsFrom).contains(call.orElseThrow().nextReview());
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
