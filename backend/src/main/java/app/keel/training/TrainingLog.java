package app.keel.training;

import app.keel.shared.AccountId;
import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Training's log for the other modules (K-218): the working sets of a move — the only sets that count toward effort
 * and the estimated one-rep max (L3 P6). decision (K-212) reads it and adds the bodyweight from measurement. A session
 * imported from another app's export is never read here: imported history is seen, not decided on (K-615, ADR-053).
 */
@Service
public class TrainingLog {

    /** One working set, with the workout's start and how its move is loaded. */
    public record WorkSet(String exerciseId, Instant at, ExerciseCatalog.Load load, BigDecimal loadKg, int reps, Integer rir, Side side) {

        /**
         * The load the muscles moved: the bar's for an external load; bodyweight plus the added load for a bodyweight
         * move — nothing when the bodyweight is not known, rather than a load that leaves the body out.
         */
        public Optional<BigDecimal> effectiveLoadKg(Optional<BigDecimal> bodyWeightKg) {
            return load == ExerciseCatalog.Load.EXTERNAL ? Optional.of(loadKg) : bodyWeightKg.map(body -> body.add(loadKg));
        }
    }

    private final JdbcClient jdbc;
    private final ExerciseCatalog catalog;

    TrainingLog(JdbcClient jdbc, ExerciseCatalog catalog) {
        this.jdbc = jdbc;
        this.catalog = catalog;
    }

    /**
     * When each workout started in [from, to), oldest first: the sessions done that consistency counts (K-220). A
     * session done has a working set (K-431, ADR-037 #39) — in the glossary's sense, any set that is not a warm-up
     * (docs/sozluk.md): a set to failure or a drop set is one. A workout opened and left, or only warmed up in, is not.
     */
    public List<Instant> workoutStarts(AccountId account, Instant from, Instant to) {
        return jdbc.sql("""
                select w.started_at from training.workout w
                where w.account_id = :account and w.imported_from is null and w.started_at >= :from and w.started_at < :to
                  and exists (select 1 from training.workout_set s where s.workout_id = w.id and s.set_type <> 'WARM_UP')
                order by w.started_at""")
                .param("account", account.value()).param("from", from.atOffset(ZoneOffset.UTC)).param("to", to.atOffset(ZoneOffset.UTC))
                .query((row, n) -> row.getObject("started_at", OffsetDateTime.class).toInstant()).list();
    }

    /**
     * When the last session done (a working set, K-431) started before {@code before}: in any workout, of a program day or
     * not — the training log a break is measured from (K-531, ADR-043 #75).
     */
    public Optional<Instant> lastSessionBefore(AccountId account, Instant before) {
        return jdbc.sql("""
                select max(w.started_at) as last from training.workout w
                where w.account_id = :account and w.imported_from is null and w.started_at < :before
                  and exists (select 1 from training.workout_set s where s.workout_id = w.id and s.set_type <> 'WARM_UP')""")
                .param("account", account.value()).param("before", before.atOffset(ZoneOffset.UTC))
                .query((row, n) -> Optional.ofNullable(row.getObject("last", OffsetDateTime.class)).map(OffsetDateTime::toInstant)).single();
    }

    /**
     * Each move's working sets in its last session started before {@code before} (K-960: "Beat last time"), by move, in
     * the order they were done. A move outside the catalog (the user's own) is left out: in a program it has no table (ADR-035 Ek 1). One scan of
     * the account's working sets, the last start per move a window over it (read on every program view, K-960 review).
     */
    Map<String, List<WorkSet>> lastSessions(AccountId account, Instant before) {
        return jdbc.sql("""
                select d.exercise_id, d.started_at, d.load_kg, d.reps, d.rir, d.side from (
                    select s.exercise_id, w.started_at, s.load_kg, s.reps, s.rir, s.side, s.seq,
                           max(w.started_at) over (partition by s.exercise_id) as last_started
                    from training.workout_set s
                    join training.workout w on w.id = s.workout_id
                    where s.account_id = :account and s.set_type = 'WORKING' and w.imported_from is null and w.started_at < :before) d
                where d.started_at = d.last_started
                order by d.exercise_id, d.seq""")
                .param("account", account.value()).param("before", before.atOffset(ZoneOffset.UTC))
                .query((row, n) -> new WorkSet(row.getString("exercise_id"), row.getObject("started_at", OffsetDateTime.class).toInstant(), null,
                        Decimals.plain(row.getBigDecimal("load_kg")), row.getInt("reps"), row.getObject("rir", Integer.class),
                        row.getString("side") == null ? null : Side.valueOf(row.getString("side"))))
                .list().stream()
                .flatMap(set -> catalog.find(set.exerciseId())
                        .map(exercise -> new WorkSet(set.exerciseId(), set.at(), exercise.load(), set.loadKg(), set.reps(), set.rir(), set.side())).stream())
                .collect(Collectors.groupingBy(WorkSet::exerciseId, LinkedHashMap::new, Collectors.toList()));
    }

    /** The working sets of a move in workouts started in [from, to), in the order they were done. */
    public List<WorkSet> workingSets(AccountId account, String exerciseId, Instant from, Instant to) {
        ExerciseCatalog.Load load = catalog.find(exerciseId).orElseThrow(() -> new IllegalArgumentException("Not in the catalog: " + exerciseId))
                .load();
        return jdbc.sql("""
                select w.started_at, s.load_kg, s.reps, s.rir, s.side from training.workout_set s
                join training.workout w on w.id = s.workout_id
                where s.account_id = :account and s.exercise_id = :exercise and s.set_type = 'WORKING' and w.imported_from is null
                  and w.started_at >= :from and w.started_at < :to
                order by w.started_at, s.seq""")
                .param("account", account.value()).param("exercise", exerciseId)
                .param("from", from.atOffset(ZoneOffset.UTC)).param("to", to.atOffset(ZoneOffset.UTC))
                .query((row, n) -> new WorkSet(exerciseId, row.getObject("started_at", OffsetDateTime.class).toInstant(), load,
                        Decimals.plain(row.getBigDecimal("load_kg")), row.getInt("reps"), row.getObject("rir", Integer.class),
                        row.getString("side") == null ? null : Side.valueOf(row.getString("side"))))
                .list();
    }
}
