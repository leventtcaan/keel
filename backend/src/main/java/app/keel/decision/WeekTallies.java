package app.keel.decision;

import app.keel.engine.ActionTally;
import app.keel.engine.Consistency;
import app.keel.engine.WeekTally;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * The weeks' consistency from the logs (K-220, ADR-020 L-6: the spine's adherence is the K-111 ratio — counted, not
 * asked). Per week (Monday to Sunday, K-111):
 *
 * <ul>
 *   <li><b>Training</b>: the days the user chose; done, the days a workout was started that week.</li>
 *   <li><b>Weigh-ins</b>: min_weighins_per_week; done, the days weighed.</li>
 *   <li><b>Protein</b>: planned on each day food was logged; done when the logged range's middle reaches the target.</li>
 *   <li><b>Steps</b>: planned on each day steps were counted; done at the step target in force that day.</li>
 * </ul>
 *
 * <p>Weeks before the plan began are not counted, and a window with nothing logged at all has no adherence (K-220:
 * "veri yoksa boş"). A day with no meal or no step count is neither done nor missed: the app does not know (U3), and does not blame
 * (U7). Training and weigh-ins are planned every week. DURUM question 20 holds the alternatives.
 */
final class WeekTallies {

    /** What the modules logged over the weeks, on the user's calendar. */
    record Logs(List<LocalDate> workoutDays, Set<LocalDate> weighInDays, Map<LocalDate, ProteinLogged> protein, Map<LocalDate, Integer> steps) {
    }

    /** A day's logged protein as a range (U5). */
    record ProteinLogged(int lowG, int highG) {
    }

    /**
     * What the plan asks of a week: the sessions of each week by its Monday (the program it had, K-535), the step target of
     * each day (it can change mid-window, K-216).
     */
    record Plan(Function<LocalDate, Integer> trainingSessionsIn, int weighInsPerWeek, int proteinG, Function<LocalDate, Integer> stepsOn) {
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

    /** The window's weeks from the first that starts on or after the plan began: nothing was asked before it (U7). */
    static List<LocalDate> weeks(LocalDate today, int windowDays, LocalDate planBegan) {
        return weeks(today, windowDays).stream().filter(week -> !week.isBefore(planBegan)).toList();
    }

    /** Done over planned over the weeks; empty with no whole week, or nothing logged at all (nothing to go by). */
    static Optional<BigDecimal> adherence(List<LocalDate> weeks, Logs logs, Plan plan) {
        return adherence(logs, of(weeks, logs, plan)).map(Consistency.WindowCount::ratio);
    }

    /**
     * The window's count over these tallies (some paused, K-516): its ratio is the adherence, its numbers are kept with
     * the call (K-526). Nothing logged at all is no adherence.
     */
    static Optional<Consistency.WindowCount> adherence(Logs logs, List<WeekTally> tallies) {
        boolean nothingLogged = logs.workoutDays().isEmpty() && logs.weighInDays().isEmpty() && logs.protein().isEmpty() && logs.steps().isEmpty();
        return nothingLogged ? Optional.empty() : Consistency.windowCount(tallies);
    }

    /** One tally per week given, every week passed even with nothing logged (K-111: missing is not empty). */
    static List<WeekTally> of(List<LocalDate> weeks, Logs logs, Plan plan) {
        return weeks.stream().map(week -> {
            Predicate<LocalDate> inWeek = day -> !day.isBefore(week) && day.isBefore(week.plusWeeks(1));
            // Two workouts on one day are that day's session (one abandoned and started again).
            int workouts = (int) logs.workoutDays().stream().filter(inWeek).distinct().count();
            int weighed = (int) logs.weighInDays().stream().filter(inWeek).count();
            List<ProteinLogged> protein = logs.protein().entrySet().stream().filter(day -> inWeek.test(day.getKey())).map(Map.Entry::getValue).toList();
            List<Map.Entry<LocalDate, Integer>> steps = logs.steps().entrySet().stream().filter(day -> inWeek.test(day.getKey())).toList();
            // The middle of the range reaches the target: low + high ≥ 2 × target, whole grams, no rounding.
            int proteinDone = (int) protein.stream().filter(day -> day.lowG() + day.highG() >= 2 * plan.proteinG()).count();
            int stepsDone = (int) steps.stream().filter(day -> day.getValue() >= plan.stepsOn().apply(day.getKey())).count();
            return new WeekTally(week, new ActionTally(plan.trainingSessionsIn().apply(week), workouts), new ActionTally(protein.size(), proteinDone),
                    new ActionTally(steps.size(), stepsDone), new ActionTally(plan.weighInsPerWeek(), weighed));
        }).toList();
    }

    /**
     * This week so far, Monday to today (K-420: the Today screen's number). Today is not over: a protein or step day is
     * judged once it is, so those count up to yesterday; a session or a weigh-in done today is done. Training and
     * weigh-ins are planned for the whole week, as in a week over.
     */
    static WeekTally thisWeek(LocalDate today, Logs logs, Plan plan) {
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(Consistency.WEEK_STARTS_ON));
        Logs judged = new Logs(logs.workoutDays().stream().filter(day -> !day.isAfter(today)).toList(),
                logs.weighInDays().stream().filter(day -> !day.isAfter(today)).collect(Collectors.toSet()),
                before(logs.protein(), today), before(logs.steps(), today));
        return of(List.of(monday), judged, plan).getFirst();
    }

    /**
     * The weeks over by today since the first call (K-420: the record, never reset, U7) — from the first week that starts
     * on or after it, as for the window (a week the plan did not ask whole is not counted).
     */
    static List<LocalDate> since(LocalDate firstCall, LocalDate today) {
        return weeks(today, (int) ChronoUnit.DAYS.between(firstCall, today), firstCall);
    }

    /** The week's done over planned in whole percent, rounded down so it never claims more; none with nothing planned. */
    static OptionalInt percent(WeekTally week) {
        return week.planned() == 0 ? OptionalInt.empty() : OptionalInt.of(week.done() * 100 / week.planned());
    }

    private static <T> Map<LocalDate, T> before(Map<LocalDate, T> days, LocalDate today) {
        return days.entrySet().stream().filter(day -> day.getKey().isBefore(today)).collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }
}
