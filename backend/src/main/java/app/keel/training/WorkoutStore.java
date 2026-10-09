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
import java.util.Set;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The workout tables (K-210). The first write of a clientId wins; a repeat reads the stored record back (ADR-024). */
@Repository
class WorkoutStore {

    /**
     * {@code note}s are the user's own words (K-422): kept and handed back, never logged (V3). {@code uncleanExerciseIds}:
     * the finish's answer on form (G6 K-31), kept so a target derived again after an edit holds them as the finish did
     * (K-432). {@code importedFrom}: the app a session imported from another app's export came from (K-615); none for
     * a session logged in the app. {@code pausedSeconds}: how long it was paused, given at the finish (K-998).
     */
    record Workout(UUID id, UUID clientId, Instant startedAt, Instant endedAt, UUID programDayId, String note, List<String> uncleanExerciseIds,
            ImportSource importedFrom, int pausedSeconds) {
    }

    /** A set of an imported session as the file had it: no reps in reserve, side or note (K-615). */
    record ImportedSet(String exerciseId, SetType setType, BigDecimal loadKg, int reps) {
    }

    record LoggedSet(UUID id, UUID clientId, String exerciseId, SetType setType, BigDecimal loadKg, int reps, Integer rir, Side side,
            String note, UUID workoutId, UUID supersetId) {
    }

    record Stored<T>(T record, boolean created) {
    }

    /** A workout with the account it is of: what a read across accounts gives (SessionAutoClose). */
    record Owned(AccountId account, Workout workout) {
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

    /**
     * An imported session, finished, with its sets in the order given; false (nothing written) when its clientId is
     * already stored — a retry, or a clientId the app already used. Each set gets its own clientId: the file has none.
     */
    boolean importSession(AccountId account, UUID clientId, Instant startedAt, Instant endedAt, ImportSource source, List<ImportedSet> sets) {
        UUID id = UUID.randomUUID();
        int created = jdbc.sql("""
                insert into training.workout (id, account_id, client_id, started_at, ended_at, imported_from)
                values (:id, :account, :client, :start, :end, :source) on conflict (account_id, client_id) do nothing""")
                .param("id", id).param("account", account.value()).param("client", clientId)
                .param("start", startedAt.atOffset(ZoneOffset.UTC)).param("end", endedAt.atOffset(ZoneOffset.UTC)).param("source", source.name())
                .update();
        if (created == 0) {
            return false;
        }
        for (ImportedSet set : sets) {
            jdbc.sql("""
                    insert into training.workout_set (id, workout_id, account_id, client_id, exercise_id, set_type, load_kg, reps)
                    values (:id, :workout, :account, :client, :exercise, :type, :load, :reps)""")
                    .param("id", UUID.randomUUID()).param("workout", id).param("account", account.value()).param("client", UUID.randomUUID())
                    .param("exercise", set.exerciseId()).param("type", set.setType().name()).param("load", set.loadKg()).param("reps", set.reps())
                    .update();
        }
        return true;
    }

    Optional<Workout> find(AccountId account, UUID id) {
        return jdbc.sql("select * from training.workout where id = :id and account_id = :account")
                .param("id", id).param("account", account.value()).query((row, n) -> workout(row)).optional();
    }

    /**
     * The workout, held until the transaction ends (FOR SHARE), for a change of its sets. A close or a finish (an update
     * of the row) waits for the change, or the change waits for it and reads it: so the targets either side derives see
     * the set — a set's own insert locks the row only FOR KEY SHARE, which an update of a non-key column never waits for.
     */
    Optional<Workout> findForWrite(AccountId account, UUID id) {
        return jdbc.sql("select * from training.workout where id = :id and account_id = :account for share")
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

    /**
     * A finish without a note keeps the one given before (a replay, a corrected end time); one with a note replaces it.
     * The time paused likewise (K-998). The answer on form is the latest finish's.
     */
    void finish(AccountId account, UUID id, Instant endedAt, String note, Set<String> uncleanExerciseIds, Integer pausedSeconds) {
        jdbc.sql("""
                update training.workout set ended_at = :at, note = coalesce(:note, note), unclean_exercise_ids = :unclean,
                paused_seconds = coalesce(:paused, paused_seconds)
                where id = :id and account_id = :account""")
                .param("at", endedAt.atOffset(ZoneOffset.UTC)).param("note", note).param("unclean", uncleanExerciseIds.stream().sorted().toArray(String[]::new))
                .param("paused", pausedSeconds).param("id", id).param("account", account.value()).update();
    }

    /** Discards a workout with its sets (K-998, on delete cascade); false when there was none of the account's to discard. */
    boolean delete(AccountId account, UUID id) {
        return jdbc.sql("delete from training.workout where id = :id and account_id = :account")
                .param("id", id).param("account", account.value()).update() == 1;
    }

    /** Every set of the workout, before it is discarded: the targets it set are derived again from none (K-998). */
    void deleteSets(AccountId account, UUID workout) {
        jdbc.sql("delete from training.workout_set where workout_id = :workout and account_id = :account")
                .param("workout", workout).param("account", account.value()).update();
    }

    /**
     * Every session still open that started at or before {@code startedBy}, of every account, oldest first (ADR-075 #5).
     * An imported session is never open (importSession).
     */
    List<Owned> unfinishedStartedBy(Instant startedBy) {
        return jdbc.sql("select * from training.workout where ended_at is null and started_at <= :by order by started_at, id")
                .param("by", startedBy.atOffset(ZoneOffset.UTC))
                .query((row, n) -> new Owned(new AccountId(row.getObject("account_id", UUID.class)), workout(row))).list();
    }

    /** Ends a session still open; false, and nothing written, when it was finished meanwhile — that finish stays. */
    boolean closeIfOpen(AccountId account, UUID id, Instant endedAt) {
        return jdbc.sql("update training.workout set ended_at = :at where id = :id and account_id = :account and ended_at is null")
                .param("at", endedAt.atOffset(ZoneOffset.UTC)).param("id", id).param("account", account.value()).update() == 1;
    }

    Stored<LoggedSet> log(AccountId account, UUID workout, LoggedSet set) {
        int created = jdbc.sql("""
                insert into training.workout_set (id, workout_id, account_id, client_id, exercise_id, set_type, load_kg, reps, rir, side, note,
                superset_id)
                values (:id, :workout, :account, :client, :exercise, :type, :load, :reps, :rir, :side, :note, :superset)
                on conflict (account_id, client_id) do nothing""")
                .param("id", UUID.randomUUID()).param("workout", workout).param("account", account.value())
                .param("client", set.clientId()).param("exercise", set.exerciseId()).param("type", set.setType().name())
                .param("load", set.loadKg()).param("reps", set.reps()).param("rir", set.rir())
                .param("side", set.side() == null ? null : set.side().name()).param("note", set.note())
                .param("superset", set.supersetId()).update();
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
        String importedFrom = row.getString("imported_from");
        return new Workout(row.getObject("id", UUID.class), row.getObject("client_id", UUID.class),
                row.getObject("started_at", OffsetDateTime.class).toInstant(), ended == null ? null : ended.toInstant(),
                row.getObject("program_day_id", UUID.class), row.getString("note"), List.of((String[]) row.getArray("unclean_exercise_ids").getArray()),
                importedFrom == null ? null : ImportSource.valueOf(importedFrom), row.getInt("paused_seconds"));
    }

    private static LoggedSet loggedSet(ResultSet row) throws SQLException {
        String side = row.getString("side");
        return new LoggedSet(row.getObject("id", UUID.class), row.getObject("client_id", UUID.class), row.getString("exercise_id"),
                SetType.valueOf(row.getString("set_type")), Decimals.plain(row.getBigDecimal("load_kg")), row.getInt("reps"),
                row.getObject("rir", Integer.class), side == null ? null : Side.valueOf(side), row.getString("note"),
                row.getObject("workout_id", UUID.class), row.getObject("superset_id", UUID.class));
    }
}
