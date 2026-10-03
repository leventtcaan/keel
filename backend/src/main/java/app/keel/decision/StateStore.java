package app.keel.decision;

import app.keel.engine.DeclaredContext;
import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * The states the user declared (K-516, ADR-038), on their calendar: at most one open at a time; the ones that ended stay,
 * so a past week knows it was paused. Health data (sickness, pain): deleted with the consent and the account.
 */
@Repository
class StateStore {

    /** {@code endsOn} empty: until the user is back. {@code stillSoOn}: the day the user last said it still is (K-525). */
    record State(DeclaredContext kind, LocalDate startsOn, Optional<LocalDate> endsOn, Optional<LocalDate> stillSoOn) {

        boolean inForceOn(LocalDate day) {
            return !day.isBefore(startsOn) && endsOn.map(last -> !day.isAfter(last)).orElse(true);
        }
    }

    private final JdbcClient jdbc;

    StateStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The state in force today, if any. */
    Optional<State> current(AccountId account, LocalDate today) {
        return all(account).stream().filter(state -> state.inForceOn(today)).reduce((older, newer) -> newer);
    }

    /**
     * From today: a state open or running past today ends yesterday — or, begun today, gives way whole (a choice changed
     * the same day is not a day of each).
     */
    @Transactional
    State declare(AccountId account, DeclaredContext kind, LocalDate today, Optional<LocalDate> until, Instant now) {
        end(account, today);
        jdbc.sql("""
                insert into decision.declared_state (id, account_id, kind, starts_on, ends_on, created_at)
                values (:id, :account, :kind, :starts, :ends, :now)""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("kind", kind.name()).param("starts", today)
                .param("ends", until.orElse(null)).param("now", now.atOffset(ZoneOffset.UTC)).update();
        return new State(kind, today, until, Optional.empty());
    }

    /** "Still so" (STATE_STILL YES, K-525): kept on the state in force today, the day it was said. Harmless with none. */
    void stillSo(AccountId account, LocalDate today) {
        jdbc.sql("""
                update decision.declared_state set still_so_on = :today
                where account_id = :account and starts_on <= :today and (ends_on is null or ends_on >= :today)""")
                .param("account", account.value()).param("today", today).update();
    }

    /** "I'm back": what is in force today or later ends yesterday; begun today, it is taken back. Harmless with none. */
    @Transactional
    void end(AccountId account, LocalDate today) {
        // One change of the account's states at a time (a double tap, two devices): a declaration waits for the one
        // before it and takes over, so at most one stays open.
        jdbc.sql("select 1 from pg_advisory_xact_lock(:key)").param("key", lockKey(account)).query(Integer.class).single();
        jdbc.sql("delete from decision.declared_state where account_id = :account and starts_on >= :today")
                .param("account", account.value()).param("today", today).update();
        jdbc.sql("""
                update decision.declared_state set ends_on = :yesterday
                where account_id = :account and (ends_on is null or ends_on >= :today)""")
                .param("account", account.value()).param("today", today).param("yesterday", today.minusDays(1)).update();
    }

    /** The days from {@code from} to {@code to} (both included) a state was in force on. */
    Set<LocalDate> days(AccountId account, LocalDate from, LocalDate to) {
        Set<LocalDate> days = new HashSet<>();
        for (State state : all(account)) {
            LocalDate first = state.startsOn().isBefore(from) ? from : state.startsOn();
            LocalDate last = state.endsOn().filter(end -> end.isBefore(to)).orElse(to);
            // A state over before the range, or begun after it (a time zone moved west), has no day in it.
            if (!first.isAfter(last)) {
                first.datesUntil(last.plusDays(1)).forEach(days::add);
            }
        }
        return days;
    }

    /** Every day up to {@code to} a state was in force on. */
    Set<LocalDate> daysUpTo(AccountId account, LocalDate to) {
        return all(account).stream().map(State::startsOn).min(LocalDate::compareTo).map(first -> days(account, first, to)).orElse(Set.of());
    }

    /** The state of the latest day from {@code from} to {@code to} a state was in force on, if any. */
    Optional<DeclaredContext> latest(AccountId account, LocalDate from, LocalDate to) {
        return all(account).stream().filter(state -> !state.startsOn().isAfter(to) && state.endsOn().map(end -> !end.isBefore(from)).orElse(true))
                .reduce((older, newer) -> newer).map(State::kind);
    }

    /** Every state, oldest first (the export; the weeks it paused). */
    List<State> all(AccountId account) {
        return jdbc.sql("""
                        select kind, starts_on, ends_on, still_so_on from decision.declared_state where account_id = :account
                        order by starts_on, created_at""")
                .param("account", account.value())
                .query((row, n) -> new State(DeclaredContext.valueOf(row.getString("kind")), row.getObject("starts_on", LocalDate.class),
                        Optional.ofNullable(row.getObject("ends_on", LocalDate.class)), Optional.ofNullable(row.getObject("still_so_on", LocalDate.class))))
                .list();
    }

    private static long lockKey(AccountId account) {
        return account.value().getMostSignificantBits() ^ account.value().getLeastSignificantBits();
    }
}
