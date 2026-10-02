package app.keel.engine;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalDouble;
import java.util.Set;

/**
 * The coach's own questions between the weekly calls (K-512, ADR-039): Güray's triggers (G5 §2), asked in the app — never
 * pushed (ADR-036). Each carries its rule, its source and a key for the occurrence, so it is asked once. None changes a
 * call (U1, U2: the weekly engine decides); none in a week the user declared (ADR-038). In priority order: steps first,
 * Güray's "highest-priority metabolic warning".
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
     * @param trainingDaysSince the day the program began asking for these training days
     * @param sessionDays the days a session was done (a set past the warm-ups, K-431)
     * @param pausedDays the days nothing was asked: a state declared (ADR-038), a week off the ladder gave
     * @param lighterDays the days the ladder lowered the work on purpose (a lighter week)
     * @param loadsDroppedLastWeek the calendar week just over lifted less than the one before (G7 K-73's reading)
     * @param deficitBegan the first day of this cut's deficit: its first target under maintenance — not the watch at the
     *     maintenance estimate (K-114) that comes before it
     * @param declaredNow a state is in force today
     */
    public record Facts(LocalDate today, Optional<Phase> phase, Map<LocalDate, Integer> steps, int stepTarget, List<DayOfWeek> trainingDays,
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
        String week = facts.today().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString();
        if (stepsDropped(facts, parameters)) {
            prompts.add(prompt(STEPS_DROPPED, STEPS, week, "BUSY", "LESS"));
        }
        firstMissed(facts, parameters).ifPresent(day -> prompts.add(prompt(SESSIONS_MISSED, SESSIONS, day.toString(), "FIXED_TIME", "LIFE", "NOT_NOW")));
        if (facts.loadsDroppedLastWeek()) {
            prompts.add(prompt(LOADS_DROPPED, LOADS, week, "OK"));
        }
        facts.deficitBegan().filter(began -> !facts.today().isBefore(began)
                        && facts.today().isBefore(began.plusDays(parameters.wholeNumber(ParameterKey.HUNGER_QUESTION_DAYS))))
                .ifPresent(began -> prompts.add(prompt(HUNGER_FIRST_DAYS, HUNGER, began.toString(), "HUNGRY", "NOT_HUNGRY")));
        return List.copyOf(prompts);
    }

    /**
     * T-13: the last seven full days' average under the target after the seven before were on it — each week with enough
     * days counted (min_logged_days_per_week), or nothing is said.
     */
    private static boolean stepsDropped(Facts facts, Parameters parameters) {
        int enough = parameters.wholeNumber(ParameterKey.MIN_LOGGED_DAYS_PER_WEEK);
        OptionalDouble last = average(facts, 1, enough);
        OptionalDouble before = average(facts, 1 + DAYS_PER_WEEK, enough);
        return last.isPresent() && before.isPresent() && last.getAsDouble() < facts.stepTarget() && before.getAsDouble() >= facts.stepTarget();
    }

    /** The average of the seven days ending {@code daysBack} days before today, if at least {@code enough} have a count. */
    private static OptionalDouble average(Facts facts, int daysBack, int enough) {
        List<Integer> counts = new ArrayList<>();
        for (int day = 0; day < DAYS_PER_WEEK; day++) {
            Integer steps = facts.steps().get(facts.today().minusDays(daysBack + day));
            if (steps != null) {
                counts.add(steps);
            }
        }
        return counts.size() < enough ? OptionalDouble.empty() : counts.stream().mapToInt(Integer::intValue).average();
    }

    /**
     * T-4: the first of the last missed_sessions_in_a_row planned days before today, if no session was done from it on.
     * Never a session logged at all is no miss (U3, U7: not logging is not failing to train).
     */
    private static Optional<LocalDate> firstMissed(Facts facts, Parameters parameters) {
        int inARow = parameters.wholeNumber(ParameterKey.MISSED_SESSIONS_IN_A_ROW);
        if (facts.sessionDays().isEmpty() || facts.trainingDays().isEmpty()) {
            return Optional.empty();
        }
        // A program trains at least once a week: that many weeks back hold that many planned days.
        List<LocalDate> planned = facts.today().minusWeeks(inARow).datesUntil(facts.today())
                .filter(day -> facts.trainingDays().contains(day.getDayOfWeek())).toList();
        if (planned.size() < inARow) {
            return Optional.empty();
        }
        LocalDate first = planned.get(planned.size() - inARow);
        return facts.sessionDays().stream().anyMatch(day -> !day.isBefore(first)) ? Optional.empty() : Optional.of(first);
    }

    private static Prompt prompt(RuleId rule, Source source, String key, String... choices) {
        return new Prompt(rule, source, key, new CopyKey("prompt." + rule.value()), List.of(choices));
    }
}
