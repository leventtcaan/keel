package app.keel.training;

import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.DayOfWeek;
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

    record PlannedExercise(String exerciseId, int sets, int repMin, int repMax, int targetRir) {
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
                select e.day_id, e.exercise_id, e.sets, e.rep_min, e.rep_max, e.target_rir from training.planned_exercise e
                join training.program_day d on d.id = e.day_id where d.program_id = :program order by e.day_id, e.seq""")
                .param("program", program)
                .query((row, n) -> new Row(row.getObject("day_id", UUID.class), new PlannedExercise(row.getString("exercise_id"),
                        row.getInt("sets"), row.getInt("rep_min"), row.getInt("rep_max"), row.getInt("target_rir"))))
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
}
