package app.keel.training;

import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The deload ladder's calls on the program, for decision to apply and undo (K-217; decision depends on training, not
 * back). Each is keyed by the call: applied twice it is one change. False when the account has no program to change.
 */
@Service
public class TrainingCalls {

    private final JdbcClient jdbc;
    private final ProgramStore programs;
    private final Profiles profiles;
    private final Clock clock;

    TrainingCalls(JdbcClient jdbc, ProgramStore programs, Profiles profiles, Clock clock) {
        this.jdbc = jdbc;
        this.programs = programs;
        this.profiles = profiles;
        this.clock = clock;
    }

    /** First rung: no load is added from {@code from} until the next rung. */
    @Transactional
    public boolean holdLoad(AccountId account, UUID callId, LocalDate from) {
        return add(account, new TrainingChanges.Change(callId, TrainingChanges.Kind.HOLD_LOAD, from, null, null));
    }

    /** Second rung: the sets × {@code setsFactor} from {@code from} to {@code until}; the hold ends. */
    @Transactional
    public boolean lighterWeek(AccountId account, UUID callId, BigDecimal setsFactor, LocalDate from, LocalDate until) {
        return nextRung(account, new TrainingChanges.Change(callId, TrainingChanges.Kind.LIGHTER_WEEK, from, until, setsFactor));
    }

    /** Last rung: no training from {@code from} to {@code until}; the hold ends. */
    @Transactional
    public boolean restWeek(AccountId account, UUID callId, LocalDate from, LocalDate until) {
        return nextRung(account, new TrainingChanges.Change(callId, TrainingChanges.Kind.REST_WEEK, from, until, null));
    }

    /** The call's change is gone, and a hold it ended is in force again: as if the call had never been applied. */
    @Transactional
    public void undo(AccountId account, UUID callId) {
        jdbc.sql("delete from training.program_change where account_id = :account and call_id = :call")
                .param("account", account.value()).param("call", callId).update();
        jdbc.sql("update training.program_change set ends_on = null, ended_by = null where account_id = :account and ended_by = :call")
                .param("account", account.value()).param("call", callId).update();
    }

    /**
     * The hold in force ends today, on the user's calendar, with no call to end it (K-428, ADR-037 #34): the calls it
     * came from are gone (the health data consent was withdrawn), and none would come to take the ladder's next rung.
     * The change stays as a record, closed the day before today (or before it began, as {@link TrainingChanges#holdClosedOn});
     * the lighter and rest weeks end on their own. Harmless twice.
     */
    @Transactional
    public void endHold(AccountId account) {
        LocalDate today = LocalDate.now(clock.withZone(profiles.of(account).map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC)));
        jdbc.sql("""
                update training.program_change set ends_on = greatest(:dayBefore, starts_on - 1)
                where account_id = :account and kind = 'HOLD_LOAD' and ends_on is null""")
                .param("account", account.value()).param("dayBefore", today.minusDays(1)).update();
    }

    /** Every change of the account, oldest first. */
    List<TrainingChanges.Change> changes(AccountId account) {
        return jdbc.sql("select * from training.program_change where account_id = :account order by starts_on, id")
                .param("account", account.value())
                .query((row, n) -> new TrainingChanges.Change(row.getObject("call_id", UUID.class),
                        TrainingChanges.Kind.valueOf(row.getString("kind")), row.getObject("starts_on", LocalDate.class),
                        row.getObject("ends_on", LocalDate.class), row.getBigDecimal("sets_factor")))
                .list();
    }

    private boolean nextRung(AccountId account, TrainingChanges.Change change) {
        if (!add(account, change)) {
            return false;
        }
        // TrainingChanges.holdClosedOn in SQL: every open hold, a hold begun that day or later closed before it began.
        // The rung is recorded, so undoing it opens the hold again.
        jdbc.sql("""
                update training.program_change set ends_on = greatest(:dayBefore, starts_on - 1), ended_by = :call
                where account_id = :account and kind = 'HOLD_LOAD' and ends_on is null""")
                .param("account", account.value()).param("dayBefore", change.startsOn().minusDays(1)).param("call", change.callId()).update();
        return true;
    }

    private boolean add(AccountId account, TrainingChanges.Change change) {
        if (programs.current(account).isEmpty()) {
            return false;
        }
        jdbc.sql("""
                insert into training.program_change (id, account_id, call_id, kind, starts_on, ends_on, sets_factor)
                values (:id, :account, :call, :kind, :starts, :ends, :factor) on conflict (account_id, call_id) do nothing""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("call", change.callId())
                .param("kind", change.kind().name()).param("starts", change.startsOn()).param("ends", change.endsOn())
                .param("factor", change.setsFactor()).update();
        return true;
    }
}
