package app.keel.measurement;

import app.keel.shared.AccountId;
import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * The measurement tables (K-206). Records the phone made are written with {@code on conflict (account_id, client_id) do
 * nothing} and read back by clientId: the first write wins, a repeat gets the stored record (ADR-024).
 */
@Repository
class MeasurementStore {

    enum Source { MANUAL, APPLE_HEALTH, IMPORT }

    enum Look { BETTER, SAME, WORSE }

    record WeighIn(UUID id, UUID clientId, Instant measuredAt, BigDecimal kg, Source source) {
    }

    record Waist(UUID id, UUID clientId, LocalDate measuredOn, BigDecimal cm) {
    }

    record PhotoCheck(UUID id, UUID clientId, LocalDate takenOn, Look look) {
    }

    record ActivityDay(LocalDate day, Integer steps, Integer sleepMinutes, Integer activeEnergyKcal) {
    }

    /** A stored record and whether this call created it. */
    record Stored<T>(T record, boolean created) {
    }

    private final JdbcClient jdbc;

    MeasurementStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    Stored<WeighIn> add(AccountId account, UUID clientId, Instant measuredAt, BigDecimal kg, Source source) {
        int created = jdbc.sql("""
                insert into measurement.weigh_in (id, account_id, client_id, measured_at, kg, source)
                values (:id, :account, :client, :at, :kg, :source) on conflict (account_id, client_id) do nothing""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("client", clientId)
                .param("at", measuredAt.atOffset(ZoneOffset.UTC)).param("kg", kg).param("source", source.name()).update();
        return new Stored<>(jdbc.sql("select * from measurement.weigh_in where account_id = :account and client_id = :client")
                .param("account", account.value()).param("client", clientId).query((row, n) -> weighIn(row)).single(), created == 1);
    }

    /** Weigh-ins in [from, to), oldest first. */
    List<WeighIn> weighIns(AccountId account, Instant from, Instant to) {
        return jdbc.sql("""
                select * from measurement.weigh_in where account_id = :account and measured_at >= :from and measured_at < :to
                order by measured_at, id""")
                .param("account", account.value()).param("from", from.atOffset(ZoneOffset.UTC)).param("to", to.atOffset(ZoneOffset.UTC))
                .query((row, n) -> weighIn(row)).list();
    }

    /** The latest weigh-in's weight, whenever it was. */
    Optional<BigDecimal> latestKg(AccountId account) {
        return jdbc.sql("select kg from measurement.weigh_in where account_id = :account order by measured_at desc, id desc limit 1")
                .param("account", account.value()).query(BigDecimal.class).optional();
    }

    /** Every weigh-in of the account, oldest first (the export: whatever date it was stored with, K-214). */
    List<WeighIn> weighIns(AccountId account) {
        return jdbc.sql("select * from measurement.weigh_in where account_id = :account order by measured_at, id")
                .param("account", account.value()).query((row, n) -> weighIn(row)).list();
    }

    boolean deleteWeighIn(AccountId account, UUID id) {
        return jdbc.sql("delete from measurement.weigh_in where id = :id and account_id = :account")
                .param("id", id).param("account", account.value()).update() == 1;
    }

    Stored<Waist> add(AccountId account, UUID clientId, LocalDate measuredOn, BigDecimal cm) {
        int created = jdbc.sql("""
                insert into measurement.waist (id, account_id, client_id, measured_on, cm)
                values (:id, :account, :client, :on, :cm) on conflict (account_id, client_id) do nothing""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("client", clientId)
                .param("on", measuredOn).param("cm", cm).update();
        return new Stored<>(jdbc.sql("select * from measurement.waist where account_id = :account and client_id = :client")
                .param("account", account.value()).param("client", clientId).query((row, n) -> waist(row)).single(), created == 1);
    }

    List<Waist> waists(AccountId account, LocalDate from, LocalDate to) {
        return jdbc.sql("""
                select * from measurement.waist where account_id = :account and measured_on between :from and :to
                order by measured_on, id""")
                .param("account", account.value()).param("from", from).param("to", to).query((row, n) -> waist(row)).list();
    }

    /** Every waist measurement of the account (the export). */
    List<Waist> waists(AccountId account) {
        return jdbc.sql("select * from measurement.waist where account_id = :account order by measured_on, id")
                .param("account", account.value()).query((row, n) -> waist(row)).list();
    }

    Stored<PhotoCheck> add(AccountId account, UUID clientId, LocalDate takenOn, Look look) {
        int created = jdbc.sql("""
                insert into measurement.photo_check (id, account_id, client_id, taken_on, look)
                values (:id, :account, :client, :on, :look) on conflict (account_id, client_id) do nothing""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("client", clientId)
                .param("on", takenOn).param("look", look.name()).update();
        return new Stored<>(jdbc.sql("select * from measurement.photo_check where account_id = :account and client_id = :client")
                .param("account", account.value()).param("client", clientId)
                .query((row, n) -> new PhotoCheck(uuid(row, "id"), uuid(row, "client_id"), row.getObject("taken_on", LocalDate.class),
                        Look.valueOf(row.getString("look")))).single(), created == 1);
    }

    List<PhotoCheck> photoChecks(AccountId account) {
        return jdbc.sql("select * from measurement.photo_check where account_id = :account order by taken_on, id")
                .param("account", account.value())
                .query((row, n) -> new PhotoCheck(uuid(row, "id"), uuid(row, "client_id"), row.getObject("taken_on", LocalDate.class),
                        Look.valueOf(row.getString("look")))).list();
    }

    List<ActivityDay> activityDays(AccountId account) {
        return jdbc.sql("select * from measurement.activity_day where account_id = :account order by day")
                .param("account", account.value())
                .query((row, n) -> new ActivityDay(row.getObject("day", LocalDate.class), row.getObject("steps", Integer.class),
                        row.getObject("sleep_minutes", Integer.class), row.getObject("active_energy_kcal", Integer.class))).list();
    }

    /** The day's values replace what was stored for it (Apple Health resends a day as it fills up). */
    void put(AccountId account, ActivityDay day) {
        jdbc.sql("""
                insert into measurement.activity_day (account_id, day, steps, sleep_minutes, active_energy_kcal)
                values (:account, :day, :steps, :sleep, :energy)
                on conflict (account_id, day) do update set steps = excluded.steps, sleep_minutes = excluded.sleep_minutes,
                    active_energy_kcal = excluded.active_energy_kcal""")
                .param("account", account.value()).param("day", day.day()).param("steps", day.steps())
                .param("sleep", day.sleepMinutes()).param("energy", day.activeEnergyKcal()).update();
    }

    Optional<ActivityDay> activityDay(AccountId account, LocalDate day) {
        return jdbc.sql("select * from measurement.activity_day where account_id = :account and day = :day")
                .param("account", account.value()).param("day", day)
                .query((row, n) -> new ActivityDay(row.getObject("day", LocalDate.class), row.getObject("steps", Integer.class),
                        row.getObject("sleep_minutes", Integer.class), row.getObject("active_energy_kcal", Integer.class)))
                .optional();
    }

    private static WeighIn weighIn(ResultSet row) throws SQLException {
        return new WeighIn(uuid(row, "id"), uuid(row, "client_id"), row.getObject("measured_at", OffsetDateTime.class).toInstant(),
                Decimals.plain(row.getBigDecimal("kg")), Source.valueOf(row.getString("source")));
    }

    private static Waist waist(ResultSet row) throws SQLException {
        return new Waist(uuid(row, "id"), uuid(row, "client_id"), row.getObject("measured_on", LocalDate.class),
                Decimals.plain(row.getBigDecimal("cm")));
    }

    private static UUID uuid(ResultSet row, String column) throws SQLException {
        return row.getObject(column, UUID.class);
    }
}
