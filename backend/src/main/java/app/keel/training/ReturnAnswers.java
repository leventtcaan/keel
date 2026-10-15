package app.keel.training;

import app.keel.engine.Parameters;
import app.keel.engine.ReturnLoad;
import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * What the user answered on coming back from a gap (K-1020, ADR-077 #5 and Ek 8): one answer per account, the newest, kept
 * with the last log the gap began from. Training keeps it because PICK_UP and EASE_BACK change what the program shows after a break
 * (training cannot read decision, whose route takes the answer).
 */
@Repository
public class ReturnAnswers {

    /** What the user picked on coming back (contract ReturnChoice). */
    public enum Choice {
        EASE_BACK, PICK_UP, REBUILD
    }

    /** {@code gapFrom}: the user's day of the last log when the answer was given: the gap it was given for. */
    public record Answer(Choice choice, LocalDate gapFrom, Instant answeredAt) {

        /** Whether a gap beginning from this last log is the one answered: no newer log has begun another. */
        public boolean coversGapFrom(LocalDate lastLog) {
            return !lastLog.isAfter(gapFrom);
        }

        /** The user's day the answer was given. */
        public LocalDate answeredOn(ZoneId zone) {
            return answeredAt.atZone(zone).toLocalDate();
        }

        /**
         * Whether the answer keeps the break measured from this session from being eased: PICK_UP, for the first session back
         * only. It falls when a session was done after the gap, and when return_step_back_after_weeks pass after the answer
         * with no session (ReturnLoad's own weeks: no new number), so a pick up given once is not kept for good.
         */
        boolean picksUpFrom(LocalDate lastSession, LocalDate today, ZoneId zone, Parameters parameters) {
            return choice == Choice.PICK_UP && coversGapFrom(lastSession) && !ReturnLoad.afterBreak(answeredOn(zone), today, parameters);
        }

        /**
         * Whether the answer makes the break measured from this session eased whatever its length (K-1026): EASE_BACK, for the
         * first session back only, on the same terms as a pick up: it falls when a session was done after the gap, and after
         * return_step_back_after_weeks with no session (then a break that long is eased by itself, ReturnLoad). The one step
         * ReturnLoad gives, never a second.
         */
        boolean easesBackFrom(LocalDate lastSession, LocalDate today, ZoneId zone, Parameters parameters) {
            return choice == Choice.EASE_BACK && coversGapFrom(lastSession) && !ReturnLoad.afterBreak(answeredOn(zone), today, parameters);
        }
    }

    private final JdbcClient jdbc;

    ReturnAnswers(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The account's newest answer, if it ever gave one. */
    public Optional<Answer> of(AccountId account) {
        return jdbc.sql("select choice, gap_from, answered_at from training.return_answer where account_id = :account")
                .param("account", account.value())
                .query((row, n) -> new Answer(Choice.valueOf(row.getString("choice")), row.getObject("gap_from", LocalDate.class),
                        row.getObject("answered_at", OffsetDateTime.class).toInstant()))
                .optional();
    }

    /** Kept as the account's answer, in place of the one before it: the same gap answered again changes its mind. */
    public void save(AccountId account, Choice choice, LocalDate gapFrom, Instant at) {
        jdbc.sql("""
                insert into training.return_answer (account_id, choice, gap_from, answered_at) values (:account, :choice, :gapFrom, :at)
                on conflict (account_id) do update set choice = excluded.choice, gap_from = excluded.gap_from, answered_at = excluded.answered_at""")
                .param("account", account.value()).param("choice", choice.name()).param("gapFrom", gapFrom)
                .param("at", at.atOffset(ZoneOffset.UTC)).update();
    }

    /**
     * The day of the last session a break is measured from (K-531), unless the user picked up from it: then none, so the
     * program shows its targets as they were. Read before any program or call that shows a target after a break.
     */
    public Optional<LocalDate> breakFrom(AccountId account, Optional<LocalDate> lastSession, LocalDate today, ZoneId zone, Parameters parameters) {
        return breakFrom(lastSession, lastSession.isPresent() ? of(account) : Optional.empty(), today, zone, parameters);
    }

    /**
     * Whether the user chose to ease back in for the session they come back to (K-1026): the break is stepped back whatever its
     * length, the one step ReturnLoad gives. Given the day {@link #breakFrom} returned.
     */
    public boolean easedBack(AccountId account, Optional<LocalDate> breakFrom, LocalDate today, ZoneId zone, Parameters parameters) {
        return easedBack(breakFrom, breakFrom.isPresent() ? of(account) : Optional.empty(), today, zone, parameters);
    }

    static boolean easedBack(Optional<LocalDate> breakFrom, Optional<Answer> answer, LocalDate today, ZoneId zone, Parameters parameters) {
        return breakFrom.filter(day -> answer.filter(given -> given.easesBackFrom(day, today, zone, parameters)).isPresent()).isPresent();
    }

    static Optional<LocalDate> breakFrom(Optional<LocalDate> lastSession, Optional<Answer> answer, LocalDate today, ZoneId zone, Parameters parameters) {
        return lastSession.filter(day -> answer.filter(given -> given.picksUpFrom(day, today, zone, parameters)).isEmpty());
    }
}
