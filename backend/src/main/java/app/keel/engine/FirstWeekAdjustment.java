package app.keel.engine;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * The first week's one adjustment (K-962, ADR-077 #4, plan/yeni-yuz-kurallar.md R4): the call that closes the first week
 * reads no weight and no calories (U8: DataSufficiency still holds them); it reads the sessions planned (P) and done (Y)
 * and, where it can change the call, how the week felt.
 *
 * <ul>
 *   <li>Y/P under on_track_min_ratio: the missed sessions move to days that fit, the number of days stays (03 §2.9:
 *       adherence before a new plan; G2 K-60's line).</li>
 *   <li>Every planned session done, "I could do more", not starting out, and fewer days than training_days_ideal_min:
 *       one more day (G6 K-36: 4-5 ideal, three enough for a beginner). Without the experience answer it is not added:
 *       the rule is only for someone known not to be starting out (ADR-072 #3).</li>
 *   <li>Otherwise the same plan; "too much" is said back in its own words.</li>
 * </ul>
 *
 * <p>The feel answer is read only where its question is asked ({@link #feelCounts}).
 *
 * <p>The engine never proposes fewer days than training_days_min, nor fewer than the user has (G6 K-36, G7 K-79, ADR-071
 * #8): an added day lands on that floor at least; the other two calls keep the user's own count, two days included.
 */
public final class FirstWeekAdjustment {

    static final RuleId FIRST_WEEK_ON_TRACK = new RuleId("first_week_on_track");
    static final RuleId FIRST_WEEK_ADD_DAY = new RuleId("first_week_add_day");
    static final RuleId FIRST_WEEK_MOVE_MISSED = new RuleId("first_week_move_missed");

    private static final Source ON_TRACK = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-60", SourceTag.EXPERIENCE);
    private static final Source DAYS = new Source("arastirma/ham/guray/G6-eski-arsiv.md#K-36", SourceTag.EXPERIENCE);
    private static final Source ADHERENCE_FIRST = new Source("arastirma/03-guray-karar-omurgasi.md#2.9", SourceTag.EXPERIENCE);

    private static final int DAYS_PER_WEEK = 7;

    /**
     * The first week on the user's calendar: from the account's first day to the day before its first check-in day.
     *
     * @param planned the sessions the plan asked in it (P)
     * @param done the days with a session in it (Y), a day off's session included
     * @param trainingDays the plan's training days a week
     * @param missed the planned weekdays without a session, in the week's order
     * @param experience how long the user has trained; empty when not asked
     */
    public record Week(int planned, int done, int trainingDays, List<DayOfWeek> missed, Optional<Experience> experience) {

        public Week {
            missed = List.copyOf(missed);
            Objects.requireNonNull(experience, "experience");
            if (planned < 0 || done < 0 || trainingDays < 0) {
                throw new IllegalArgumentException("A week's counts are not negative: " + planned + ", " + done + ", " + trainingDays);
            }
            if (missed.size() > planned || new HashSet<>(missed).size() != missed.size()) {
                throw new IllegalArgumentException("The missed days are planned days, each once: " + missed + " of " + planned);
            }
            if (done + missed.size() < planned) {
                throw new IllegalArgumentException("A planned day is done or missed: " + done + " done and " + missed + " of " + planned);
            }
        }
    }

    private FirstWeekAdjustment() {
    }

    /** The call that closes the first week; empty when the week planned no session (nothing to adjust, U3). */
    public static Optional<Decision> decide(Week week, CheckIn.Week1Feel feel, LocalDate today, Parameters parameters) {
        if (week.planned() == 0) {
            return Optional.empty();
        }
        if (!onTrack(week, parameters)) {
            return Optional.of(call(new Action.MoveMissedSessions(week.missed()), FIRST_WEEK_MOVE_MISSED, ADHERENCE_FIRST,
                    "decision.move_missed_sessions.first_week_move_missed", today));
        }
        // The answer is read only where the question is asked: anywhere else it changes nothing, words included.
        CheckIn.Week1Feel read = feelCounts(week, parameters) ? feel : CheckIn.Week1Feel.UNKNOWN;
        if (read == CheckIn.Week1Feel.COULD_DO_MORE) {
            int ideal = parameters.wholeNumber(ParameterKey.TRAINING_DAYS_IDEAL_MIN);
            int toDays = Math.max(week.trainingDays() + 1, parameters.wholeNumber(ParameterKey.TRAINING_DAYS_MIN));
            return Optional.of(call(new Action.AddTrainingDay(toDays, ideal), FIRST_WEEK_ADD_DAY, DAYS, "decision.add_training_day.first_week_add_day",
                    today));
        }
        // "Too much" is said back in its own words; the plan stays all the same (U7: nothing to make up, nothing taken away).
        String words = read == CheckIn.Week1Feel.TOO_MUCH ? "decision.continue.first_week_too_much" : "decision.continue.first_week_on_track";
        return Optional.of(call(new Action.Continue(), FIRST_WEEK_ON_TRACK, ON_TRACK, words, today));
    }

    /**
     * Whether "How did week 1 feel?" can change the call (U9, ADR-077 #2): every planned session done, someone known not to
     * be starting out, fewer days than the ideal. Anywhere else its answer changes nothing and it is not asked.
     */
    public static boolean feelCounts(Week week, Parameters parameters) {
        return week.planned() > 0 && week.done() >= week.planned()
                && week.experience().filter(experience -> experience != Experience.NEW).isPresent()
                && week.trainingDays() < parameters.wholeNumber(ParameterKey.TRAINING_DAYS_IDEAL_MIN);
    }

    // Y/P at or over the line; a session on a day off counts, so done may be over planned.
    private static boolean onTrack(Week week, Parameters parameters) {
        BigDecimal line = BigDecimal.valueOf(parameters.number(ParameterKey.ON_TRACK_MIN_RATIO));
        return BigDecimal.valueOf(week.done()).compareTo(line.multiply(BigDecimal.valueOf(week.planned()))) >= 0;
    }

    // One week of sessions, counted, not estimated: more than a guess, less than a window of weeks (MEDIUM).
    private static Decision call(Action action, RuleId rule, Source source, String words, LocalDate today) {
        return new Decision(action, List.of(new Reason(rule, source)), Confidence.MEDIUM, today.plusDays(DAYS_PER_WEEK), new CopyKey(words));
    }
}
