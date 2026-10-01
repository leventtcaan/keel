package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ActionTally;
import app.keel.engine.Consistency;
import app.keel.engine.WeekTally;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * The week's consistency from the logs (K-220, ADR-020 L-6: the spine's adherence is the K-111 ratio, counted, not asked).
 * Weeks run Monday to Sunday in the user's zone (K-111); only weeks over by today count. A kind with no record on a day
 * — no meal logged, no step count — is neither done nor missed that day (U3, U7; DURUM question 20).
 */
class WeekTallyAssemblyTests {

    private static final LocalDate MON_28_SEP = LocalDate.of(2026, 9, 28);
    private static final WeekTallies.Plan PLAN = new WeekTallies.Plan(3, 4, 160, day -> 7000);

    @Test
    void theWindowsWeeksAreTheMondayWeeksOverByToday() {
        // The 21 days before Monday 5 Oct (today is not over): 14 Sep to 4 Oct, three whole weeks.
        assertThat(WeekTallies.weeks(LocalDate.of(2026, 10, 5), 21))
                .containsExactly(LocalDate.of(2026, 9, 14), LocalDate.of(2026, 9, 21), MON_28_SEP);
        // Thursday 8 Oct: from Thursday 17 Sep, the weeks starting 21 and 28 Sep; the week of 5 Oct is not over.
        assertThat(WeekTallies.weeks(LocalDate.of(2026, 10, 8), 21)).containsExactly(LocalDate.of(2026, 9, 21), MON_28_SEP);
        // Sunday 4 Oct: from 13 Sep; the week of 28 Sep ends today, not over yet.
        assertThat(WeekTallies.weeks(LocalDate.of(2026, 10, 4), 21)).containsExactly(LocalDate.of(2026, 9, 14), LocalDate.of(2026, 9, 21));
    }

    @Test
    void aWomansLongerWindowHoldsMoreWeeks() {
        // decision_window_days: female 28 — four whole weeks before a Monday, three before a Thursday.
        assertThat(WeekTallies.weeks(LocalDate.of(2026, 10, 5), 28)).hasSize(4);
        assertThat(WeekTallies.weeks(LocalDate.of(2026, 10, 8), 28)).hasSize(3);
    }

    @Test
    void weeksBeforeThePlanBeganAreNotCounted() {
        // A plan begun on Wednesday 23 Sep: its first whole week is 28 Sep; nothing was asked before it (U7).
        assertThat(WeekTallies.weeks(LocalDate.of(2026, 10, 5), 21, LocalDate.of(2026, 9, 23))).containsExactly(MON_28_SEP);
        assertThat(WeekTallies.weeks(LocalDate.of(2026, 10, 5), 21, LocalDate.of(2026, 9, 21))).as("begun on a Monday")
                .containsExactly(LocalDate.of(2026, 9, 21), MON_28_SEP);
    }

    @Test
    void twoWorkoutsOnOneDayAreOneSession() {
        // A workout abandoned and started again is still that day's session.
        WeekTallies.Logs logs = new WeekTallies.Logs(List.of(MON_28_SEP, MON_28_SEP, MON_28_SEP.plusDays(2)), Set.of(), Map.of(), Map.of());

        assertThat(WeekTallies.of(List.of(MON_28_SEP), logs, PLAN).getFirst().training()).isEqualTo(new ActionTally(3, 2));
    }

    @Test
    void aStepDayIsJudgedAgainstTheTargetInForceThatDay() {
        // Raised from 7000 to 10000 on Thursday (K-216, CHANGE_MOVEMENT): 8000 before it is done, 8000 after it is not.
        WeekTallies.Plan raisedThursday = new WeekTallies.Plan(3, 4, 160, day -> day.isBefore(MON_28_SEP.plusDays(3)) ? 7000 : 10000);
        WeekTallies.Logs logs = new WeekTallies.Logs(List.of(), Set.of(), Map.of(), Map.of(MON_28_SEP, 8000, MON_28_SEP.plusDays(2), 8000,
                MON_28_SEP.plusDays(3), 8000, MON_28_SEP.plusDays(4), 10000));

        assertThat(WeekTallies.of(List.of(MON_28_SEP), logs, raisedThursday).getFirst().steps()).isEqualTo(new ActionTally(4, 3));
    }

    @Test
    void aProteinMiddleOneGramShortIsNotDone() {
        // 159 + 160 = 319 < 320: the middle is 159.5 g, under 160.
        WeekTallies.Logs logs = new WeekTallies.Logs(List.of(), Set.of(), Map.of(MON_28_SEP, new WeekTallies.ProteinLogged(159, 160)), Map.of());

        assertThat(WeekTallies.of(List.of(MON_28_SEP), logs, PLAN).getFirst().protein()).isEqualTo(new ActionTally(1, 0));
    }

    @Test
    void noLogAtAllInTheWindowIsNoAdherenceNotZero() {
        // K-220: "veri yoksa boş" — nothing logged says nothing about following the plan.
        WeekTallies.Logs nothing = new WeekTallies.Logs(List.of(), Set.of(), Map.of(), Map.of());
        WeekTallies.Logs oneWeighIn = new WeekTallies.Logs(List.of(), Set.of(MON_28_SEP), Map.of(), Map.of());

        assertThat(WeekTallies.adherence(List.of(MON_28_SEP), nothing, PLAN)).isEmpty();
        assertThat(WeekTallies.adherence(List.of(MON_28_SEP), oneWeighIn, PLAN)).hasValueSatisfying(ratio ->
                assertThat(ratio).isEqualByComparingTo(new BigDecimal("1").divide(new BigDecimal("7"), java.math.MathContext.DECIMAL64)));
        assertThat(WeekTallies.adherence(List.of(), oneWeighIn, PLAN)).as("no whole week").isEmpty();
    }

    @Test
    void trainingIsTheWorkoutsOfTheWeekAgainstTheDaysChosen() {
        WeekTallies.Logs logs = new WeekTallies.Logs(List.of(MON_28_SEP, MON_28_SEP.plusDays(2), MON_28_SEP.plusDays(7)), Set.of(), Map.of(), Map.of());

        assertThat(WeekTallies.of(List.of(MON_28_SEP), logs, PLAN).getFirst().training()).isEqualTo(new ActionTally(3, 2));
    }

    @Test
    void weighInsAreTheDaysWeighedAgainstTheWeeksMinimum() {
        WeekTallies.Logs logs = new WeekTallies.Logs(List.of(), Set.of(MON_28_SEP, MON_28_SEP.plusDays(1), MON_28_SEP.plusDays(6),
                MON_28_SEP.minusDays(1)), Map.of(), Map.of());

        assertThat(WeekTallies.of(List.of(MON_28_SEP), logs, PLAN).getFirst().weighIns()).isEqualTo(new ActionTally(4, 3));
    }

    @Test
    void aProteinDayIsPlannedWhenFoodWasLoggedAndDoneWhenTheLoggedRangesMiddleReachesTheTarget() {
        // Target 160 g. Middles: 170 ✓, 160 ✓ (on the target), 150 ✗. The other four days have no meal logged.
        WeekTallies.Logs logs = new WeekTallies.Logs(List.of(), Set.of(), Map.of(
                MON_28_SEP, new WeekTallies.ProteinLogged(140, 200),
                MON_28_SEP.plusDays(1), new WeekTallies.ProteinLogged(120, 200),
                MON_28_SEP.plusDays(2), new WeekTallies.ProteinLogged(100, 200),
                MON_28_SEP.plusDays(7), new WeekTallies.ProteinLogged(300, 300)), Map.of());

        assertThat(WeekTallies.of(List.of(MON_28_SEP), logs, PLAN).getFirst().protein()).isEqualTo(new ActionTally(3, 2));
    }

    @Test
    void aStepDayIsPlannedWhenStepsWereCountedAndDoneAtTheTarget() {
        WeekTallies.Logs logs = new WeekTallies.Logs(List.of(), Set.of(), Map.of(), Map.of(
                MON_28_SEP, 7000, MON_28_SEP.plusDays(3), 6999, MON_28_SEP.plusDays(5), 12000));

        assertThat(WeekTallies.of(List.of(MON_28_SEP), logs, PLAN).getFirst().steps()).isEqualTo(new ActionTally(3, 2));
    }

    @Test
    void aWeekWithNothingLoggedStillPlansItsTrainingAndWeighInsAndIsPassedExplicitly() {
        // K-111: a missing week is not an empty one — every week of the window is passed, oldest first.
        List<WeekTally> weeks = WeekTallies.of(List.of(MON_28_SEP.minusWeeks(1), MON_28_SEP), new WeekTallies.Logs(List.of(), Set.of(), Map.of(),
                Map.of()), PLAN);

        assertThat(weeks).extracting(WeekTally::weekStart).containsExactly(MON_28_SEP.minusWeeks(1), MON_28_SEP);
        assertThat(weeks.getFirst()).isEqualTo(new WeekTally(MON_28_SEP.minusWeeks(1), new ActionTally(3, 0), new ActionTally(0, 0),
                new ActionTally(0, 0), new ActionTally(4, 0)));
    }

    @Test
    void theAdherenceIsTheWindowsRatio() {
        // 2 of 3 sessions, 4 of 4 weigh-ins, 1 of 1 protein day: 7 of 8.
        WeekTallies.Logs logs = new WeekTallies.Logs(List.of(MON_28_SEP, MON_28_SEP.plusDays(2)),
                Set.of(MON_28_SEP, MON_28_SEP.plusDays(1), MON_28_SEP.plusDays(2), MON_28_SEP.plusDays(3)),
                Map.of(MON_28_SEP, new WeekTallies.ProteinLogged(160, 180)), Map.of());

        assertThat(Consistency.windowRatio(WeekTallies.of(List.of(MON_28_SEP), logs, PLAN)))
                .hasValueSatisfying(ratio -> assertThat(ratio).isEqualByComparingTo(new BigDecimal("0.875")));
    }

    @Test
    void thisWeekCountsTrainingAndWeighInsToTodayAndProteinAndStepsToYesterday() {
        // K-420: Thursday 1 Oct, the week of Monday 28 Sep. Today is not over: a protein or step day is judged once it is;
        // a session or a weigh-in done today is done. Planned training and weigh-ins are the whole week's.
        LocalDate thursday = LocalDate.of(2026, 10, 1);
        WeekTallies.Logs logs = new WeekTallies.Logs(
                List.of(MON_28_SEP.minusDays(1), MON_28_SEP, MON_28_SEP.plusDays(2), thursday),
                Set.of(MON_28_SEP, MON_28_SEP.plusDays(1), thursday),
                Map.of(MON_28_SEP, new WeekTallies.ProteinLogged(150, 170), MON_28_SEP.plusDays(1), new WeekTallies.ProteinLogged(100, 120),
                        thursday, new WeekTallies.ProteinLogged(200, 220)),
                Map.of(MON_28_SEP.plusDays(2), 8000, thursday, 9000));

        WeekTally week = WeekTallies.thisWeek(thursday, logs, PLAN);

        assertThat(week.weekStart()).isEqualTo(MON_28_SEP);
        assertThat(week.training()).as("Sunday's session is last week's").isEqualTo(new ActionTally(3, 3));
        assertThat(week.weighIns()).isEqualTo(new ActionTally(4, 3));
        assertThat(week.protein()).as("Monday and Tuesday judged, today not yet").isEqualTo(new ActionTally(2, 1));
        assertThat(week.steps()).as("Wednesday judged, today not yet").isEqualTo(new ActionTally(1, 1));
    }

    @Test
    void onAMondayThisWeekHasOnlyTodaysSessionAndWeighInToCount() {
        WeekTallies.Logs logs = new WeekTallies.Logs(List.of(MON_28_SEP), Set.of(MON_28_SEP), Map.of(MON_28_SEP, new WeekTallies.ProteinLogged(200, 220)),
                Map.of(MON_28_SEP, 9000));

        WeekTally week = WeekTallies.thisWeek(MON_28_SEP, logs, PLAN);

        assertThat(week).isEqualTo(new WeekTally(MON_28_SEP, new ActionTally(3, 1), new ActionTally(0, 0), new ActionTally(0, 0), new ActionTally(4, 1)));
    }

    @Test
    void theRecordCountsTheWeeksOverSinceTheFirstCall() {
        // First call Monday 14 Sep, today Thursday 1 Oct: 14 and 21 Sep are over; this week is not.
        assertThat(WeekTallies.since(LocalDate.of(2026, 9, 14), LocalDate.of(2026, 10, 1)))
                .containsExactly(LocalDate.of(2026, 9, 14), LocalDate.of(2026, 9, 21));
        // A first call on Wednesday 16 Sep: its week was not asked whole (U7), the record begins on 21 Sep.
        assertThat(WeekTallies.since(LocalDate.of(2026, 9, 16), LocalDate.of(2026, 10, 1))).containsExactly(LocalDate.of(2026, 9, 21));
        // Sunday 27 Sep: the week of 21 Sep ends today, not over yet.
        assertThat(WeekTallies.since(LocalDate.of(2026, 9, 14), LocalDate.of(2026, 9, 27))).containsExactly(LocalDate.of(2026, 9, 14));
        assertThat(WeekTallies.since(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 1))).isEmpty();
    }

    @Test
    void thePercentIsRoundedDownSoItNeverClaimsMore() {
        // 16 of 19 is 84.2 → 84; 8 of 9 is 88.9 → 88, not 89 (U7's other side: no flattering).
        assertThat(WeekTallies.percent(new WeekTally(MON_28_SEP, new ActionTally(3, 2), new ActionTally(4, 3), new ActionTally(5, 5),
                new ActionTally(7, 6)))).hasValue(84);
        assertThat(WeekTallies.percent(new WeekTally(MON_28_SEP, new ActionTally(3, 3), new ActionTally(2, 1), new ActionTally(0, 0),
                new ActionTally(4, 4)))).hasValue(88);
        assertThat(WeekTallies.percent(new WeekTally(MON_28_SEP, new ActionTally(0, 0), new ActionTally(0, 0), new ActionTally(0, 0),
                new ActionTally(0, 0)))).as("nothing planned has no percent").isEmpty();
    }
}
