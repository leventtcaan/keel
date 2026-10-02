package app.keel.decision;

import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
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

    /** The five states (L3 §4.2). */
    enum Kind { TRAVELING, SICK, PAIN, BUSY, NEW_GYM }

    /** {@code endsOn} empty: until the user is back. */
    record State(Kind kind, LocalDate startsOn, Optional<LocalDate> endsOn) {

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
    State declare(AccountId account, Kind kind, LocalDate today, Optional<LocalDate> until, Instant now) {
        end(account, today);
        jdbc.sql("""
                insert into decision.declared_state (id, account_id, kind, starts_on, ends_on, created_at)
                values (:id, :account, :kind, :starts, :ends, :now)""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("kind", kind.name()).param("starts", today)
                .param("ends", until.orElse(null)).param("now", now.atOffset(ZoneOffset.UTC)).update();
        return new State(kind, today, until);
    }

    /** "I'm back": what is in force today or later ends yesterday; begun today, it is taken back. Harmless with none. */
    @Transactional
    void end(AccountId account, LocalDate today) {
        jdbc.sql("delete from decision.declared_state where account_id = :account and starts_on >= :today")
                .param("account", account.value()).param("today", today).update();
        jdbc.sql("""
                update decision.declared_state set ends_on = :yesterday
                where account_id = :account and (ends_on is null or ends_on >= :today)""")
                .param("account", account.value()).param("today", today).param("yesterday", today.minusDays(1)).update();
    }

    /** Every state, oldest first (the export; the weeks it paused). */
    List<State> all(AccountId account) {
        return jdbc.sql("select kind, starts_on, ends_on from decision.declared_state where account_id = :account order by starts_on, created_at")
                .param("account", account.value())
                .query((row, n) -> new State(Kind.valueOf(row.getString("kind")), row.getObject("starts_on", LocalDate.class),
                        Optional.ofNullable(row.getObject("ends_on", LocalDate.class))))
                .list();
    }
}
