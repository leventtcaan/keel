package app.keel.engine;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * The first eight weeks (K-513, ADR-040; 04 §7.5, I1 F2): the user's own week since the account began, its content —
 * the first week silent, I1 F2's "no comment, no score" — and from first_weeks_risk_from (G2 K-63: weeks five to eight
 * are the critical window) the risk: the signals of the calendar week just over, each said on its own. Any one is a
 * risk; none is weighed against another, as no source gives weights (U14). A week paused by a declared state signals
 * nothing (ADR-038). Its use: the week's question budget widens and the phone says one human word (K-521); no call
 * changes (U1).
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

    public record Facts(LocalDate today, LocalDate began, boolean trainingPlanned, UserWeek lastWeek, int loggedDaysWeekBefore,
            List<WeekTally> calendarWeeks) {
    }

    /** The week: its number (1 to first_weeks), its content (none in the first), the risk's signals (none: no risk). */
    public record Week(int number, Optional<CopyKey> content, List<Reason> risk) {
    }

    private FirstWeeks() {
    }

    /** This week of the flow; empty before the account's first day and once the flow is over. */
    public static Optional<Week> of(Facts facts, Parameters parameters) {
        long days = ChronoUnit.DAYS.between(facts.began(), facts.today());
        int number = (int) (days / DAYS_PER_WEEK) + 1;
        if (days < 0 || number > parameters.wholeNumber(ParameterKey.FIRST_WEEKS)) {
            return Optional.empty();
        }
        Optional<CopyKey> content = number == 1 ? Optional.empty() : Optional.of(new CopyKey("first_weeks.week" + number));
        List<Reason> risk = number >= parameters.wholeNumber(ParameterKey.FIRST_WEEKS_RISK_FROM) ? signals(facts, parameters) : List.of();
        return Optional.of(new Week(number, content, risk));
    }

    public static LocalDate weekStart(LocalDate began, LocalDate today) {
        return began.plusWeeks(ChronoUnit.DAYS.between(began, today) / DAYS_PER_WEEK);
    }

    private static List<Reason> signals(Facts facts, Parameters parameters) {
        if (facts.lastWeek().paused()) {
            return List.of();
        }
        List<Reason> signals = new ArrayList<>();
        if (facts.trainingPlanned() && facts.lastWeek().sessions() == 0) {
            signals.add(new Reason(NO_SESSION_LAST_WEEK, SIGNALS));
        }
        if (Consistency.lastWeekForgiven(facts.calendarWeeks(), parameters)) {
            signals.add(new Reason(FORGIVEN_WEEK_USED, SIGNALS));
        }
        // A drop under a week's worth of logging (H1 §3.4's min_logged_days_per_week), not a new threshold of its own.
        int enough = parameters.wholeNumber(ParameterKey.MIN_LOGGED_DAYS_PER_WEEK);
        if (facts.lastWeek().loggedDays() < enough && facts.loggedDaysWeekBefore() >= enough) {
            signals.add(new Reason(LOGGING_DROPPED, SIGNALS));
        }
        return List.copyOf(signals);
    }
}
