package app.keel.engine;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * The first eight weeks (K-513, ADR-040; 04 §7.5, I1 F2): the user's own week since the account began, its content —
 * the first week silent, I1 F2's "no comment, no score"; a version without lifting for someone who does not train — and
 * the risk. G2 K-63 makes weeks five to eight the critical window, so the risk reads the user's week just over while it is
 * one of those: in weeks six to nine, the ninth open for that alone. Any signal is a risk; none is weighed against
 * another, as no source gives weights (U14). A week paused by a declared state signals nothing (ADR-038). Its use: the
 * week's question budget widens and the phone says one human word (K-521); no call changes (U1).
 */
public final class FirstWeeks {

    static final RuleId NO_SESSION_LAST_WEEK = new RuleId("no_session_last_week");
    static final RuleId FORGIVEN_WEEK_USED = new RuleId("forgiven_week_used");
    static final RuleId LOGGING_DROPPED = new RuleId("logging_dropped");
    private static final Source SIGNALS = new Source("arastirma/ham/I1-onboarding-aliskanlik.md#F2", SourceTag.LITERATURE);
    private static final int DAYS_PER_WEEK = 7;

    /** The user's own seven days: sessions done (a set past the warm-ups, K-431), days with food logged, a state declared. */
    public record UserWeek(int sessions, int loggedDays, boolean paused) {
    }

    /**
     * What the week reads, on the user's calendar.
     *
     * @param began the day the account began: day one of week one
     * @param trainingPlanned the program asks for training at all
     * @param lastWeek the user's week just over: the seven days before {@link #weekStart}
     * @param loggedDaysWeekBefore days with food logged in the user's week before that
     * @param calendarWeeks consistency's weeks, oldest first and consecutive, through at least the one that ended inside
     *     {@code lastWeek} (any later is not read); none, or beginning after it, when there was no record then
     */
    public record Facts(LocalDate today, LocalDate began, boolean trainingPlanned, UserWeek lastWeek, int loggedDaysWeekBefore,
            List<WeekTally> calendarWeeks) {

        public Facts {
            Objects.requireNonNull(lastWeek, "lastWeek");
            calendarWeeks = List.copyOf(calendarWeeks);
        }
    }

    /** The week: its number (1 to first_weeks + 1), its content (none in the first and the last), the risk's signals. */
    public record Week(int number, Optional<CopyKey> content, List<Reason> risk) {
    }

    private FirstWeeks() {
    }

    /** The first day of the user's week that {@code today} is in: the weekday the account began on. */
    public static LocalDate weekStart(LocalDate began, LocalDate today) {
        return began.plusWeeks(Math.floorDiv(ChronoUnit.DAYS.between(began, today), DAYS_PER_WEEK));
    }

    /** Whether {@code today} has a week of the flow: from the account's first day through the week after the last. */
    public static boolean open(LocalDate began, LocalDate today, Parameters parameters) {
        long days = ChronoUnit.DAYS.between(began, today);
        return days >= 0 && days / DAYS_PER_WEEK + 1 <= parameters.wholeNumber(ParameterKey.FIRST_WEEKS) + 1;
    }

    /** This week of the flow; empty before the account's first day and once the week after the flow is over. */
    public static Optional<Week> of(Facts facts, Parameters parameters) {
        if (!open(facts.began(), facts.today(), parameters)) {
            return Optional.empty();
        }
        int number = (int) (ChronoUnit.DAYS.between(facts.began(), facts.today()) / DAYS_PER_WEEK) + 1;
        int weekJustOver = number - 1;
        List<Reason> risk = weekJustOver >= parameters.wholeNumber(ParameterKey.FIRST_WEEKS_RISK_FROM) ? signals(facts, parameters) : List.of();
        return Optional.of(new Week(number, content(number, parameters.wholeNumber(ParameterKey.FIRST_WEEKS), facts.trainingPlanned()), risk));
    }

    private static Optional<CopyKey> content(int number, int flow, boolean trainingPlanned) {
        if (number == 1 || number > flow) {
            return Optional.empty();
        }
        // Weeks two, four and six speak of lifting and muscle (I1 F2); someone not training reads their own version.
        return Optional.of(new CopyKey((trainingPlanned ? "first_weeks.week" : "first_weeks.no_training.week") + number));
    }

    private static List<Reason> signals(Facts facts, Parameters parameters) {
        UserWeek last = facts.lastWeek();
        if (last.paused()) {
            return List.of();
        }
        List<Reason> signals = new ArrayList<>();
        if (facts.trainingPlanned() && last.sessions() == 0) {
            signals.add(new Reason(NO_SESSION_LAST_WEEK, SIGNALS));
        }
        if (forgivenInside(facts, parameters)) {
            signals.add(new Reason(FORGIVEN_WEEK_USED, SIGNALS));
        }
        // A drop under a week's worth of logging (H1 §3.4's min_logged_days_per_week), not a new threshold of its own.
        int enough = parameters.wholeNumber(ParameterKey.MIN_LOGGED_DAYS_PER_WEEK);
        if (last.loggedDays() < enough && facts.loggedDaysWeekBefore() >= enough) {
            signals.add(new Reason(LOGGING_DROPPED, SIGNALS));
        }
        return List.copyOf(signals);
    }

    /**
     * Consistency forgives calendar weeks, Monday to Sunday: the number the user sees. The user's seven days hold exactly
     * one Sunday, so exactly one calendar week ends inside them — that one is read, and none after it.
     */
    private static boolean forgivenInside(Facts facts, Parameters parameters) {
        LocalDate lastDay = weekStart(facts.began(), facts.today()).minusDays(1);
        DayOfWeek lastOfACalendarWeek = Consistency.WEEK_STARTS_ON.minus(1);
        LocalDate monday = lastDay.with(TemporalAdjusters.previousOrSame(lastOfACalendarWeek)).minusDays(DAYS_PER_WEEK - 1);
        List<WeekTally> weeks = facts.calendarWeeks();
        if (!weeks.isEmpty() && weeks.getLast().weekStart().isBefore(monday)) {
            // A caller's slip, not a quiet week: left unsaid, the signal would be off for everyone.
            throw new IllegalArgumentException("Consistency's weeks end at " + weeks.getLast().weekStart() + ", before the week of " + monday);
        }
        List<WeekTally> through = weeks.stream().filter(week -> !week.weekStart().isAfter(monday)).toList();
        return !through.isEmpty() && through.getLast().weekStart().equals(monday)
                && Consistency.lastWeekForgiven(through, parameters);
    }
}
