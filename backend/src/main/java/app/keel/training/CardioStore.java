package app.keel.training;

import app.keel.engine.CardioPlacement;
import app.keel.engine.CardioPrescription;
import app.keel.engine.CardioSession;
import app.keel.shared.AccountId;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * The cardio tables (K-959, ADR-074): the user's own cardio, one per account apart from the program (#4), and the cardio
 * sessions done (#6), written with {@code on conflict (account_id, client_id) do nothing} and read back by clientId: the
 * first write wins, a repeat gets the stored session (ADR-024).
 */
@Repository
class CardioStore {

    /** Typed in the app, or read from an Apple Health workout. */
    enum Source { MANUAL, APPLE_HEALTH }

    /** A cardio session done; {@code activeEnergyKcal} only as an Apple Watch measured it (ADR-074 #5). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Logged(UUID id, UUID clientId, LocalDate day, int minutes, Source source, Integer activeEnergyKcal) {
    }

    record Stored(Logged session, boolean created) {
    }

    private final JdbcClient jdbc;

    CardioStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The user's own cardio, if they set one; no sessions is cardio turned off. */
    Optional<CardioPrescription> userPlan(AccountId account) {
        Optional<Integer> minutes = jdbc.sql("select minutes from training.cardio_plan where account_id = :account")
                .param("account", account.value()).query(Integer.class).optional();
        return minutes.map(length -> CardioPrescription.user(length, jdbc.sql("select weekday, place from training.cardio_plan_session where account_id = :account")
                .param("account", account.value())
                .query((row, n) -> new CardioSession(DayOfWeek.valueOf(row.getString("weekday")), CardioPlacement.valueOf(row.getString("place"))))
                .list()));
    }

    /** Replaces the user's own cardio, whole; the row upserted first, so two at once replace in turn. */
    @Transactional
    void setUserPlan(AccountId account, CardioPrescription plan) {
        jdbc.sql("""
                insert into training.cardio_plan (account_id, minutes) values (:account, :minutes)
                on conflict (account_id) do update set minutes = excluded.minutes""")
                .param("account", account.value()).param("minutes", plan.minutes()).update();
        jdbc.sql("delete from training.cardio_plan_session where account_id = :account").param("account", account.value()).update();
        for (CardioSession session : plan.sessions()) {
            jdbc.sql("insert into training.cardio_plan_session (account_id, weekday, place) values (:account, :weekday, :place)")
                    .param("account", account.value()).param("weekday", session.day().name()).param("place", session.placement().name()).update();
        }
    }

    /** The user's own cardio removed (its sessions go with it, on delete cascade): the default again. Harmless twice. */
    void removeUserPlan(AccountId account) {
        jdbc.sql("delete from training.cardio_plan where account_id = :account").param("account", account.value()).update();
    }

    Stored log(AccountId account, UUID clientId, LocalDate day, int minutes, Source source, Integer activeEnergyKcal) {
        int created = jdbc.sql("""
                insert into training.cardio_session (id, account_id, client_id, day, minutes, source, active_energy_kcal)
                values (:id, :account, :client, :day, :minutes, :source, :energy) on conflict (account_id, client_id) do nothing""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("client", clientId).param("day", day)
                .param("minutes", minutes).param("source", source.name()).param("energy", activeEnergyKcal).update();
        return new Stored(jdbc.sql("select * from training.cardio_session where account_id = :account and client_id = :client")
                .param("account", account.value()).param("client", clientId).query((row, n) -> logged(row)).single(), created == 1);
    }

    /** The days in [from, until) with a cardio session: two on one day are that day's session (a typed one and the watch's). */
    int daysWithCardio(AccountId account, LocalDate from, LocalDate until) {
        return jdbc.sql("select count(distinct day) from training.cardio_session where account_id = :account and day >= :from and day < :until")
                .param("account", account.value()).param("from", from).param("until", until).query(Integer.class).single();
    }

    /** Every cardio session of the account, oldest first. */
    List<Logged> all(AccountId account) {
        return jdbc.sql("select * from training.cardio_session where account_id = :account order by day, id").param("account", account.value())
                .query((row, n) -> logged(row)).list();
    }

    /** The health data consent withdrawn (K-231): the energy goes, the sessions stay as training data (ADR-007). */
    void clearActiveEnergy(AccountId account) {
        jdbc.sql("update training.cardio_session set active_energy_kcal = null where account_id = :account").param("account", account.value()).update();
    }

    private static Logged logged(ResultSet row) throws SQLException {
        return new Logged(row.getObject("id", UUID.class), row.getObject("client_id", UUID.class), row.getObject("day", LocalDate.class),
                row.getInt("minutes"), Source.valueOf(row.getString("source")), row.getObject("active_energy_kcal", Integer.class));
    }
}
