package app.keel.engine;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalDouble;
import java.util.Set;
import java.util.function.Function;

/**
 * The coach's own questions between the weekly calls (K-512, ADR-039): Güray's triggers (G5 §2), asked in the app — never
 * pushed (ADR-036). Each carries its rule, its source and a key for the occurrence — the same for as long as it lasts —
 * so it is asked once. None changes a call (U1, U2: the weekly engine decides); none while a state is declared, and no
 * day the user or the ladder paused counts against anyone (ADR-038). In priority order: steps first, Güray's
 * "highest-priority metabolic warning".
 */
public final class Prompts {

    static final RuleId STEPS_DROPPED = new RuleId("steps_dropped");
    static final RuleId SESSIONS_MISSED = new RuleId("sessions_missed");
    static final RuleId LOADS_DROPPED = new RuleId("loads_dropped");
    static final RuleId HUNGER_FIRST_DAYS = new RuleId("hunger_first_days");
    private static final Source STEPS = new Source("arastirma/ham/guray/G5-surec-supplement.md#T-13", SourceTag.EXPERIENCE);
    private static final Source SESSIONS = new Source("arastirma/ham/guray/G5-surec-supplement.md#T-4", SourceTag.EXPERIENCE);
    private static final Source LOADS = new Source("arastirma/ham/guray/G5-surec-supplement.md#T-5", SourceTag.EXPERIENCE);
    private static final Source HUNGER = new Source("arastirma/ham/guray/G5-surec-supplement.md#T-2", SourceTag.EXPERIENCE);
    private static final int DAYS_PER_WEEK = 7;

    /** One question: its rule and source (U14), the occurrence it is for, its words, its answers. */
    public record Prompt(RuleId rule, Source source, String key, CopyKey copyKey, List<String> choices) {
    }

    /**
     * What the questions read, on the user's calendar.
     *
     * @param phase the plan's direction; none before the first call
     * @param steps the step count of each day that has one
     * @param stepTarget the plan's step target on each day: a week is judged against the target it had (K-220 review)
     * @param trainingDaysSince the day the program began asking for these training days
     * @param sessionDays the days a session was done (a set past the warm-ups, K-431)
     * @param pausedDays the days nothing was asked: a state declared (ADR-038), a week off the ladder gave
     * @param lighterDays the days the ladder lowered the work on purpose (a lighter week)
     * @param loadsDroppedLastWeek the calendar week just over lifted less than the one before (G7 K-73's reading)
     * @param deficitBegan the first day of this cut's deficit: its first target under maintenance — not the watch at the
     *     maintenance estimate (K-114) that comes before it
     * @param declaredNow a state is in force today
     */
    public record Facts(LocalDate today, Optional<Phase> phase, Map<LocalDate, Integer> steps, Function<LocalDate, Integer> stepTarget,
            List<DayOfWeek> trainingDays,
            LocalDate trainingDaysSince, List<LocalDate> sessionDays, Set<LocalDate> pausedDays, Set<LocalDate> lighterDays,
            boolean loadsDroppedLastWeek, Optional<LocalDate> deficitBegan, boolean declaredNow) {
    }

    private Prompts() {
    }

    /** Today's questions, most pressing first. */
    public static List<Prompt> today(Facts facts, Parameters parameters) {
        if (facts.declaredNow()) {
            return List.of();
        }
        List<Prompt> prompts = new ArrayList<>();
        // The calendar week just over: a week is judged once it is over, and a question about it keeps its key all week.
        LocalDate lastWeek = facts.today().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(1);
        if (stepsDropped(facts, lastWeek, parameters)) {
            prompts.add(prompt(STEPS_DROPPED, STEPS, lastWeek.toString(), "BUSY", "LESS"));
        }
        firstMissed(facts, parameters).ifPresent(day -> prompts.add(prompt(SESSIONS_MISSED, SESSIONS, day.toString(), "FIXED_TIME", "LIFE", "NOT_NOW")));
        if (loadsDropped(facts, lastWeek)) {
            prompts.add(prompt(LOADS_DROPPED, LOADS, lastWeek.toString(), "OK"));
        }
        facts.deficitBegan().filter(began -> onACut(facts) && !facts.today().isBefore(began)
                        && facts.today().isBefore(began.plusDays(parameters.wholeNumber(ParameterKey.HUNGER_QUESTION_DAYS))))
                .ifPresent(began -> prompts.add(prompt(HUNGER_FIRST_DAYS, HUNGER, began.toString(), "HUNGRY", "NOT_HUNGRY")));
        return List.copyOf(prompts);
    }

    /**
     * T-13: the last calendar week's average under the target after the week before was on it — paused days not counted,
     * each week with enough days left (min_logged_days_per_week), or nothing is said.
     */
    private static boolean stepsDropped(Facts facts, LocalDate lastWeek, Parameters parameters) {
        int enough = parameters.wholeNumber(ParameterKey.MIN_LOGGED_DAYS_PER_WEEK);
        OptionalDouble last = average(facts, lastWeek, enough);
        OptionalDouble before = average(facts, lastWeek.minusWeeks(1), enough);
        return last.isPresent() && before.isPresent() && last.getAsDouble() < facts.stepTarget().apply(facts.today()) && before.getAsDouble() >= facts.stepTarget().apply(facts.today());
    }

    /** The average of the week from {@code monday}, if at least {@code enough} of its days not paused have a count. */
    private static OptionalDouble average(Facts facts, LocalDate monday, int enough) {
        List<Integer> counts = monday.datesUntil(monday.plusWeeks(1)).filter(day -> !facts.pausedDays().contains(day))
                .map(facts.steps()::get).filter(steps -> steps != null).toList();
        return counts.size() < enough ? OptionalDouble.empty() : counts.stream().mapToInt(Integer::intValue).average();
    }

    /**
     * T-4: the first planned day after the last session, once missed_sessions_in_a_row planned days have passed since it
     * with none done — planned by the training days in force then, today not passed yet, paused days not planned. The key
     * stays that first day for as long as the miss lasts. Never a session logged is no miss (U3, U7: not logging is not
     * failing to train).
     */
    private static Optional<LocalDate> firstMissed(Facts facts, Parameters parameters) {
        Optional<LocalDate> lastSession = facts.sessionDays().stream().max(Comparator.naturalOrder());
        if (lastSession.isEmpty()) {
            return Optional.empty();
        }
        LocalDate from = lastSession.get().plusDays(1);
        if (from.isBefore(facts.trainingDaysSince())) {
            from = facts.trainingDaysSince();
        }
        if (!from.isBefore(facts.today())) {
            return Optional.empty();
        }
        List<LocalDate> missed = from.datesUntil(facts.today())
                .filter(day -> facts.trainingDays().contains(day.getDayOfWeek()) && !facts.pausedDays().contains(day)).toList();
        return missed.size() < parameters.wholeNumber(ParameterKey.MISSED_SESSIONS_IN_A_ROW) ? Optional.empty() : Optional.of(missed.getFirst());
    }

    /**
     * T-5, on a cut only: there Güray calls lower loads normal and asks for sets and protein; building, the weekly engine
     * reads them as recovery to fix (G7 K-73), and a question saying "normal" would contradict its call. Two weeks with a
     * day paused or lightened on purpose explain the drop: nothing is asked.
     */
    private static boolean loadsDropped(Facts facts, LocalDate lastWeek) {
        if (!facts.loadsDroppedLastWeek() || !onACut(facts)) {
            return false;
        }
        return lastWeek.minusWeeks(1).datesUntil(lastWeek.plusWeeks(1))
                .noneMatch(day -> facts.pausedDays().contains(day) || facts.lighterDays().contains(day));
    }

    private static boolean onACut(Facts facts) {
        return facts.phase().filter(phase -> phase == Phase.CUT).isPresent();
    }

    private static Prompt prompt(RuleId rule, Source source, String key, String... choices) {
        return new Prompt(rule, source, key, new CopyKey("prompt." + rule.value()), List.of(choices));
    }
}
