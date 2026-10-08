package app.keel.training;

import app.keel.shared.AccountId;
import app.keel.shared.Decimals;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * The set log as the progress summaries read it (K-965): every working set of the account, imported sessions too — the
 * history is there to be seen (ADR-053), as the weight trend shows imported weigh-ins.
 */
@Repository
class ProgressReads {

    /** A working set with its workout and the program day it was of (none for a session off the program). */
    record Row(UUID workoutId, UUID programDayId, TrainingLog.WorkSet set) {
    }

    private final JdbcClient jdbc;

    ProgressReads(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Oldest first, each workout's sets in the order done. {@code load} is not read: the summaries compare the load as logged. */
    List<Row> workingSets(AccountId account) {
        return jdbc.sql("""
                select w.id as workout_id, w.program_day_id, w.started_at, s.exercise_id, s.load_kg, s.reps, s.rir, s.side
                from training.workout_set s
                join training.workout w on w.id = s.workout_id
                where s.account_id = :account and s.set_type = 'WORKING'
                order by w.started_at, w.id, s.seq""")
                .param("account", account.value())
                .query((row, n) -> new Row(row.getObject("workout_id", UUID.class), row.getObject("program_day_id", UUID.class),
                        new TrainingLog.WorkSet(row.getString("exercise_id"), row.getObject("started_at", OffsetDateTime.class).toInstant(), null,
                                Decimals.plain(row.getBigDecimal("load_kg")), row.getInt("reps"), row.getObject("rir", Integer.class),
                                row.getString("side") == null ? null : Side.valueOf(row.getString("side")))))
                .list();
    }
}
