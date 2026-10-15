package app.keel.training;

import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * What the user answered on coming back from a gap (K-1020, ADR-077 #5 and Ek 8): one answer per account, the newest, kept
 * with the last log the gap began from. Training keeps it because PICK_UP changes what the program shows after a break
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

        /** Whether the answer keeps the break measured from this session from being eased: PICK_UP, until a session is done after it. */
        boolean picksUpFrom(LocalDate lastSession) {
            return choice == Choice.PICK_UP && coversGapFrom(lastSession);
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
    public Optional<LocalDate> breakFrom(AccountId account, Optional<LocalDate> lastSession) {
        return breakFrom(lastSession, lastSession.isPresent() ? of(account) : Optional.empty());
    }

    static Optional<LocalDate> breakFrom(Optional<LocalDate> lastSession, Optional<Answer> answer) {
        return lastSession.filter(day -> answer.filter(given -> given.picksUpFrom(day)).isEmpty());
    }
}
