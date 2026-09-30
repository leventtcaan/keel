package app.keel.decision;

import app.keel.engine.ActionTally;
import app.keel.engine.Consistency;
import app.keel.engine.WeekTally;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;

/**
 * The weeks' consistency from the logs (K-220, ADR-020 L-6: the spine's adherence is the K-111 ratio — counted, not
 * asked). Per week (Monday to Sunday, K-111):
 *
 * <ul>
 *   <li><b>Training</b>: the days the user chose; done, the workouts started that week.</li>
 *   <li><b>Weigh-ins</b>: min_weighins_per_week; done, the days weighed.</li>
 *   <li><b>Protein</b>: planned on each day food was logged; done when the logged range's middle reaches the target.</li>
 *   <li><b>Steps</b>: planned on each day steps were counted; done at the step target.</li>
 * </ul>
 *
 * <p>A day with no meal or no step count is neither done nor missed: the app does not know (U3), and does not blame
 * (U7). Training and weigh-ins are planned every week. DURUM question 20 holds the alternatives.
 */
final class WeekTallies {

    /** What the modules logged over the weeks, on the user's calendar. */
    record Logs(List<LocalDate> workoutDays, Set<LocalDate> weighInDays, Map<LocalDate, ProteinLogged> protein, Map<LocalDate, Integer> steps) {
    }

    /** A day's logged protein as a range (U5). */
    record ProteinLogged(int lowG, int highG) {
    }

    /** What the plan asks of a week. */
    record Plan(int trainingDaysPerWeek, int weighInsPerWeek, int proteinG, int stepsPerDay) {
    }

    private static final int DAYS_PER_WEEK = 7;

    private WeekTallies() {
    }

    /** The weeks inside the {@code windowDays} days before today (today is not over), oldest first. */
    static List<LocalDate> weeks(LocalDate today, int windowDays) {
        List<LocalDate> weeks = new ArrayList<>();
        LocalDate week = today.minusDays(windowDays).with(TemporalAdjusters.nextOrSame(Consistency.WEEK_STARTS_ON));
        for (; week.plusDays(DAYS_PER_WEEK - 1L).isBefore(today); week = week.plusWeeks(1)) {
            weeks.add(week);
        }
        return weeks;
    }

    /** One tally per week given, every week passed even with nothing logged (K-111: missing is not empty). */
    static List<WeekTally> of(List<LocalDate> weeks, Logs logs, Plan plan) {
        return weeks.stream().map(week -> {
            Predicate<LocalDate> inWeek = day -> !day.isBefore(week) && day.isBefore(week.plusWeeks(1));
            int workouts = (int) logs.workoutDays().stream().filter(inWeek).count();
            int weighed = (int) logs.weighInDays().stream().filter(inWeek).count();
            List<ProteinLogged> protein = logs.protein().entrySet().stream().filter(day -> inWeek.test(day.getKey())).map(Map.Entry::getValue).toList();
            List<Integer> steps = logs.steps().entrySet().stream().filter(day -> inWeek.test(day.getKey())).map(Map.Entry::getValue).toList();
            // The middle of the range reaches the target: low + high ≥ 2 × target, whole grams, no rounding.
            int proteinDone = (int) protein.stream().filter(day -> day.lowG() + day.highG() >= 2 * plan.proteinG()).count();
            int stepsDone = (int) steps.stream().filter(count -> count >= plan.stepsPerDay()).count();
            return new WeekTally(week, new ActionTally(plan.trainingDaysPerWeek(), workouts), new ActionTally(protein.size(), proteinDone),
                    new ActionTally(steps.size(), stepsDone), new ActionTally(plan.weighInsPerWeek(), weighed));
        }).toList();
    }
}
