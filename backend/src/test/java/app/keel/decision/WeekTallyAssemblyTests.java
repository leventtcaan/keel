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
    private static final WeekTallies.Plan PLAN = new WeekTallies.Plan(3, 4, 160, 7000);

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
}
