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
            BigDecimal lastLoadKg, UUID id) {

        /** As planned, before any workout. */
        PlannedExercise(String exerciseId, int sets, int repMin, int repMax, int targetRir) {
            this(exerciseId, sets, repMin, repMax, targetRir, null, null, null, null);
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
        for (int d = 0; d < days.size(); d++) {
            Day day = days.get(d);
            UUID dayId = UUID.randomUUID();
            jdbc.sql("""
                    insert into training.program_day (id, program_id, account_id, seq, name_key, name, weekday)
                    values (:id, :program, :account, :seq, :key, :name, :weekday)""")
                    .param("id", dayId).param("program", program).param("account", account.value()).param("seq", d)
                    .param("key", day.nameKey()).param("name", day.name())
                    .param("weekday", day.weekday() == null ? null : day.weekday().name()).update();
            for (int e = 0; e < day.exercises().size(); e++) {
                PlannedExercise planned = day.exercises().get(e);
                jdbc.sql("""
                        insert into training.planned_exercise (id, day_id, account_id, seq, exercise_id, sets, rep_min, rep_max, target_rir)
                        values (:id, :day, :account, :seq, :exercise, :sets, :min, :max, :rir)""")
                        .param("id", UUID.randomUUID()).param("day", dayId).param("account", account.value()).param("seq", e)
                        .param("exercise", planned.exerciseId()).param("sets", planned.sets()).param("min", planned.repMin())
                        .param("max", planned.repMax()).param("rir", planned.targetRir()).update();
            }
        }
        return current(account).orElseThrow();
    }

    /** When the account's program was made (or last replaced). */
    Optional<Instant> createdAt(AccountId account) {
        return jdbc.sql("select created_at from training.program where account_id = :account").param("account", account.value())
                .query((row, n) -> row.getObject("created_at", OffsetDateTime.class).toInstant()).optional();
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
                select e.id, e.day_id, e.exercise_id, e.sets, e.rep_min, e.rep_max, e.target_rir, e.next_load_kg, e.next_reps, e.last_load_kg
                from training.planned_exercise e
                join training.program_day d on d.id = e.day_id where d.program_id = :program order by e.day_id, e.seq""")
                .param("program", program)
                .query((row, n) -> new Row(row.getObject("day_id", UUID.class), new PlannedExercise(row.getString("exercise_id"),
                        row.getInt("sets"), row.getInt("rep_min"), row.getInt("rep_max"), row.getInt("target_rir"),
                        plain(row.getBigDecimal("next_load_kg")), row.getObject("next_reps", Integer.class), plain(row.getBigDecimal("last_load_kg")),
                        row.getObject("id", UUID.class))))
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
     * The next session's target for a planned exercise (K-217), unless a later workout already set one: a workout
     * finished late, or a finish sent again after a newer one, does not roll the target back (K-217 review).
     */
    void setNext(AccountId account, UUID plannedId, BigDecimal loadKg, int reps, BigDecimal lastLoadKg, Instant from) {
        jdbc.sql("""
                update training.planned_exercise set next_load_kg = :load, next_reps = :reps, last_load_kg = :last, next_from = :from
                where account_id = :account and id = :id and (next_from is null or next_from <= :from)""")
                .param("account", account.value()).param("id", plannedId).param("load", loadKg).param("reps", reps).param("last", lastLoadKg)
                .param("from", from.atOffset(ZoneOffset.UTC)).update();
    }

    /**
     * The target that came from the session started at {@code from} is gone: none of its sets of the move are left (K-432).
     * A target from another session stays.
     */
    void clearNext(AccountId account, UUID plannedId, Instant from) {
        jdbc.sql("""
                update training.planned_exercise set next_load_kg = null, next_reps = null, last_load_kg = null, next_from = null
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
