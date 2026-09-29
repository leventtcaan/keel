package app.keel.training;

import app.keel.shared.AccountId;
import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The workout tables (K-210). The first write of a clientId wins; a repeat reads the stored record back (ADR-024). */
@Repository
class WorkoutStore {

    enum SetType { WARM_UP, WORKING, DROP, FAILURE }

    enum Side { BOTH, LEFT, RIGHT }

    record Workout(UUID id, UUID clientId, Instant startedAt, Instant endedAt, UUID programDayId) {
    }

    record LoggedSet(UUID id, UUID clientId, String exerciseId, SetType setType, BigDecimal loadKg, int reps, Integer rir, Side side,
            UUID workoutId) {
    }

    record Stored<T>(T record, boolean created) {
    }

    private final JdbcClient jdbc;

    WorkoutStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    Stored<Workout> start(AccountId account, UUID clientId, Instant startedAt, UUID programDayId) {
        int created = jdbc.sql("""
                insert into training.workout (id, account_id, client_id, started_at, program_day_id)
                values (:id, :account, :client, :at, :day) on conflict (account_id, client_id) do nothing""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("client", clientId)
                .param("at", startedAt.atOffset(ZoneOffset.UTC)).param("day", programDayId).update();
        return new Stored<>(jdbc.sql("select * from training.workout where account_id = :account and client_id = :client")
                .param("account", account.value()).param("client", clientId).query((row, n) -> workout(row)).single(), created == 1);
    }

    Optional<Workout> find(AccountId account, UUID id) {
        return jdbc.sql("select * from training.workout where id = :id and account_id = :account")
                .param("id", id).param("account", account.value()).query((row, n) -> workout(row)).optional();
    }

    List<Workout> between(AccountId account, Instant from, Instant to) {
        return jdbc.sql("""
                select * from training.workout where account_id = :account and started_at >= :from and started_at < :to
                order by started_at, id""")
                .param("account", account.value()).param("from", from.atOffset(ZoneOffset.UTC)).param("to", to.atOffset(ZoneOffset.UTC))
                .query((row, n) -> workout(row)).list();
    }

    /** Every workout of the account (the export: whatever date it was stored with, K-214). */
    List<Workout> all(AccountId account) {
        return jdbc.sql("select * from training.workout where account_id = :account order by started_at, id")
                .param("account", account.value()).query((row, n) -> workout(row)).list();
    }

    void finish(AccountId account, UUID id, Instant endedAt) {
        jdbc.sql("update training.workout set ended_at = :at where id = :id and account_id = :account")
                .param("at", endedAt.atOffset(ZoneOffset.UTC)).param("id", id).param("account", account.value()).update();
    }

    Stored<LoggedSet> log(AccountId account, UUID workout, LoggedSet set) {
        int created = jdbc.sql("""
                insert into training.workout_set (id, workout_id, account_id, client_id, exercise_id, set_type, load_kg, reps, rir, side)
                values (:id, :workout, :account, :client, :exercise, :type, :load, :reps, :rir, :side)
                on conflict (account_id, client_id) do nothing""")
                .param("id", UUID.randomUUID()).param("workout", workout).param("account", account.value())
                .param("client", set.clientId()).param("exercise", set.exerciseId()).param("type", set.setType().name())
                .param("load", set.loadKg()).param("reps", set.reps()).param("rir", set.rir())
                .param("side", set.side() == null ? null : set.side().name()).update();
        return new Stored<>(jdbc.sql("select * from training.workout_set where account_id = :account and client_id = :client")
                .param("account", account.value()).param("client", set.clientId()).query((row, n) -> loggedSet(row)).single(),
                created == 1);
    }

    List<LoggedSet> sets(UUID workout) {
        return jdbc.sql("select * from training.workout_set where workout_id = :workout order by seq")
                .param("workout", workout).query((row, n) -> loggedSet(row)).list();
    }

    boolean deleteSet(AccountId account, UUID workout, UUID set) {
        return jdbc.sql("delete from training.workout_set where id = :set and workout_id = :workout and account_id = :account")
                .param("set", set).param("workout", workout).param("account", account.value()).update() == 1;
    }

    private static Workout workout(ResultSet row) throws SQLException {
        OffsetDateTime ended = row.getObject("ended_at", OffsetDateTime.class);
        return new Workout(row.getObject("id", UUID.class), row.getObject("client_id", UUID.class),
                row.getObject("started_at", OffsetDateTime.class).toInstant(), ended == null ? null : ended.toInstant(),
                row.getObject("program_day_id", UUID.class));
    }

    private static LoggedSet loggedSet(ResultSet row) throws SQLException {
        String side = row.getString("side");
        return new LoggedSet(row.getObject("id", UUID.class), row.getObject("client_id", UUID.class), row.getString("exercise_id"),
                SetType.valueOf(row.getString("set_type")), Decimals.plain(row.getBigDecimal("load_kg")), row.getInt("reps"),
                row.getObject("rir", Integer.class), side == null ? null : Side.valueOf(side), row.getObject("workout_id", UUID.class));
    }
}
