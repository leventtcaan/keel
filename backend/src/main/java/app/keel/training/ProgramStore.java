package app.keel.training;

import app.keel.shared.AccountId;
import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** The program tables (K-211): one current program per account, replaced whole. */
@Repository
class ProgramStore {

    enum Source { GENERATED, OWN }

    /**
     * {@code nextLoadKg} and {@code nextReps}: the next session's target, once a workout of the day set it (K-217), with
     * {@code lastLoadKg} the load it came from; {@code id} the stored row (null before it is stored).
     */
    record PlannedExercise(String exerciseId, int sets, int repMin, int repMax, int targetRir, BigDecimal nextLoadKg, Integer nextReps,
            BigDecimal lastLoadKg, UUID id, Instant nextFrom, boolean nextRackEnds) {

        /** As planned, before any workout. */
        PlannedExercise(String exerciseId, int sets, int repMin, int repMax, int targetRir) {
            this(exerciseId, sets, repMin, repMax, targetRir, null, null, null, null, null, false);
        }

        PlannedExercise withSets(int newSets) {
            return new PlannedExercise(exerciseId, newSets, repMin, repMax, targetRir, nextLoadKg, nextReps, lastLoadKg, id, nextFrom, nextRackEnds);
        }

        /** Another rep range: the target was for the old one, so it goes (the next session finds the load again). */
        PlannedExercise withReps(int min, int max) {
            return new PlannedExercise(exerciseId, sets, min, max, targetRir, null, null, null, id, null, false);
        }

        /** This move as planned, in {@code row} with that row's target. */
        PlannedExercise inRowOf(PlannedExercise row) {
            return new PlannedExercise(exerciseId, sets, repMin, repMax, targetRir, row.nextLoadKg, row.nextReps, row.lastLoadKg, row.id, row.nextFrom,
                    row.nextRackEnds);
        }
    }

    /** One day: {@code nameKey} for a generated day, {@code name} for the user's own. */
    record Day(UUID id, String nameKey, String name, DayOfWeek weekday, List<PlannedExercise> exercises) {
    }

    record Program(UUID id, Source source, List<Day> days) {
    }

    private final JdbcClient jdbc;
    private final Clock clock;

    ProgramStore(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /**
     * Replaces the account's program with this one, whole, in one transaction; returns it as stored. The program row is
     * upserted first: its lock makes a second replace sent at the same moment wait and then replace in turn, where
     * delete-then-insert on the unique account would fail one of them (K-211 review).
     */
    @Transactional
    Program replace(AccountId account, Source source, List<Day> days) {
        UUID program = jdbc.sql("""
                insert into training.program (id, account_id, source, created_at) values (:id, :account, :source, :now)
                on conflict (account_id) do update set source = excluded.source, created_at = excluded.created_at
                returning id""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("source", source.name())
                .param("now", clock.instant().atOffset(ZoneOffset.UTC)).query(UUID.class).single();
        jdbc.sql("delete from training.program_day where program_id = :program").param("program", program).update();
        // The review's changes were made to the program replaced: none can be undone onto this one (K-956).
        jdbc.sql("delete from training.program_review_change where account_id = :account").param("account", account.value()).update();
        // So were the week's changes to its sessions (K-964): this program's days are new.
        jdbc.sql("delete from training.session_change where account_id = :account").param("account", account.value()).update();
        // What this program asks a week, from now (K-535): the weeks before keep the program they had. Always after the
        // last row: two replaces at once each read the clock before the lock, and the one stored last must be in force —
        // strictly after, so the order never falls to a tie.
        jdbc.sql("""
                insert into training.program_history (id, account_id, sessions_per_week, effective_from)
                values (:id, :account, :sessions, greatest((select created_at from training.program where id = :program),
                        (select max(effective_from) + interval '1 microsecond' from training.program_history where account_id = :account)))""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("sessions", days.size()).param("program", program)
                .update();
        insert(account, program, days);
        return current(account).orElseThrow();
    }

    /**
     * The account's program, its row locked until the transaction ends: the review's applies and undos take turns, each
     * reading the program the one before left (K-956).
     */
    Optional<Program> locked(AccountId account) {
        return jdbc.sql("select id from training.program where account_id = :account for update").param("account", account.value())
                .query(UUID.class).optional().flatMap(program -> current(account));
    }

    /**
     * The account's program with these days in place of its own, each day and move keeping the row (id) and target it
     * carries, a new row where it has none (K-956). Its source and when it was made stay: an edited program is the same
     * program (ADR-073 #4). Another number of days asks another number of sessions a week from now (K-535).
     */
    @Transactional
    Program rewrite(AccountId account, List<Day> days) {
        UUID program = jdbc.sql("select id from training.program where account_id = :account for update").param("account", account.value())
                .query(UUID.class).single();
        int before = jdbc.sql("select count(*) from training.program_day where program_id = :program").param("program", program)
                .query(Integer.class).single();
        jdbc.sql("delete from training.program_day where program_id = :program").param("program", program).update();
        if (before != days.size()) {
            jdbc.sql("""
                    insert into training.program_history (id, account_id, sessions_per_week, effective_from)
                    values (:id, :account, :sessions, greatest(cast(:now as timestamp with time zone),
                            (select max(effective_from) + interval '1 microsecond' from training.program_history where account_id = :account)))""")
                    .param("id", UUID.randomUUID()).param("account", account.value()).param("sessions", days.size())
                    .param("now", clock.instant().atOffset(ZoneOffset.UTC)).update();
        }
        insert(account, program, days);
        return current(account).orElseThrow();
    }

    /** The days and their moves, in order; a day or move without an id gets a new one, a move's target is stored with it. */
    private void insert(AccountId account, UUID program, List<Day> days) {
        for (int d = 0; d < days.size(); d++) {
            Day day = days.get(d);
            UUID dayId = day.id() == null ? UUID.randomUUID() : day.id();
            jdbc.sql("""
                    insert into training.program_day (id, program_id, account_id, seq, name_key, name, weekday)
                    values (:id, :program, :account, :seq, :key, :name, :weekday)""")
                    .param("id", dayId).param("program", program).param("account", account.value()).param("seq", d)
                    .param("key", day.nameKey()).param("name", day.name())
                    .param("weekday", day.weekday() == null ? null : day.weekday().name()).update();
            for (int e = 0; e < day.exercises().size(); e++) {
                PlannedExercise planned = day.exercises().get(e);
                jdbc.sql("""
                        insert into training.planned_exercise (id, day_id, account_id, seq, exercise_id, sets, rep_min, rep_max, target_rir,
                            next_load_kg, next_reps, last_load_kg, next_from, next_rack_ends)
                        values (:id, :day, :account, :seq, :exercise, :sets, :min, :max, :rir, :load, :reps, :last, :from, :rackEnds)""")
                        .param("id", planned.id() == null ? UUID.randomUUID() : planned.id()).param("day", dayId).param("account", account.value())
                        .param("seq", e).param("exercise", planned.exerciseId()).param("sets", planned.sets()).param("min", planned.repMin())
                        .param("max", planned.repMax()).param("rir", planned.targetRir()).param("load", planned.nextLoadKg())
                        .param("reps", planned.nextReps()).param("last", planned.lastLoadKg())
                        .param("from", planned.nextFrom() == null ? null : planned.nextFrom().atOffset(ZoneOffset.UTC))
                        .param("rackEnds", planned.nextRackEnds()).update();
            }
        }
    }

    /** A starting weight kept for its planned move (K-998), for the export. */
    record StartingWeight(UUID plannedExerciseId, String exerciseId, BigDecimal loadKg, int reps) {
    }

    /** The starting weights kept with the program's moves (the export, K-214). */
    List<StartingWeight> startingWeights(AccountId account) {
        return jdbc.sql("""
                select id, exercise_id, start_load_kg, start_reps from training.planned_exercise
                where account_id = :account and start_load_kg is not null order by id""")
                .param("account", account.value())
                .query((row, n) -> new StartingWeight(row.getObject("id", UUID.class), row.getString("exercise_id"), plain(row.getBigDecimal("start_load_kg")),
                        row.getInt("start_reps")))
                .list();
    }

    /** When the account's program was made (or last replaced). */
    Optional<Instant> createdAt(AccountId account) {
        return jdbc.sql("select created_at from training.program where account_id = :account").param("account", account.value())
                .query((row, n) -> row.getObject("created_at", OffsetDateTime.class).toInstant()).optional();
    }

    /** Every program the account has had, oldest first (K-535). */
    List<ProgramPeriod> history(AccountId account) {
        return jdbc.sql("select effective_from, sessions_per_week from training.program_history where account_id = :account order by effective_from, id")
                .param("account", account.value())
                .query((row, n) -> new ProgramPeriod(row.getObject("effective_from", OffsetDateTime.class).toInstant(), row.getInt("sessions_per_week")))
                .list();
    }

    /**
     * The account's program in three flat reads (program, its days, their moves), each finished before the next: a read
     * nested inside another's row mapper would hold one connection per level (K-211 review).
     */
    Optional<Program> current(AccountId account) {
        Optional<Program> head = jdbc.sql("select id, source from training.program where account_id = :account")
                .param("account", account.value())
                .query((row, n) -> new Program(row.getObject("id", UUID.class), Source.valueOf(row.getString("source")), List.of()))
                .optional();
        if (head.isEmpty()) {
            return head;
        }
        UUID program = head.get().id();
        record Row(UUID day, PlannedExercise exercise) {
        }
        Map<UUID, List<PlannedExercise>> exercises = jdbc.sql("""
                select e.id, e.day_id, e.exercise_id, e.sets, e.rep_min, e.rep_max, e.target_rir, e.next_load_kg, e.next_reps, e.last_load_kg,
                       e.next_from, e.next_rack_ends
                from training.planned_exercise e
                join training.program_day d on d.id = e.day_id where d.program_id = :program order by e.day_id, e.seq""")
                .param("program", program)
                .query((row, n) -> new Row(row.getObject("day_id", UUID.class), new PlannedExercise(row.getString("exercise_id"),
                        row.getInt("sets"), row.getInt("rep_min"), row.getInt("rep_max"), row.getInt("target_rir"),
                        plain(row.getBigDecimal("next_load_kg")), row.getObject("next_reps", Integer.class), plain(row.getBigDecimal("last_load_kg")),
                        row.getObject("id", UUID.class), Optional.ofNullable(row.getObject("next_from", OffsetDateTime.class))
                                .map(OffsetDateTime::toInstant).orElse(null), row.getBoolean("next_rack_ends"))))
                .list().stream()
                .collect(Collectors.groupingBy(Row::day, LinkedHashMap::new, Collectors.mapping(Row::exercise, Collectors.toList())));
        List<Day> days = jdbc.sql("select id, name_key, name, weekday from training.program_day where program_id = :program order by seq")
                .param("program", program)
                .query((row, n) -> new Day(row.getObject("id", UUID.class), row.getString("name_key"), row.getString("name"),
                        row.getString("weekday") == null ? null : DayOfWeek.valueOf(row.getString("weekday")), List.of()))
                .list().stream()
                .map(day -> new Day(day.id(), day.nameKey(), day.name(), day.weekday(), List.copyOf(exercises.getOrDefault(day.id(), List.of()))))
                .toList();
        return Optional.of(new Program(program, head.get().source(), days));
    }

    /**
     * The next session's target for a planned exercise (K-217) — {@code rackEnds} when its reps stopped at the ceiling
     * (K-534) — unless a later workout already set one: a workout
     * finished late, or a finish sent again after a newer one, does not roll the target back (K-217 review).
     */
    void setNext(AccountId account, UUID plannedId, BigDecimal loadKg, int reps, boolean rackEnds, BigDecimal lastLoadKg, Instant from) {
        jdbc.sql("""
                update training.planned_exercise set next_load_kg = :load, next_reps = :reps, next_rack_ends = :rackEnds, last_load_kg = :last,
                    next_from = :from
                where account_id = :account and id = :id and (next_from is null or next_from <= :from)""")
                .param("account", account.value()).param("id", plannedId).param("load", loadKg).param("reps", reps).param("rackEnds", rackEnds)
                .param("last", lastLoadKg)
                .param("from", from.atOffset(ZoneOffset.UTC)).update();
    }

    /**
     * The starting weights as first targets (ADR-072 #5), in place of the ones given before: a target no session set
     * ({@code next_from} null) is a starting weight. One a session set is never changed — setNext replaces a starting
     * weight, never the other way round. Each is kept apart too ({@code start_*}, K-998), to come back when the sessions
     * that replaced it are discarded or emptied (clearNext). {@code targets} by planned exercise id.
     */
    @Transactional
    void replaceStarting(AccountId account, Map<UUID, NextTargets.Target> targets) {
        jdbc.sql("""
                update training.planned_exercise set next_load_kg = null, next_reps = null, next_rack_ends = false, last_load_kg = null
                where account_id = :account and next_from is null and next_load_kg is not null""")
                .param("account", account.value()).update();
        jdbc.sql("update training.planned_exercise set start_load_kg = null, start_reps = null where account_id = :account")
                .param("account", account.value()).update();
        targets.forEach((plannedId, target) -> {
            jdbc.sql("""
                    update training.planned_exercise set next_load_kg = :load, next_reps = :reps
                    where account_id = :account and id = :id and next_from is null""")
                    .param("account", account.value()).param("id", plannedId).param("load", target.loadKg()).param("reps", target.reps())
                    .update();
            jdbc.sql("update training.planned_exercise set start_load_kg = :load, start_reps = :reps where account_id = :account and id = :id")
                    .param("account", account.value()).param("id", plannedId).param("load", target.loadKg()).param("reps", target.reps())
                    .update();
        });
    }

    /**
     * The target that came from the session started at {@code from} is gone: none of its sets of the move are left (K-432),
     * or the session was discarded (K-998). The starting weight, if one was given, is the target again; else none. A target
     * from another session stays.
     */
    void clearNext(AccountId account, UUID plannedId, Instant from) {
        jdbc.sql("""
                update training.planned_exercise set next_load_kg = start_load_kg, next_reps = start_reps, next_rack_ends = false,
                    last_load_kg = null, next_from = null
                where account_id = :account and id = :id and next_from = :from""")
                .param("account", account.value()).param("id", plannedId).param("from", from.atOffset(ZoneOffset.UTC)).update();
    }

    /**
     * Where each planned move of each day has its target from (K-432): the start of the session it came from, or none —
     * one read for a whole list of workouts.
     */
    Map<UUID, List<Optional<Instant>>> targetSources(AccountId account) {
        Map<UUID, List<Optional<Instant>>> sources = new LinkedHashMap<>();
        jdbc.sql("select day_id, next_from from training.planned_exercise where account_id = :account").param("account", account.value())
                .query((row, n) -> Map.entry(row.getObject("day_id", UUID.class),
                        Optional.ofNullable(row.getObject("next_from", OffsetDateTime.class)).map(OffsetDateTime::toInstant)))
                .list().forEach(move -> sources.computeIfAbsent(move.getKey(), day -> new java.util.ArrayList<>()).add(move.getValue()));
        return sources;
    }

    /**
     * Whether an edit of a session started at {@code startedAt} on that day can move a target: as setNext decides — a move
     * with no target yet, or one from this session or an older one.
     */
    static boolean movesATarget(List<Optional<Instant>> daySources, Instant startedAt) {
        return daySources.stream().anyMatch(from -> from.isEmpty() || !from.get().isAfter(startedAt));
    }

    private static BigDecimal plain(BigDecimal kg) {
        return kg == null ? null : Decimals.plain(kg);
    }
}
