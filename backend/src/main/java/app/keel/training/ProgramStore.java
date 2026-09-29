package app.keel.training;

import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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

    /** Replaces the account's program with this one, whole, in one transaction; returns it as stored. */
    @Transactional
    Program replace(AccountId account, Source source, List<Day> days) {
        jdbc.sql("delete from training.program where account_id = :account").param("account", account.value()).update();
        UUID program = UUID.randomUUID();
        jdbc.sql("insert into training.program (id, account_id, source, created_at) values (:id, :account, :source, :now)")
                .param("id", program).param("account", account.value()).param("source", source.name())
                .param("now", clock.instant().atOffset(ZoneOffset.UTC)).update();
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

    Optional<Program> current(AccountId account) {
        return jdbc.sql("select id, source from training.program where account_id = :account").param("account", account.value())
                .query((row, n) -> new Program(row.getObject("id", UUID.class), Source.valueOf(row.getString("source")), days(row.getObject("id", UUID.class))))
                .optional();
    }

    private List<Day> days(UUID program) {
        return jdbc.sql("select * from training.program_day where program_id = :program order by seq").param("program", program)
                .query((row, n) -> new Day(row.getObject("id", UUID.class), row.getString("name_key"), row.getString("name"),
                        row.getString("weekday") == null ? null : DayOfWeek.valueOf(row.getString("weekday")),
                        exercises(row.getObject("id", UUID.class))))
                .list();
    }

    private List<PlannedExercise> exercises(UUID day) {
        return jdbc.sql("select * from training.planned_exercise where day_id = :day order by seq").param("day", day)
                .query((row, n) -> new PlannedExercise(row.getString("exercise_id"), row.getInt("sets"), row.getInt("rep_min"),
                        row.getInt("rep_max"), row.getInt("target_rir")))
                .list();
    }
}
