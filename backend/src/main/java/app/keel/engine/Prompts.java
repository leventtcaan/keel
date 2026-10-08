package app.keel.engine;

import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;

/**
 * The coach's own questions between the weekly calls (K-512, ADR-039): the coaching triggers (G5 §2), asked in the app — never
 * pushed (ADR-036). Each carries its rule, its source and a key for the occurrence — the same for as long as it lasts —
 * so it is asked once. None changes a call (U1, U2: the weekly engine decides); none while a state is declared, and no
 * day the user or the ladder paused counts against anyone (ADR-038). In priority order: steps first, the coaching
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
    private static final Map<RuleId, List<String>> CHOICES = Map.of(STEPS_DROPPED, List.of("BUSY", "LESS"),
            SESSIONS_MISSED, List.of("FIXED_TIME", "LIFE", "NOT_NOW"), LOADS_DROPPED, List.of("OK"), HUNGER_FIRST_DAYS, List.of("HUNGRY", "NOT_HUNGRY"));
    private static final Map<RuleId, Set<String>> REPLIES = Map.of(STEPS_DROPPED, Set.of("LESS"),
            SESSIONS_MISSED, Set.of("NOT_NOW"), LOADS_DROPPED, Set.of("OK"), HUNGER_FIRST_DAYS, Set.of("HUNGRY", "NOT_HUNGRY"));

    /** One question: its rule and source (U14), the occurrence it is for, its words, its answers. */
    public record Prompt(RuleId rule, Source source, String key, CopyKey copyKey, List<String> choices) {
    }

    /**
     * What the questions read, on the user's calendar.
     *
     * @param phase the plan's direction; none before the first call
     * @param steps the step count of each day that has one
     * @param stepTarget the plan's step target on each day: a week is judged against the target it had (K-220 review)
     * @param plannedOn whether the plan has a session on a day: its training weekdays, a session moved that week on the day
     *     it was moved to (K-964)
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
            Predicate<LocalDate> plannedOn,
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
        LocalDate lastWeek = facts.today().with(TemporalAdjusters.previousOrSame(Consistency.WEEK_STARTS_ON)).minusWeeks(1);
        if (stepsDropped(facts, lastWeek, parameters)) {
            prompts.add(prompt(STEPS_DROPPED, STEPS, lastWeek.toString()));
        }
        firstMissed(facts, parameters).ifPresent(day -> prompts.add(prompt(SESSIONS_MISSED, SESSIONS, day.toString())));
        if (loadsDropped(facts, lastWeek)) {
            prompts.add(prompt(LOADS_DROPPED, LOADS, lastWeek.toString()));
        }
        facts.deficitBegan().filter(began -> onACut(facts) && !facts.today().isBefore(began)
                        && facts.today().isBefore(began.plusDays(parameters.wholeNumber(ParameterKey.HUNGER_QUESTION_DAYS))))
                .ifPresent(began -> prompts.add(prompt(HUNGER_FIRST_DAYS, HUNGER, began.toString())));
        return List.copyOf(prompts);
    }

    /**
     * T-13: the last calendar week under its step target after the week before was on its own — each against the target
     * of the days it counted (K-220 review: raising it would otherwise call the weeks before a miss); paused days not
     * counted; each week with enough days left (min_logged_days_per_week), or nothing is said.
     */
    private static boolean stepsDropped(Facts facts, LocalDate lastWeek, Parameters parameters) {
        int enough = parameters.wholeNumber(ParameterKey.MIN_LOGGED_DAYS_PER_WEEK);
        Optional<Boolean> lastUnder = under(facts, lastWeek, enough);
        Optional<Boolean> beforeUnder = under(facts, lastWeek.minusWeeks(1), enough);
        return lastUnder.orElse(false) && beforeUnder.map(under -> !under).orElse(false);
    }

    /**
     * Whether the week from {@code monday} averaged under the target of its counted days; none when fewer than
     * {@code enough} of its days not paused have a count.
     */
    private static Optional<Boolean> under(Facts facts, LocalDate monday, int enough) {
        List<LocalDate> counted = monday.datesUntil(monday.plusWeeks(1))
                .filter(day -> !facts.pausedDays().contains(day) && facts.steps().containsKey(day)).toList();
        if (counted.size() < enough) {
            return Optional.empty();
        }
        long steps = counted.stream().mapToLong(facts.steps()::get).sum();
        long target = counted.stream().mapToLong(day -> facts.stepTarget().apply(day)).sum();
        return Optional.of(steps < target);
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
                .filter(day -> facts.plannedOn().test(day) && !facts.pausedDays().contains(day)).toList();
        return missed.size() < parameters.wholeNumber(ParameterKey.MISSED_SESSIONS_IN_A_ROW) ? Optional.empty() : Optional.of(missed.getFirst());
    }

    /**
     * T-5, on a cut only: there coaching experience calls lower loads normal and asks for sets and protein; building, the weekly engine
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

    /** Each question's answers, as asked: an answer is one of these or none. */
    public static Optional<List<String>> choices(RuleId rule) {
        return Optional.ofNullable(CHOICES.get(rule));
    }

    /**
     * The words an answer gets back, if any: T-13's "fewer steps" and T-4's "not now" get the coaching point, T-5 its reassurance
     * (no "you are losing muscle"), T-2 either answer what hunger does in a cut's first days. The others take the user
     * somewhere (a state declared, the reminders) — the phone's part.
     */
    public static Optional<CopyKey> reply(RuleId rule, String choice) {
        return REPLIES.getOrDefault(rule, Set.of()).contains(choice)
                ? Optional.of(new CopyKey("prompt." + rule.value() + ".reply." + choice.toLowerCase(Locale.ROOT)))
                : Optional.empty();
    }

    private static Prompt prompt(RuleId rule, Source source, String key) {
        return new Prompt(rule, source, key, new CopyKey("prompt." + rule.value()), CHOICES.get(rule));
    }
}
